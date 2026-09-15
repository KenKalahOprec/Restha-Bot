import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';
import path from 'path';
import http from 'http';
import config from './config.js';
import initialHandler from './src/handlers/message.js';
import handleGroupParticipantsUpdate from './src/handlers/group.js';
import { logBanner, logConnection, c } from './src/libs/logger.js';
import { useMongoAuthState } from './src/libs/mongoAuthState.js';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

process.on('uncaughtException', (err) => {
  console.error('[Anti-Crash uncaughtException]:', err?.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Anti-Crash unhandledRejection]:', reason?.message || reason);
});

// Suppress noisy libsignal transient decryption/ratchet warnings without touching session files
const originalConsoleError = console.error;
console.error = function (...args) {
  const errStr = args.map(a => (typeof a === 'string' ? a : (a?.message || a?.stack || ''))).join(' ');
  if (
    errStr.includes('Bad MAC') ||
    errStr.includes('Failed to decrypt message') ||
    errStr.includes('MessageCounterError') ||
    errStr.includes('Session error')
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};

// Filter noise internal libsignal (Closing session / prekey bundle logs)
const originalConsoleInfo = console.info;
console.info = function (...args) {
  const infoStr = args.map(a => (typeof a === 'string' ? a : '')).join(' ');
  if (!config.showSignalLogs && (
    infoStr.includes('Closing session:') ||
    infoStr.includes('Closing open session in favor of incoming prekey bundle') ||
    infoStr.includes('Removing old closed session:') ||
    infoStr.includes('SessionEntry')
  )) {
    return;
  }
  originalConsoleInfo.apply(console, args);
};

// Filter noise internal libsignal warning (Decrypted message with closed session)
const originalConsoleWarn = console.warn;
console.warn = function (...args) {
  const warnStr = args.map(a => (typeof a === 'string' ? a : (a?.message || ''))).join(' ');
  if (!config.showSignalLogs && (
    warnStr.includes('Decrypted message with closed session') ||
    warnStr.includes('Closing open session') ||
    warnStr.includes('Closing session:')
  )) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};


let currentHandler = initialHandler;
let sock = null;
const msgRetryCounterCache = new Map();
const msgStore = new Map();

// Auto-reload handler saat file di src/ diedit tanpa harus restart bot & tanpa putus sesi
const srcPath = path.resolve('./src');
let debounceTimer = null;
if (fs.existsSync(srcPath)) {
  fs.watch(srcPath, { recursive: true }, (eventType, filename) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      try {
        const reloaded = await import(`./src/handlers/message.js?t=${Date.now()}`);
        if (reloaded?.default) {
          currentHandler = reloaded.default;
          logConnection('reload', filename || 'updated');
        }
      } catch (err) {
        logConnection('info', `Hot reload error: ${err.message}`);
      }
    }, 400);
  });
}

// Tutup socket secara bersih saat proses dihentikan (mencegah desinkronisasi sesi)
process.on('SIGINT', async () => {
  console.log('\n[INFO] Menutup sesi WhatsApp dengan aman...');
  try {
    sock?.ws?.close();
  } catch {}
  process.exit(0);
});

async function startBot() {
  if (sock) {
    try {
      sock.ws?.close();
      sock.ev?.removeAllListeners();
    } catch {}
  }

  let state, saveCreds, clearAuth;
  if (config.mongoUri) {
    logConnection('info', 'Menggunakan MongoDB Cloud Session Storage');
    const mongoAuth = await useMongoAuthState(config.mongoUri, 'baileys_session');
    state = mongoAuth.state;
    saveCreds = mongoAuth.saveCreds;
    clearAuth = mongoAuth.clearAuth;
  } else {
    logConnection('info', 'Menggunakan Local File Session Storage (./session)');
    const fileAuth = await useMultiFileAuthState('./session');
    state = fileAuth.state;
    saveCreds = fileAuth.saveCreds;
    clearAuth = async () => {
      fs.rmSync(path.resolve('./session'), { recursive: true, force: true });
      fs.mkdirSync(path.resolve('./session'), { recursive: true });
    };
  }

  // If me.id exists but registered is false (can happen after unclean shutdown),
  // mark as registered so Baileys reuses the session instead of showing a new QR.
  if (state.creds.me?.id && !state.creds.registered) {
    state.creds.registered = true;
    await saveCreds();
  }

  const { version, isLatest } = await fetchLatestBaileysVersion().catch(() => ({
    version: [2, 3000, 1015901307],
    isLatest: true
  }));

  logBanner();
  logConnection('info', `Baileys v${version.join('.')} (Latest: ${isLatest})`);

  sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
    },
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    generateHighQualityLinkPreview: false,
    browser: Browsers.windows('Desktop'),
    syncFullHistory: false,
    markOnlineOnConnect: true,
    fireInitQueries: false,
    defaultQueryTimeoutMs: 15000,
    keepAliveIntervalMs: 25000,
    connectTimeoutMs: 20000,
    msgRetryCounterCache: {
      get: (k) => msgRetryCounterCache.get(k),
      set: (k, v) => msgRetryCounterCache.set(k, v),
      del: (k) => msgRetryCounterCache.delete(k)
    },
    getMessage: async (key) => {
      const stored = msgStore.get(key.id);
      return stored || { conversation: '' };
    }
  });

  const pairingArgIdx = process.argv.indexOf('--pairing');
  const isPairing = pairingArgIdx !== -1;
  // Allow: node index.js --pairing 628xxx  (overrides config.ownerNumber)
  const cliNumber = isPairing && process.argv[pairingArgIdx + 1]?.match(/^\d+$/)
    ? process.argv[pairingArgIdx + 1]
    : null;
  let pairingRequested = false;

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      const pairingNum = (cliNumber || config.ownerNumber || '').replace(/\D/g, '');
      if (isPairing && !pairingRequested && !state.creds.registered && pairingNum) {
        pairingRequested = true;
        try {
          const code = await sock.requestPairingCode(pairingNum);
          console.log('\n======================================================');
          console.log(`[PAIRING CODE] Nomor: +${pairingNum}`);
          console.log(`>>> ${code} <<<`);
          console.log('(WA > Setelan > Perangkat Tertaut > Tautkan dg nomor telepon)');
          console.log('======================================================\n');
        } catch (err) {
          logConnection('info', `Gagal meminta pairing code: ${err.message}`);
        }
      } else if (!isPairing) {
        console.clear();
        console.log('Scan QR Code berikut menggunakan WhatsApp Anda:');
        qrcode.generate(qr, { small: true });
      }
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      logConnection('close', `status: ${statusCode}`);
      if (statusCode === DisconnectReason.loggedOut) {
        logConnection('info', 'Sesi tidak valid / logout. Menghapus sesi & restart...');
        try {
          if (clearAuth) await clearAuth();
        } catch {}
        pairingRequested = false;
        setTimeout(startBot, 2000);
      } else {
        setTimeout(startBot, 3000);
      }
    } else if (connection === 'open') {
      logConnection('open');
    }
  });

  sock.ev.on('creds.update', saveCreds);

  const botStartTime = Math.floor(Date.now() / 1000);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    // Abaikan sinkronisasi riwayat pesan lama dari server WhatsApp
    if (type && type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message) continue;

      // Abaikan pesan yang dikirim sebelum bot dinyalakan (sesi sebelum Ctrl+C / saat bot mati)
      const msgTimestamp = typeof msg.messageTimestamp === 'number'
        ? msg.messageTimestamp
        : (msg.messageTimestamp?.low || 0);

      if (msgTimestamp && msgTimestamp < botStartTime) {
        continue;
      }

      if (msg.key?.id) {
        msgStore.set(msg.key.id, msg.message);
        if (msgStore.size > 250) {
          const oldestKey = msgStore.keys().next().value;
          msgStore.delete(oldestKey);
        }
      }

      try {
        await currentHandler(sock, msg);
      } catch (err) {
        console.error('[Handler Error]:', err);
      }
    }
  });

  sock.ev.on('group-participants.update', async (update) => {
    await handleGroupParticipantsUpdate(sock, update);
  });
}

// HTTP Health Check Server untuk Render / Cloud Host (mencegah deployment timeout & port binding error)
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'online',
    bot: 'WhatsApp Selfbot',
    uptime: process.uptime(),
    storage: config.mongoUri ? 'MongoDB' : 'Local File'
  }));
});

server.listen(config.port, () => {
  logConnection('info', `HTTP Server berjalan di port ${config.port} (Render Ready)`);
});

startBot();
