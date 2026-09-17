import { promisify } from 'util';
import { exec } from 'child_process';
import config from '../../config.js';
import {
  dispatchCommand,
  playSessions,
  mathGames,
  susunGames,
  c4Games,
  guessNumberGames,
  wordChainGames,
  charGuessGames,
  capitalGuessGames,
  menfessSessions
} from '../commands/index.js';
import { dropC4, checkC4Win, renderC4Board } from '../libs/games.js';
import { downloadAudioUrl } from '../libs/media.js';
import { logCommand, logEval, logError, logIncoming } from '../libs/logger.js';
import { askAI } from '../libs/ai.js';
import { isUserAllowed } from '../libs/auth.js';

const execAsync = promisify(exec);
const groupMetaCache = new Map();

export function unwrapMessage(m) {
  let msg = m?.message || m;
  if (!msg) return { type: null, body: null, raw: null };

  let unwrapped = true;
  while (unwrapped) {
    unwrapped = false;
    if (msg.ephemeralMessage?.message) {
      msg = msg.ephemeralMessage.message;
      unwrapped = true;
    } else if (msg.viewOnceMessage?.message) {
      msg = msg.viewOnceMessage.message;
      unwrapped = true;
    } else if (msg.viewOnceMessageV2?.message) {
      msg = msg.viewOnceMessageV2.message;
      unwrapped = true;
    } else if (msg.viewOnceMessageV2Extension?.message) {
      msg = msg.viewOnceMessageV2Extension.message;
      unwrapped = true;
    } else if (msg.documentWithCaptionMessage?.message) {
      msg = msg.documentWithCaptionMessage.message;
      unwrapped = true;
    } else if (msg.deviceSentMessage?.message) {
      msg = msg.deviceSentMessage.message;
      unwrapped = true;
    } else if (msg.protocolMessage?.editedMessage) {
      msg = msg.protocolMessage.editedMessage;
      unwrapped = true;
    }
  }

  const ignoreKeys = new Set(['messageContextInfo', 'senderKeyDistributionMessage', 'deviceListMetadata']);
  const validKeys = Object.keys(msg).filter(k => !ignoreKeys.has(k));
  const type = validKeys[0] || Object.keys(msg)[0];
  return { type, body: msg[type], raw: msg };
}

export default async function messageHandler(sock, m) {
  let jid = m.key.remoteJid;
  if (m.key.fromMe && m.message?.deviceSentMessage?.destinationJid) {
    jid = m.message.deviceSentMessage.destinationJid;
  }
  if (!jid || jid === 'status@broadcast') return;

  const { type: msgType, body: msgBody, raw: rawMsg } = unwrapMessage(m);
  if (!rawMsg) return;
  m.message = rawMsg;

  const textContent = (
    rawMsg.conversation ||
    rawMsg.extendedTextMessage?.text ||
    msgBody?.text ||
    msgBody?.caption ||
    rawMsg.imageMessage?.caption ||
    rawMsg.videoMessage?.caption ||
    rawMsg.documentMessage?.caption ||
    rawMsg.buttonsResponseMessage?.selectedButtonId ||
    rawMsg.listResponseMessage?.singleSelectReply?.selectedRowId ||
    rawMsg.templateButtonReplyMessage?.selectedId ||
    ''
  ).trim();

  const isGroup = jid.endsWith('@g.us');
  const cleanOwner = String(config.ownerNumber).replace(/\D/g, '');
  const myId = sock.user?.id ? sock.user.id.split(':')[0].replace(/\D/g, '') : cleanOwner;
  const myLid = sock.user?.lid ? sock.user.lid.split(':')[0].replace(/\D/g, '') : '';
  const senderRaw = m.key.participant || (m.key.fromMe ? (sock.user?.id || jid) : jid);
  const senderNumber = senderRaw.split('@')[0].split(':')[0].replace(/\D/g, '');
  const userName = m.pushName || (m.key.fromMe ? (config.ownerName || 'Jade') : senderNumber);

  // Kumpulkan seluruh kemungkinan pengenal identitas pengirim (JID, LID, Phone, Participant)
  const candidateSenders = new Set();
  if (senderRaw) candidateSenders.add(senderRaw);
  if (senderNumber) candidateSenders.add(senderNumber);
  if (m.key?.participant) candidateSenders.add(m.key.participant);
  if (m.key?.participantPn) candidateSenders.add(m.key.participantPn);
  if (m.participant) candidateSenders.add(m.participant);
  if (m.participantPn) candidateSenders.add(m.participantPn);
  if (m.key?.remoteJid) candidateSenders.add(m.key.remoteJid);
  if (jid) candidateSenders.add(jid);

  const ctxInfo = rawMsg.extendedTextMessage?.contextInfo || msgBody?.contextInfo;
  if (ctxInfo?.participant) candidateSenders.add(ctxInfo.participant);

  // Selfbot gate: pemilik (fromMe, nomor owner, atau LID WhatsApp akun terkait)
  let isOwner = Boolean(
    m.key.fromMe ||
    senderNumber === cleanOwner ||
    senderNumber === myId ||
    (myLid && senderNumber === myLid) ||
    jid.replace(/\D/g, '').includes(cleanOwner) ||
    jid.replace(/\D/g, '').includes(myId)
  );

  // Resolusi WhatsApp modern: jika pengirim di grup berupa @lid dan belum terkonfirmasi owner, cek cache metadata
  if (!isOwner && isGroup && senderRaw.includes('@lid')) {
    try {
      const now = Date.now();
      let cached = groupMetaCache.get(jid);
      if (!cached || now - cached.timestamp > 300000) { // cache 5 menit
        const fresh = await sock.groupMetadata(jid).catch(() => null);
        if (fresh) {
          cached = { meta: fresh, timestamp: now };
          groupMetaCache.set(jid, cached);
        }
      }
      if (cached?.meta?.participants) {
        const found = cached.meta.participants.find(p => p.lid === senderRaw || p.id === senderRaw);
        if (found?.id) {
          candidateSenders.add(found.id);
          const resolvedNum = found.id.split('@')[0].split(':')[0].replace(/\D/g, '');
          if (resolvedNum === cleanOwner || resolvedNum === myId) {
            isOwner = true;
          }
        }
      }
    } catch {}
  }

  const isAllowed = Boolean(
    isOwner ||
    isUserAllowed([...candidateSenders])
  );

  // Log incoming command attempt secara eksplisit ke terminal
  if (textContent.startsWith(config.prefix)) {
    logIncoming(senderNumber, textContent, isAllowed);
  }

  // ─── FITUR MENFESS: INTERCEPT BALASAN ANONIM (Bisa dua arah tanpa harus whitelist) ───
  const menfessKey = [jid, senderNumber, ...candidateSenders].find(k => k && menfessSessions.has(k));
  if (!isGroup && menfessKey && textContent && !textContent.startsWith(config.prefix)) {
    const session = menfessSessions.get(menfessKey);
    const isReplyFromTarget = jid === session.to || senderNumber === session.to.split('@')[0];
    const destinationJid = isReplyFromTarget ? session.from : session.to;

    const forwardText = isReplyFromTarget
      ? `💬 *[ BALASAN DARI TARGET MENFESS ]*\n\n"${textContent}"\n\n────────────────────\n_Ketik pesan langsung di sini untuk membalas kembali._`
      : `💌 *[ BALASAN DARI PENGIRIM ANONIM ]*\n\n"${textContent}"\n\n────────────────────\n_Ketik pesan langsung di sini untuk membalas kembali._`;

    try {
      await sock.sendMessage(destinationJid, { text: forwardText });
      await sock.sendMessage(jid, { text: '✅ Pesan balasanmu telah diteruskan secara anonim!' }, { quoted: m });
      session.lastActive = Date.now();
      return;
    } catch (e) {
      await sock.sendMessage(jid, { text: `[GAGAL MENERUSKAN MENFESS] ${e.message}` }, { quoted: m });
    }
  }

  // ─── FITUR OP: AUTOREPLY GEMINI (Hanya jika diaktifkan owner via .autoreply on) ───
  if (!isOwner && (!isAllowed || !textContent.startsWith(config.prefix))) {
    if (config.autoReplyGemini && !isGroup && textContent && !textContent.startsWith(config.prefix)) {
      try {
        const persona = `Kamu adalah Asisten AI cerdas dan personal dari ${config.ownerName} di WhatsApp. Pemilik sedang tidak membuka HP / sibuk. Balas pesan teman/pengirim ini dengan ramah, santai, natural seperti asisten pribadi berdedikasi tinggi, singkat padat (1-3 kalimat) dalam bahasa Indonesia yang luwes. Jangan gunakan format yang kaku.`;
        const aiResponse = await askAI(textContent, persona);
        if (aiResponse) {
          await sock.sendMessage(jid, { text: aiResponse }, { quoted: m });
        }
      } catch (e) {
        // Suppress failure silently
      }
    }
    if (!isAllowed) {
      if (textContent.startsWith(config.prefix)) {
        await sock.sendMessage(jid, {
          text: `⚠️ *AKSES DITOLAK*\n\nNomor Anda (+${senderNumber}) belum terdaftar di whitelist bot.\nSilakan minta owner untuk mengizinkan dengan perintah:\n*${config.prefix}addl ${senderNumber}*`
        }, { quoted: m }).catch(() => {});
      }
      return;
    }
  }

  if (!textContent) return;

  const contextInfo = rawMsg.extendedTextMessage?.contextInfo || msgBody?.contextInfo;
  const quoted = contextInfo?.quotedMessage ? unwrapMessage({ message: contextInfo.quotedMessage }) : null;

  /* ================= 1. GAME & PROMPT INTERCEPTORS ================= */
  // Matematika
  if (mathGames.has(jid) && !isNaN(textContent)) {
    const game = mathGames.get(jid);
    if (parseInt(textContent) === game.answer) {
      mathGames.delete(jid);
      await sock.sendMessage(jid, { text: `🎉 Benar sekali, ${userName}! Jawabannya adalah ${game.answer}.` }, { quoted: m });
      return;
    }
  }

  // Susun Kata
  if (susunGames.has(jid)) {
    const game = susunGames.get(jid);
    if (textContent.trim().toUpperCase() === game.word) {
      susunGames.delete(jid);
      await sock.sendMessage(jid, { text: `🎉 Benar sekali, ${userName}! Kata yang tepat adalah *${game.word}*.` }, { quoted: m });
      return;
    }
  }

  // Connect Four
  if (c4Games.has(jid) && /^[1-7]$/.test(textContent.trim())) {
    const game = c4Games.get(jid);
    const col = parseInt(textContent.trim()) - 1;
    const r = dropC4(game.board, col, '🔴');
    if (r === -1) {
      await sock.sendMessage(jid, { text: '⚠️ Kolom tersebut sudah penuh! Pilih kolom lain (1-7).' }, { quoted: m });
      return;
    }

    if (checkC4Win(game.board, '🔴')) {
      const boardStr = renderC4Board(game.board);
      c4Games.delete(jid);
      await sock.sendMessage(jid, { text: `${boardStr}\n\n🎉 *KAMU MENANG!* 4 koin merah berurutan!` }, { quoted: m });
      return;
    }

    const validCols = [];
    for (let c = 0; c < 7; c++) {
      if (game.board[0][c] === '⚪') validCols.push(c);
    }
    if (validCols.length === 0) {
      c4Games.delete(jid);
      await sock.sendMessage(jid, { text: `${renderC4Board(game.board)}\n\n🤝 *SERI!* Papan permainan penuh.` }, { quoted: m });
      return;
    }

    const botCol = validCols[Math.floor(Math.random() * validCols.length)];
    dropC4(game.board, botCol, '🟡');

    if (checkC4Win(game.board, '🟡')) {
      const boardStr = renderC4Board(game.board);
      c4Games.delete(jid);
      await sock.sendMessage(jid, { text: `${boardStr}\n\n🤖 *BOT MENANG!* Bot berhasil menyusun 4 koin kuning.` }, { quoted: m });
      return;
    }

    const boardStr = renderC4Board(game.board);
    await sock.sendMessage(jid, { text: `${boardStr}\n\nKamu (🔴) | Bot (🟡)\nKetik angka (1-7) untuk langkah berikutnya.` }, { quoted: m });
    return;
  }

  // Tebak Angka
  if (guessNumberGames.has(jid) && /^\d+$/.test(textContent.trim())) {
    const game = guessNumberGames.get(jid);
    const guess = parseInt(textContent.trim());
    game.attempts++;
    if (guess === game.target) {
      guessNumberGames.delete(jid);
      await sock.sendMessage(jid, { text: `🎉 *TEPAT SEKALI!* Angka rahasianya adalah *${game.target}*.\nKamu berhasil menebak dalam *${game.attempts}* kali percobaan!` }, { quoted: m });
      return;
    } else if (guess < game.target) {
      await sock.sendMessage(jid, { text: `🔺 *TERLALU KECIL!* Angka rahasia lebih BESAR dari ${guess}. (Percobaan ke-${game.attempts})` }, { quoted: m });
      return;
    } else {
      await sock.sendMessage(jid, { text: `🔻 *TERLALU BESAR!* Angka rahasia lebih KECIL dari ${guess}. (Percobaan ke-${game.attempts})` }, { quoted: m });
      return;
    }
  }

  // Sambung Kata
  if (wordChainGames.has(jid)) {
    const game = wordChainGames.get(jid);
    const inputWord = textContent.trim().toLowerCase();
    if (/^[a-z]+$/.test(inputWord) && inputWord.length > 1) {
      const expectedChar = game.lastLetter.toLowerCase();
      if (inputWord.startsWith(expectedChar)) {
        game.chainCount = (game.chainCount || 0) + 1;
        const lastChar = inputWord[inputWord.length - 1];
        const botWords = {
          a: ['angin', 'ayam', 'api', 'air', 'alam'],
          b: ['batu', 'buku', 'bulan', 'bintang', 'bumi'],
          c: ['cahaya', 'cinta', 'cerita', 'cermin', 'cincin'],
          d: ['danau', 'daun', 'darah', 'dinding', 'dunia'],
          e: ['emas', 'elang', 'ekor', 'energi', 'empat'],
          g: ['gunung', 'gajah', 'gitar', 'garam', 'gelas'],
          h: ['hujan', 'hutan', 'hati', 'hidup', 'hari'],
          i: ['ikan', 'ilmu', 'indah', 'ingat', 'isi'],
          j: ['jalan', 'jantung', 'jarum', 'jendela', 'juara'],
          k: ['kapal', 'kucing', 'kelapa', 'kuda', 'kertas'],
          l: ['laut', 'langit', 'lampu', 'lidah', 'lemari'],
          m: ['matahari', 'malam', 'makan', 'minum', 'merah'],
          n: ['naga', 'nafas', 'nama', 'nasi', 'nyala'],
          p: ['pantai', 'pohon', 'pintu', 'pasar', 'pulau'],
          r: ['rumah', 'rumput', 'raja', 'ranting', 'roti'],
          s: ['sungai', 'surga', 'suara', 'sepatu', 'sendok'],
          t: ['tanah', 'tangan', 'terbang', 'taman', 'tidur'],
          u: ['udara', 'ular', 'uang', 'ujung', 'unta']
        };
        const choices = botWords[lastChar] || ['alam', 'bumi', 'cahaya', 'dunia', 'emas'];
        const replyWord = choices[Math.floor(Math.random() * choices.length)];
        const nextChar = replyWord[replyWord.length - 1];
        game.lastWord = replyWord;
        game.lastLetter = nextChar;
        await sock.sendMessage(jid, { text: `✅ Kata diterima: *${inputWord}*!\n\n🤖 Giliran Bot: *${replyWord.toUpperCase()}*\n➡️ Huruf berikutnya: *${nextChar.toUpperCase()}* (Rantai kata: ${game.chainCount})` }, { quoted: m });
        return;
      }
    }
  }

  // Tebak Tokoh
  if (charGuessGames.has(jid)) {
    const game = charGuessGames.get(jid);
    if (textContent.trim().toUpperCase() === game.name) {
      charGuessGames.delete(jid);
      await sock.sendMessage(jid, { text: `🎉 *BENAR SEKALI!* Tokoh misterius tersebut adalah *${game.name}*!` }, { quoted: m });
      return;
    }
  }

  // Tebak Ibukota
  if (capitalGuessGames.has(jid)) {
    const game = capitalGuessGames.get(jid);
    if (textContent.trim().toUpperCase() === game.answer) {
      capitalGuessGames.delete(jid);
      await sock.sendMessage(jid, { text: `🎉 *TEPAT SEKALI!* Ibukota dari *${game.question}* adalah *${game.answer}*!` }, { quoted: m });
      return;
    }
  }

  // Play Session
  if (playSessions.has(jid) && /^[1-5]$/.test(textContent.trim())) {
    const session = playSessions.get(jid);
    const index = parseInt(textContent.trim()) - 1;
    const selected = session.items[index];
    if (selected) {
      playSessions.delete(jid);
      await sock.sendMessage(jid, { text: `Sedang mengunduh audio pilihan ${selected.index}: "${selected.title}"...` }, { quoted: m });
      try {
        const audioBuffer = await downloadAudioUrl(selected.url);
        await sock.sendMessage(jid, {
          audio: audioBuffer,
          mimetype: 'audio/mp4',
          ptt: false,
          fileName: `${selected.title}.mp3`
        }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal mengunduh audio: ${err.message}` }, { quoted: m });
      }
      return;
    }
  }

  /* ================= 2. EVAL & EXEC ================= */
  if (textContent.startsWith('>')) {
    const code = textContent.slice(1).trim();
    logEval('eval', userName, code);
    try {
      let evaled = await eval(`(async () => { ${code} })()`);
      if (typeof evaled !== 'string') evaled = JSON.stringify(evaled, null, 2);
      await sock.sendMessage(jid, { text: evaled || 'undefined' }, { quoted: m });
    } catch (err) {
      logError('EVAL', err);
      await sock.sendMessage(jid, { text: `[Eval Error]\n${err.stack || err.message}` }, { quoted: m });
    }
    return;
  }

  if (textContent.startsWith('$')) {
    const command = textContent.slice(1).trim();
    logEval('exec', userName, command);
    try {
      const { stdout, stderr } = await execAsync(command);
      await sock.sendMessage(jid, { text: stdout || stderr || 'Command executed with empty output.' }, { quoted: m });
    } catch (err) {
      logError('EXEC', err);
      await sock.sendMessage(jid, { text: `[Exec Error]\n${err.message}` }, { quoted: m });
    }
    return;
  }

  /* ================= 3. COMMAND DISPATCHER ================= */
  if (!textContent.startsWith(config.prefix)) return;

  const [command, ...args] = textContent.slice(config.prefix.length).trim().split(/\s+/);
  const cmd = command.toLowerCase();
  const q = args.join(' ');

  logCommand(config.prefix, cmd, userName, q);

  const context = {
    jid,
    isGroup,
    userName,
    senderNumber,
    senderRaw,
    command,
    cmd,
    args,
    q,
    msgType,
    msgBody,
    rawMsg,
    quoted
  };

  try {
    await dispatchCommand(sock, m, context);
  } catch (err) {
    logError(`CMD:${cmd}`, err);
    await sock.sendMessage(jid, { text: `[ERROR] Perintah *${config.prefix}${cmd}*: ${err.message}` }, { quoted: m });
  }
}

