#!/usr/bin/env node
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const INDEX_FILE = path.join(ROOT_DIR, 'index.js');

const action = (process.argv[2] || 'help').toLowerCase();

function runCmd(cmd) {
  return new Promise((resolve) => {
    const proc = spawn(cmd, { cwd: ROOT_DIR, stdio: 'inherit', shell: true });
    proc.on('exit', (code) => resolve(code ?? 0));
  });
}

switch (action) {
  case 'start': {
    const extraArgs = process.argv.slice(3).join(' ');
    console.log('[RESTHA] Menyiapkan instance bot di background (PM2)...');
    await runCmd('npx pm2 delete restha');
    await runCmd(`npx pm2 start "${INDEX_FILE}" --name restha --cwd "${ROOT_DIR}" ${extraArgs ? '-- ' + extraArgs : ''}`);
    break;
  }

  case 'run':
  case 'dev': {
    const extraArgs = process.argv.slice(3).join(' ');
    await runCmd('npx pm2 stop restha');
    console.log('[RESTHA] Menjalankan bot langsung di foreground...');
    await runCmd(`node "${INDEX_FILE}" ${extraArgs}`);
    break;
  }

  case 'stop':
    console.log('[RESTHA] Menghentikan bot (PM2)...');
    await runCmd('npx pm2 stop restha');
    break;

  case 'restart':
    console.log('[RESTHA] Merestart bot (PM2)...');
    await runCmd('npx pm2 restart restha');
    break;

  case 'logs':
  case 'log':
    await runCmd('npx pm2 logs restha');
    break;

  case 'status':
  case 'list':
    await runCmd('npx pm2 status');
    break;

  case 'delete':
  case 'del':
  case 'clearsession':
  case 'clean': {
    console.log('[RESTHA] Menghentikan bot (PM2) sebelum menghapus session...');
    await runCmd('npx pm2 stop restha');

    const sessionDirs = [
      process.env.SESSION_DIR || path.join(os.homedir(), '.restha-session'),
      path.join(ROOT_DIR, 'session')
    ];

    let deletedAny = false;
    for (const dir of sessionDirs) {
      if (fs.existsSync(dir)) {
        try {
          fs.rmSync(dir, { recursive: true, force: true });
          console.log(`[RESTHA] Berhasil menghapus session: ${dir}`);
          deletedAny = true;
        } catch (err) {
          console.error(`[RESTHA] Gagal menghapus ${dir}: ${err.message}`);
        }
      }
    }

    if (!deletedAny) {
      console.log('[RESTHA] Tidak ditemukan file session yang tersimpan.');
    } else {
      console.log('[RESTHA] Selesai! Jalankan "restha run" untuk scan QR baru.');
    }
    break;
  }

  default:
    console.log(`
┌── [ RESTHA CLI RUNNER ]
│ Perintah yang tersedia:
│ • restha start    : Jalankan bot di background (PM2)
│ • restha run      : Jalankan bot langsung di terminal (Foreground)
│ • restha stop     : Hentikan bot (PM2)
│ • restha restart  : Restart bot (PM2)
│ • restha delete   : Hapus session WhatsApp & scan QR baru
│ • restha logs     : Lihat log real-time
│ • restha status   : Cek status proses
└──
`);
    break;
}

