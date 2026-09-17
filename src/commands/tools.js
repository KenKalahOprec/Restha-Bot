import config from '../../config.js';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import {
  enhanceRemini,
  generateBratVideo,
  videoToAnimatedWebp,
  generateIqcImage,
  generateNulisImage,
  generateNulisBookImage,
  uploadToCatbox,
  removeBackground
} from '../libs/media.js';
import { askAI } from '../libs/ai.js';

export const diaryStore = new Map();

export async function handleRemini(sock, m, { jid, cmd, msgType, quoted }) {
  const isImg = msgType === 'imageMessage';
  const isQuotedImg = quoted?.type === 'imageMessage';
  if (!isImg && !isQuotedImg) {
    return sock.sendMessage(jid, {
      text: `┌── [ REMINI ULTRA HD ]\n│ • Kirim atau balas gambar dengan ${config.prefix}${cmd}\n│ • Meningkatkan resolusi & ketajaman gambar\n└──`
    }, { quoted: m });
  }
  await sock.sendMessage(jid, {
    text: `┌── [ PROCESSING REMINI ]\n│ • Status : Sedang meningkatkan resolusi ke Ultra HD...\n└──`
  }, { quoted: m });
  try {
    const mediaMsg = isImg ? m : { message: quoted.raw, key: m.key };
    const rawBuf = await downloadMediaMessage(mediaMsg, 'buffer', {});
    const hdBuf = await enhanceRemini(rawBuf);
    await sock.sendMessage(jid, {
      image: hdBuf,
      caption: `┌── [ REMINI ULTRA HD COMPLETED ]\n│ • Resolusi ditingkatkan dengan ketajaman maksimal\n└──`
    }, { quoted: m });
  } catch (err) {
    await sock.sendMessage(jid, {
      text: `┌── [ REMINI ERROR ]\n│ • Gagal memproses Remini: ${err.message}\n└──`
    }, { quoted: m });
  }
}

export async function handleRemoveBg(sock, m, { jid, cmd, q, msgType, quoted }) {
  const isImg = msgType === 'imageMessage';
  const isQuotedImg = quoted?.type === 'imageMessage';
  if (!isImg && !isQuotedImg) {
    return sock.sendMessage(jid, {
      text: `┌── [ REMOVE BACKGROUND ]\n` +
        `│ • Kirim atau balas gambar dengan ${config.prefix}${cmd} [toleransi%]\n` +
        `│ • Menghapus background gambar secara otomatis via ImageMagick\n` +
        `│\n` +
        `│ • Contoh:\n` +
        `│   ${config.prefix}removebg (default 20%)\n` +
        `│   ${config.prefix}nobg 30 (toleransi 30%)\n` +
        `└──`
    }, { quoted: m });
  }

  const fuzzVal = parseInt(q?.trim(), 10) || 20;
  await sock.sendMessage(jid, {
    text: `┌── [ REMOVING BACKGROUND ]\n│ • Engine    : ImageMagick Core\n│ • Toleransi : ${fuzzVal}%\n│ • Status    : Sedang memotong latar belakang...\n└──`
  }, { quoted: m });

  try {
    const mediaMsg = isImg ? m : { message: quoted.raw, key: m.key };
    const rawBuf = await downloadMediaMessage(mediaMsg, 'buffer', {});
    const noBgBuf = await removeBackground(rawBuf, fuzzVal);

    await sock.sendMessage(jid, {
      image: noBgBuf,
      caption: `┌── [ REMOVE BG COMPLETED ]\n│ • Engine    : ImageMagick\n│ • Toleransi : ${fuzzVal}%\n│ • Format    : PNG Transparan\n└──`
    }, { quoted: m });
  } catch (err) {
    await sock.sendMessage(jid, {
      text: `┌── [ REMOVE BG ERROR ]\n│ • Gagal menghapus background: ${err.message}\n└──`
    }, { quoted: m });
  }
}

export async function handleBratvid(sock, m, { jid, q, cmd, quoted }) {
  const text = q || (quoted?.body?.text || quoted?.raw?.conversation || '');
  if (!text) return sock.sendMessage(jid, { text: `Format: *${config.prefix}${cmd} <teks>*` }, { quoted: m });
  await sock.sendMessage(jid, { text: '⏳ Sedang merender Stiker Animasi Brat...' }, { quoted: m });
  try {
    const vidBuf = await generateBratVideo(text);
    const stickerBuf = await videoToAnimatedWebp(vidBuf);
    await sock.sendMessage(jid, { sticker: stickerBuf }, { quoted: m });
  } catch (err) {
    await sock.sendMessage(jid, { text: `Gagal merender Brat Stiker: ${err.message}` }, { quoted: m });
  }
}

export async function handleIqc(sock, m, { jid, q, cmd, quoted, userName }) {
  const rawText = q || (quoted?.body?.text || quoted?.raw?.conversation || '');
  if (!rawText) {
    return sock.sendMessage(jid, {
      text: `📱 *iPhone Quoted Chat (IQC)*\n\n` +
        `*Format:*\n` +
        `• *${config.prefix}${cmd} <pesan>*\n` +
        `• *${config.prefix}${cmd} <pesan> | <baterai> | <provider> | <jam>*\n\n` +
        `*Contoh:*\n` +
        `• ${config.prefix}${cmd} Halo semuanya!\n` +
        `• ${config.prefix}${cmd} Lagi sibuk nih | 90 | Telkomsel | 19:30`
    }, { quoted: m });
  }

  await sock.sendMessage(jid, { text: '📱 Sedang merender quote gaya iPhone (IQC)...' }, { quoted: m });
  try {
    const parts = rawText.split('|').map(s => s.trim());
    const message = parts[0];
    const battery = parts[1] || '80';
    const carrier = parts[2] || 'Indosat';
    const now = new Date();
    const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const time = parts[3] || defaultTime;

    const targetName = quoted ? (quoted.pushName || 'User') : userName;
    const iqcBuf = await generateIqcImage(message, targetName, { time, battery, carrier });
    await sock.sendMessage(jid, { image: iqcBuf, caption: '📱 *iPhone Quoted Chat (IQC)*' }, { quoted: m });
  } catch (err) {
    await sock.sendMessage(jid, { text: `Gagal membuat quote iPhone: ${err.message}` }, { quoted: m });
  }
}

export async function handleNulis(sock, m, { jid, q, cmd, quoted }) {
  let text = q || (quoted?.body?.text || quoted?.raw?.conversation || '');
  if (!text) {
    return sock.sendMessage(jid, {
      text: `Format: *${config.prefix}${cmd} <teks/tugas>*\n\n` +
        `*Pilihan Model Nulis:*\n` +
        `• *${config.prefix}nulis* (Buku Tulis Kiri)\n` +
        `• *${config.prefix}nulis2* (Buku Tulis Kanan)\n` +
        `• *${config.prefix}nulis3* (Kertas Folio Bergaris)\n` +
        `• *${config.prefix}nulisai <topik>* (Tulis Tugas Otomatis via AI)`
    }, { quoted: m });
  }

  await sock.sendMessage(jid, { text: '✍️ Sedang menulis di buku/folio...' }, { quoted: m });
  try {
    if (cmd.includes('ai') || text.toLowerCase().startsWith('ai:') || text.toLowerCase().startsWith('tugas:')) {
      const cleanPrompt = text.replace(/^(ai:|tugas:)\s*/i, '');
      try {
        const generated = await askAI(`Tuliskan tugas atau catatan sekolah yang rapi, padat, dan jelas mengenai: ${cleanPrompt}. Langsung tuliskan isi tugasnya tanpa basa-basi.`);
        if (generated) text = generated;
      } catch {}
    }

    let mode = 'buku_kiri';
    let label = 'Buku Tulis (Halaman Kiri)';
    if (cmd === 'nulis2' || cmd === 'nuliskanan') {
      mode = 'buku_kanan';
      label = 'Buku Tulis (Halaman Kanan)';
    } else if (cmd === 'nulis3' || cmd === 'folio' || cmd === 'foliokiri') {
      mode = 'folio_kiri';
      label = 'Kertas Folio Bergaris (Kiri)';
    } else if (cmd === 'foliokanan' || cmd === 'folio2') {
      mode = 'folio_kanan';
      label = 'Kertas Folio Bergaris (Kanan)';
    }

    const nulisBuf = await generateNulisBookImage(text, mode);
    await sock.sendMessage(jid, { image: nulisBuf, caption: `✍️ *Hasil Menulis: ${label}*` }, { quoted: m });
  } catch (err) {
    await sock.sendMessage(jid, { text: `Gagal membuat tulisan buku: ${err.message}` }, { quoted: m });
  }
}

export async function handleToUrl(sock, m, { jid, msgType, quoted }) {
  const isMedia = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'].includes(msgType);
  const isQuotedMedia = quoted && ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'].includes(quoted.type);
  if (!isMedia && !isQuotedMedia) {
    return sock.sendMessage(jid, { text: 'Kirim atau reply media (foto/video/audio) yang ingin diunggah ke URL.' }, { quoted: m });
  }
  await sock.sendMessage(jid, { text: '☁️ Sedang mengunggah media ke Catbox...' }, { quoted: m });
  try {
    const mediaMsg = isMedia ? m : { message: quoted.raw, key: m.key };
    const rawBuf = await downloadMediaMessage(mediaMsg, 'buffer', {});
    const catUrl = await uploadToCatbox(rawBuf, 'media.bin');
    await sock.sendMessage(jid, { text: `🔗 *URL Media Berhasil Dibuat:*\n${catUrl}` }, { quoted: m });
  } catch (err) {
    await sock.sendMessage(jid, { text: `Gagal mengunggah media: ${err.message}` }, { quoted: m });
  }
}

export async function handleKalender(sock, m, { jid }) {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Jakarta' };
  const masehi = now.toLocaleDateString('id-ID', options);
  const pasarans = ['Legi', 'Pahing', 'Pon', 'Wage', 'Kliwon'];
  const baseDate = new Date('1900-01-01');
  const diffDays = Math.floor((now - baseDate) / (1000 * 60 * 60 * 24));
  const pasaran = pasarans[((diffDays % 5) + 5) % 5];
  const calText = `📅 *KALENDER HARI INI*\n\n` +
    `• Masehi   : ${masehi}\n` +
    `• Pasaran  : ${pasaran}\n` +
    `• Jam WIB  : ${now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })}\n` +
    `• Jam WITA : ${now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Makassar' })}\n` +
    `• Jam WIT  : ${now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jayapura' })}`;
  await sock.sendMessage(jid, { text: calText }, { quoted: m });
}

export async function handleQr(sock, m, { jid, q }) {
  if (!q) return sock.sendMessage(jid, { text: `Format: ${config.prefix}qrcode <teks/link>` }, { quoted: m });
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(qrUrl);
    const buf = Buffer.from(await res.arrayBuffer());
    await sock.sendMessage(jid, { image: buf, caption: `📱 *QR Code Generator:*\n"${q}"` }, { quoted: m });
  } catch (err) {
    await sock.sendMessage(jid, { text: `Gagal membuat QR: ${err.message}` }, { quoted: m });
  }
}

export async function handleTranslate(sock, m, { jid, q, args }) {
  if (!q) return sock.sendMessage(jid, { text: `Format: ${config.prefix}tr <kode_bahasa> <teks>` }, { quoted: m });
  const targetLang = args[0] || 'id';
  const textToTranslate = args.slice(1).join(' ') || q;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(textToTranslate)}`;
    const res = await fetch(url);
    const data = await res.json();
    const result = data[0].map(item => item[0]).join('');
    await sock.sendMessage(jid, { text: `🌐 *Terjemahan (${targetLang}):*\n${result}` }, { quoted: m });
  } catch (err) {
    await sock.sendMessage(jid, { text: `Gagal menerjemahkan: ${err.message}` }, { quoted: m });
  }
}

export async function handleTTS(sock, m, { jid, q, args }) {
  if (!q) return sock.sendMessage(jid, { text: `Format: ${config.prefix}tts [kode_bahasa] <teks>` }, { quoted: m });
  let lang = 'id';
  let text = q;
  if (args[0] && args[0].length === 2) {
    lang = args[0];
    text = args.slice(1).join(' ');
  }
  const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;
  try {
    const res = await fetch(ttsUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const buf = Buffer.from(await res.arrayBuffer());
    await sock.sendMessage(jid, { audio: buf, mimetype: 'audio/mp4', ptt: true }, { quoted: m });
  } catch (err) {
    await sock.sendMessage(jid, { text: `Gagal membuat audio TTS: ${err.message}` }, { quoted: m });
  }
}

export async function handleDelete(sock, m, { jid, quoted }) {
  if (!quoted) return sock.sendMessage(jid, { text: 'Reply pesan bot yang ingin dihapus.' }, { quoted: m });
  await sock.sendMessage(jid, { delete: quoted.key });
}

export async function handleDiary(sock, m, { jid, q }) {
  if (!q) {
    const userNotes = diaryStore.get(jid) || [];
    if (userNotes.length === 0) return sock.sendMessage(jid, { text: 'Buku catatan harianmu masih kosong.\nTulis dengan: `.diary <catatan baru>`' }, { quoted: m });
    let list = '📖 *BUKU CATATAN HARIAN:*\n\n';
    userNotes.forEach((n, i) => { list += `${i + 1}. [${n.date}] ${n.text}\n`; });
    return sock.sendMessage(jid, { text: list }, { quoted: m });
  }
  const current = diaryStore.get(jid) || [];
  current.push({ text: q, date: new Date().toLocaleDateString('id-ID') });
  diaryStore.set(jid, current);
  await sock.sendMessage(jid, { text: '✅ Catatan berhasil disimpan ke buku diary!' }, { quoted: m });
}

export async function handleCpp(sock, m, { jid, cmd, q, quoted }) {
  let code = q || (quoted?.body?.text || quoted?.raw?.conversation || '');
  if (!code) {
    return sock.sendMessage(jid, {
      text: `💻 *C / C++ Code Runner*\n\nKetik kode setelah perintah atau reply kode dengan *.c* atau *.cpp*.\n\n*Contoh C:*\n.c #include <stdio.h>\nint main() {\n    printf("Halo dari C!\\n");\n    return 0;\n}\n\n*Contoh C++:*\n.cpp #include <iostream>\nusing namespace std;\nint main() {\n    cout << "Halo dari C++!" << endl;\n    return 0;\n}`
    }, { quoted: m });
  }

  // Bersihkan markdown code blocks jika user menyertakan ```c atau ```cpp atau ```
  code = code.replace(/^```(?:cpp|c\+\+|c)?/i, '').replace(/```$/, '').trim();

  // Pastikan directive preprocessor (#include, #define, dll) diakhiri newline jika user mengetik 1 baris di WA
  code = code
    .replace(/(#include\s*<[^>]+>)/g, '$1\n')
    .replace(/(#include\s*"[^"]+")/g, '$1\n')
    .replace(/(#define\s+[^\n]+)/g, '$1\n');

  // Deteksi bahasa: C atau C++
  const isExplicitC = cmd === 'c' || cmd === 'runc';
  const hasCppKeywords = /#include\s*<iostream>|using\s+namespace|std::|cout|cin|vector|string|class\s+/i.test(code);
  const isC = isExplicitC && !hasCppKeywords;
  const langName = isC ? 'C' : 'C++';
  const compiler = isC ? 'gcc' : 'g++';
  const flags = isC ? ['-O2', '-std=c11', '-mconsole'] : ['-O2', '-std=c++17', '-mconsole'];

  const { execFile } = await import('child_process');
  const os = (await import('os')).default;
  const path = (await import('path')).default;
  const fs = (await import('fs')).default;

  const ext = isC ? 'c' : 'cpp';
  const id = `${ext}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const srcFile = path.join(os.tmpdir(), `${id}.${ext}`);
  const binFile = path.join(os.tmpdir(), `${id}.exe`);

  await sock.sendMessage(jid, { text: `⚙️ Sedang mengompilasi kode ${langName} (${compiler})...` }, { quoted: m });

  try {
    await fs.promises.writeFile(srcFile, code);

    // 1. Kompilasi kode dengan batas waktu 10 detik
    await new Promise((resolve, reject) => {
      execFile(compiler, [srcFile, ...flags, '-o', binFile], { timeout: 10000 }, (error, stdout, stderr) => {
        if (error) {
          const errMsg = stderr || stdout || error.message;
          return reject(new Error(`[COMPILATION ERROR]\n${errMsg}`));
        }
        resolve();
      });
    });

    // 2. Eksekusi binary dengan batas runtime 5 detik
    const runResult = await new Promise((resolve, reject) => {
      execFile(binFile, [], { timeout: 5000, maxBuffer: 1024 * 512 }, (error, stdout, stderr) => {
        if (error && error.killed) {
          return reject(new Error('Eksekusi melebihi batas waktu 5 detik (Time Limit Exceeded).'));
        }
        resolve({ stdout, stderr, error });
      });
    });

    let output = runResult.stdout ? runResult.stdout.trim() : '';
    if (runResult.stderr) {
      output += (output ? '\n' : '') + `[STDERR]:\n${runResult.stderr.trim()}`;
    }
    if (!output) output = '(Program selesai tanpa output)';

    // Batasi panjang teks output agar tidak spam chat
    if (output.length > 2000) {
      output = output.slice(0, 2000) + '\n...(output terpotong)';
    }

    const replyMsg = `💻 *${langName} EXECUTION RESULT*\n\n\`\`\`\n${output}\n\`\`\``;
    await sock.sendMessage(jid, { text: replyMsg }, { quoted: m });

  } catch (err) {
    const errorText = `❌ *${langName} EXECUTION FAILED*\n\n\`\`\`\n${err.message.slice(0, 1500)}\n\`\`\``;
    await sock.sendMessage(jid, { text: errorText }, { quoted: m });
  } finally {
    // Bersihkan file sementara
    await Promise.allSettled([
      fs.promises.unlink(srcFile),
      fs.promises.unlink(binFile)
    ]);
  }
}

// ─── Multi-Language Code Runner (OneCompiler API) ──────────────────────────
const RUNNER_LANGS = {
  python: { lang: 'python', ext: 'py' },
  py: { lang: 'python', ext: 'py' },
  py3: { lang: 'python', ext: 'py' },
  javascript: { lang: 'javascript', ext: 'js' },
  js: { lang: 'javascript', ext: 'js' },
  node: { lang: 'javascript', ext: 'js' },
  nodejs: { lang: 'javascript', ext: 'js' },
  typescript: { lang: 'typescript', ext: 'ts' },
  ts: { lang: 'typescript', ext: 'ts' },
  java: { lang: 'java', ext: 'java' },
  rust: { lang: 'rust', ext: 'rs' },
  rs: { lang: 'rust', ext: 'rs' },
  go: { lang: 'go', ext: 'go' },
  golang: { lang: 'go', ext: 'go' },
  php: { lang: 'php', ext: 'php' },
  ruby: { lang: 'ruby', ext: 'rb' },
  rb: { lang: 'ruby', ext: 'rb' },
  csharp: { lang: 'csharp', ext: 'cs' },
  cs: { lang: 'csharp', ext: 'cs' },
  'c#': { lang: 'csharp', ext: 'cs' },
  bash: { lang: 'bash', ext: 'sh' },
  sh: { lang: 'bash', ext: 'sh' },
  kotlin: { lang: 'kotlin', ext: 'kt' },
  kt: { lang: 'kotlin', ext: 'kt' },
  swift: { lang: 'swift', ext: 'swift' },
  r: { lang: 'r', ext: 'r' },
  dart: { lang: 'dart', ext: 'dart' },
  lua: { lang: 'lua', ext: 'lua' },
  perl: { lang: 'perl', ext: 'pl' },
  pl: { lang: 'perl', ext: 'pl' },
  scala: { lang: 'scala', ext: 'scala' }
};

export async function handleCodeRunner(sock, m, { jid, cmd, q, quoted }) {
  let text = q || (quoted?.body?.text || quoted?.raw?.conversation || '');

  let langMeta = null;
  let code = text;

  if (cmd !== 'code' && cmd !== 'run' && cmd !== 'exec') {
    langMeta = RUNNER_LANGS[cmd.toLowerCase()];
  } else {
    // Format .run <bahasa> <code> atau ```bahasa <code>```
    const matchBlock = text.match(/^```([a-zA-Z0-9_+#-]+)\s*([\s\S]*?)```$/);
    if (matchBlock) {
      langMeta = RUNNER_LANGS[matchBlock[1].toLowerCase()];
      code = matchBlock[2].trim();
    } else {
      const parts = text.trim().split(/\s+/);
      const possibleLang = parts[0]?.toLowerCase();
      if (RUNNER_LANGS[possibleLang]) {
        langMeta = RUNNER_LANGS[possibleLang];
        code = text.slice(parts[0].length).trim();
      }
    }
  }

  if (!langMeta || !code) {
    return sock.sendMessage(jid, {
      text: `💻 *Multi-Language Code Runner*\n\nEksekusi kode program langsung di WhatsApp.\n\n*Format:*\n.run <bahasa> <kode>\natau langsung: .<bahasa> <kode>\n\n*Bahasa yang didukung:*\nPython (\`.py\`), JavaScript (\`.js\`), TypeScript (\`.ts\`), Go (\`.go\`), Rust (\`.rs\`), Java (\`.java\`), PHP (\`.php\`), Kotlin (\`.kt\`), Swift, Bash, Ruby (\`.rb\`), C# (\`.cs\`), Lua, Dart.\n\n*Contoh:*\n.py print("Halo dari Python!")\n.js console.log([1, 2, 3].map(x => x * 2));`
    }, { quoted: m });
  }

  code = code.replace(/^```[a-zA-Z0-9_+#-]*\n?/i, '').replace(/```$/, '').trim();

  await sock.sendMessage(jid, { text: `⚙️ Sedang mengeksekusi kode ${langMeta.lang.toUpperCase()}...` }, { quoted: m });

  try {
    const payload = {
      name: langMeta.lang,
      title: langMeta.lang,
      version: 'latest',
      mode: langMeta.lang,
      description: null,
      extension: langMeta.ext,
      languageType: 'programming',
      active: true,
      properties: {
        language: langMeta.lang,
        files: [{ name: `main.${langMeta.ext}`, content: code }]
      }
    };

    const res = await fetch('https://onecompiler.com/api/code/exec', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}: Server compiler bermasalah`);
    const data = await res.json();

    let output = (data.stdout || '').trim();
    if (data.stderr) {
      output += (output ? '\n' : '') + `[STDERR]:\n${data.stderr.trim()}`;
    }
    if (data.exception) {
      output = `[EXCEPTION]:\n${data.exception.trim()}` + (output ? `\n${output}` : '');
    }
    if (!output) output = '(Program selesai tanpa output)';

    if (output.length > 2000) {
      output = output.slice(0, 2000) + '\n...(output terpotong)';
    }

    const timeInfo = data.executionTime ? ` | ${data.executionTime}ms` : '';
    const caption = `💻 *${langMeta.lang.toUpperCase()} EXECUTION RESULT${timeInfo}*\n\n\`\`\`\n${output}\n\`\`\``;
    await sock.sendMessage(jid, { text: caption }, { quoted: m });

  } catch (err) {
    await sock.sendMessage(jid, { text: `❌ *${langMeta.lang.toUpperCase()} EXECUTION FAILED*\n\n\`\`\`\n${err.message.slice(0, 1500)}\n\`\`\`` }, { quoted: m });
  }
}

export async function handleTextEffect(sock, m, { jid, cmd, q, quoted }) {
  const text = q || (quoted?.body?.text || quoted?.raw?.conversation || '');
  if (!text) {
    return sock.sendMessage(jid, {
      text: `🎨 *Text Effect Generator*\n\nFormat: *${config.prefix}${cmd} <teks>*\n\n*Pilihan Efek Tersedia:*\n` +
        `• *${config.prefix}text3d* <teks> (Efek 3D Extruded)\n` +
        `• *${config.prefix}neon* <teks> (Cyber Neon Glow)\n` +
        `• *${config.prefix}glitch* <teks> (Cyberpunk Glitch)\n` +
        `• *${config.prefix}gold* <teks> (Metallic Luxury Gold)\n` +
        `• *${config.prefix}fire* <teks> (Flaming Fire)\n` +
        `• *${config.prefix}graffiti* <teks> (Urban Graffiti)\n` +
        `• *${config.prefix}blood* <teks> (Dark Horror Blood)\n` +
        `• *${config.prefix}matrix* <teks> (Terminal Matrix Code)\n` +
        `• *${config.prefix}ice* <teks> (Frozen Ice Crystal)\n` +
        `• *${config.prefix}retro* <teks> (80s Synthwave Wave)`
    }, { quoted: m });
  }

  await sock.sendMessage(jid, { text: `🎨 Sedang membuat efek teks *${cmd.toUpperCase()}*...` }, { quoted: m });

  try {
    const { generateTextEffect } = await import('../libs/textEffects.js');
    const imageBuf = await generateTextEffect(cmd, text);
    await sock.sendMessage(jid, {
      image: imageBuf,
      caption: `✨ *Hasil Efek Teks:* ${cmd.toUpperCase()}\n📝 Teks: *${text}*`
    }, { quoted: m });
  } catch (err) {
    await sock.sendMessage(jid, { text: `Gagal membuat efek teks: ${err.message}` }, { quoted: m });
  }
}

export async function handleDraw(sock, m, { jid, q, cmd, msgType, quoted }) {
  if (!q) {
    return sock.sendMessage(jid, {
      text: `┌── [ GPT-IMAGE 2.5 ENGINE ]\n` +
        `│ • Format : ${config.prefix}${cmd} <deskripsi visual> [opsi]\n` +
        `│\n` +
        `│ • Contoh :\n` +
        `│   ${config.prefix}${cmd} samurai di tengah kota neo tokyo saat hujan\n` +
        `│   ${config.prefix}${cmd} kastil fantasi di atas awan --anime\n` +
        `│   ${config.prefix}${cmd} poster mobil balap masa depan --portrait\n` +
        `│\n` +
        `│ [ PRESET MODEL ]\n` +
        `│ • --flare    : Generasi cepat, warna dinamis & tajam\n` +
        `│ • --sunburst : Ketelitian tinggi, raytracing & tekstur realistis (default)\n` +
        `│ • --anime    : Estetika anime ala Makoto Shinkai\n` +
        `│ • --cyber    : Gaya neon cyberpunk & pantulan basah\n` +
        `│ • --3d       : Render 3D Octane / Unreal Engine 5\n` +
        `│ • --portrait : Rasio vertikal (768x1024)\n` +
        `│ • --landscape: Rasio horizontal (1024x768)\n` +
        `└──`
    }, { quoted: m });
  }

  let rawPrompt = q;
  let modelStyle = 'sunburst';
  let width = 1024;
  let height = 1024;
  let modelName = 'GPT Image 2.5 Sunburst';

  if (rawPrompt.includes('--flare')) {
    modelStyle = 'flare';
    modelName = 'GPT Image 2.5 Flare';
    rawPrompt = rawPrompt.replace(/--flare/gi, '').trim();
  } else if (rawPrompt.includes('--anime')) {
    modelStyle = 'anime';
    modelName = 'GPT Image Anime Studio';
    rawPrompt = rawPrompt.replace(/--anime/gi, '').trim();
  } else if (rawPrompt.includes('--cyber')) {
    modelStyle = 'cyber';
    modelName = 'GPT Image Cyberpunk';
    rawPrompt = rawPrompt.replace(/--cyber/gi, '').trim();
  } else if (rawPrompt.includes('--3d')) {
    modelStyle = '3d';
    modelName = 'GPT Image 3D Octane';
    rawPrompt = rawPrompt.replace(/--3d/gi, '').trim();
  } else if (rawPrompt.includes('--sunburst')) {
    rawPrompt = rawPrompt.replace(/--sunburst/gi, '').trim();
  }

  if (rawPrompt.includes('--portrait')) {
    width = 768;
    height = 1024;
    rawPrompt = rawPrompt.replace(/--portrait/gi, '').trim();
  } else if (rawPrompt.includes('--landscape')) {
    width = 1024;
    height = 768;
    rawPrompt = rawPrompt.replace(/--landscape/gi, '').trim();
  }

  const STYLE_CRAFTS = {
    sunburst: 'ultra-detailed, masterwork, 8k resolution, cinematic lighting, raytracing, sharp focus, refined material realism, high dynamic range',
    flare: 'vibrant, high contrast, clean composition, studio lighting, highly detailed aesthetic, sharp rendering',
    anime: 'anime aesthetic, detailed background, Makoto Shinkai lighting, luminous color palette, clean line art, masterpiece',
    cyber: 'cyberpunk aesthetic, neon illumination, reflective wet surfaces, volumetric smoke, high tech detailing, cinematic depth',
    '3d': '3d render, octane render, unreal engine 5, photorealistic textures, volumetric subsurface scattering, studio lighting'
  };

  const extraCraft = STYLE_CRAFTS[modelStyle] || STYLE_CRAFTS.sunburst;
  const craftedPrompt = `${rawPrompt}, ${extraCraft}`;

  // Check if user attached or replied to an image (Image-to-Image Mode)
  const isImg = msgType === 'imageMessage';
  const isQuotedImg = quoted?.type === 'imageMessage';
  let referenceImageUrl = null;

  if (isImg || isQuotedImg) {
    try {
      const mediaMsg = isImg ? m : { message: quoted.raw, key: m.key };
      const rawBuf = await downloadMediaMessage(mediaMsg, 'buffer', {});
      referenceImageUrl = await uploadToCatbox(rawBuf, 'ref_image.jpg');
    } catch {}
  }

  await sock.sendMessage(jid, {
    text: `┌── [ GPT-IMAGE 2.5 ${referenceImageUrl ? 'IMG2IMG' : 'TEXT2IMG'} ]\n` +
      `│ • Status  : Merender ilustrasi via ${modelName}...\n` +
      `│ • Prompt  : "${rawPrompt}"\n` +
      `│ • Ukuran  : ${width}x${height}px` +
      (referenceImageUrl ? `\n│ • Ref-Img : Terdeteksi & diunggah` : '') +
      `\n└──`
  }, { quoted: m });

  try {
    const seed = Math.floor(Math.random() * 10000000);
    let pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(craftedPrompt)}?model=flux&width=${width}&height=${height}&seed=${seed}&nologo=true`;
    if (referenceImageUrl) {
      pollinationsUrl += `&image=${encodeURIComponent(referenceImageUrl)}`;
    }

    const res = await fetch(pollinationsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      },
      signal: AbortSignal.timeout(35000)
    });

    if (!res.ok) throw new Error(`Server AI Image mengembalikan status ${res.status}`);
    const imgBuf = Buffer.from(await res.arrayBuffer());

    await sock.sendMessage(jid, {
      image: imgBuf,
      caption: `┌── [ GPT-IMAGE 2.5 CRAFT ]\n` +
        `│ • Prompt : "${rawPrompt}"\n` +
        `│ • Model  : ${modelName}\n` +
        `│ • Ukuran : ${width}x${height}px\n` +
        `│ • Mode   : ${referenceImageUrl ? 'Image-to-Image (Ref)' : 'Text-to-Image'}\n` +
        `└──`
    }, { quoted: m });
  } catch (err) {
    try {
      const { searchImage } = await import('../libs/media.js');
      const backupBuf = await searchImage(rawPrompt);
      if (backupBuf) {
        await sock.sendMessage(jid, {
          image: backupBuf,
          caption: `┌── [ GAMBAR CADANGAN ]\n│ • Pencarian : "${rawPrompt}"\n│ • Catatan   : Fallback mode aktif\n└──`
        }, { quoted: m });
        return;
      }
    } catch {}
    await sock.sendMessage(jid, {
      text: `┌── [ DRAW ERROR ]\n│ • Gagal merender gambar GPT-Image: ${err.message}\n└──`
    }, { quoted: m });
  }
}

// ─── iLovePDF Suite (Peralatan PDF Online Lengkap) ──────────────────────────
export async function handleILovePdf(sock, m, { jid, cmd, q, args, msgType, quoted }) {
  const isDoc = msgType === 'documentMessage';
  const isQuotedDoc = quoted?.type === 'documentMessage';
  const isImg = msgType === 'imageMessage';
  const isQuotedImg = quoted?.type === 'imageMessage';

  const subCmd = (cmd === 'ilovepdf' || cmd === 'pdf') ? (args[0] || '').toLowerCase() : cmd;
  const param = (cmd === 'ilovepdf' || cmd === 'pdf') ? args.slice(1).join(' ').trim() : (q || '').trim();

  // Menu Help jika tidak ada input
  if (!subCmd || subCmd === 'help' || (!isDoc && !isQuotedDoc && !isImg && !isQuotedImg && !param)) {
    return sock.sendMessage(jid, {
      text: `┌── [ ILOVEPDF SUITE ]\n` +
        `│ • Peralatan PDF lengkap & pengolahan dokumen\n` +
        `│\n` +
        `│ [ FITUR & PERINTAH ]\n` +
        `│ • ${config.prefix}pdfinfo (reply PDF) : Info detail & jumlah halaman\n` +
        `│ • ${config.prefix}pdfrotate [derajat] (reply PDF) : Putar halaman (90, 180, 270)\n` +
        `│ • ${config.prefix}pdfsplit <hal/rentang> (reply PDF) : Pisahkan hal (mis: 1-3 atau 2,4)\n` +
        `│ • ${config.prefix}pdfdel <hal/rentang> (reply PDF) : Hapus hal (mis: 2 atau 1,4)\n` +
        `│ • ${config.prefix}pdfwm <teks watermark> (reply PDF) : Beri tanda air transparan\n` +
        `│ • ${config.prefix}pdfpage (reply PDF) : Tambahkan nomor halaman otomatis\n` +
        `│ • ${config.prefix}pdfcompress (reply PDF) : Optimalkan & kompres dokumen PDF\n` +
        `│ • ${config.prefix}pdf2md (reply PDF) : Ekstrak teks PDF ke format Markdown (.md)\n` +
        `│ • ${config.prefix}topdf / ${config.prefix}jpg2pdf (reply foto) : Konversi gambar ke PDF\n` +
        `│ • ${config.prefix}word2pdf (reply docx) : Konversi dokumen Word ke PDF\n` +
        `│ • ${config.prefix}excel2pdf (reply xlsx) : Konversi spreadsheet Excel ke PDF\n` +
        `│ • ${config.prefix}html2pdf <html/url> : Konversi kode HTML / Web ke PDF\n` +
        `│\n` +
        `│ • Shortcut utama : ${config.prefix}pdf <opsi> atau langsung ${config.prefix}<nama_fitur>\n` +
        `└──`
    }, { quoted: m });
  }

  // 1. FITUR: HTML ke PDF (HTML to PDF)
  if (subCmd === 'htmltopdf' || subCmd === 'html2pdf') {
    let htmlContent = param || (quoted?.body?.text || quoted?.raw?.conversation || '');

    if (/^https?:\/\//i.test(htmlContent)) {
      await sock.sendMessage(jid, {
        text: `┌── [ FETCHING HTML ]\n│ • URL    : ${htmlContent}\n│ • Status : Mengambil kode halaman web...\n└──`
      }, { quoted: m });
      try {
        const hRes = await fetch(htmlContent, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(12000) });
        if (!hRes.ok) throw new Error(`HTTP ${hRes.status}`);
        htmlContent = await hRes.text();
      } catch (err) {
        return sock.sendMessage(jid, {
          text: `┌── [ FETCH ERROR ]\n│ • Gagal mengambil HTML dari URL: ${err.message}\n└──`
        }, { quoted: m });
      }
    }

    if (!htmlContent) {
      return sock.sendMessage(jid, {
        text: `┌── [ HTML TO PDF ]\n│ • Masukkan teks/kode HTML atau tautan web, atau reply pesan HTML dengan ${config.prefix}${cmd}\n│ • Contoh: ${config.prefix}html2pdf <h1>Judul</h1><p>Konten paragraf</p>\n└──`
      }, { quoted: m });
    }

    await sock.sendMessage(jid, {
      text: `┌── [ CONVERTING HTML ]\n│ • Engine : iLovePDF HTML Engine\n│ • Status : Memformat tata letak HTML ke PDF A4...\n└──`
    }, { quoted: m });

    try {
      const { htmlToPdf } = await import('../libs/ilovepdf.js');
      const pdfBytes = await htmlToPdf(htmlContent);

      return await sock.sendMessage(jid, {
        document: pdfBytes,
        mimetype: 'application/pdf',
        fileName: `html_converted_${Date.now()}.pdf`,
        caption: `┌── [ HTML CONVERTED ]\n│ • Format : Dokumen PDF A4 dari HTML\n│ • Ukuran : ${(pdfBytes.length / 1024).toFixed(1)} KB\n└──`
      }, { quoted: m });
    } catch (err) {
      return sock.sendMessage(jid, {
        text: `┌── [ HTML CONVERT ERROR ]\n│ • ${err.message}\n└──`
      }, { quoted: m });
    }
  }

  // 2. FITUR: JPG / PNG ke PDF
  if (subCmd === 'topdf' || subCmd === 'jpg2pdf' || subCmd === 'img2pdf') {
    if (!isImg && !isQuotedImg) {
      return sock.sendMessage(jid, {
        text: `┌── [ JPG TO PDF ]\n│ • Kirim atau reply gambar dengan ${config.prefix}${cmd} untuk dijadikan file PDF\n└──`
      }, { quoted: m });
    }

    await sock.sendMessage(jid, {
      text: `┌── [ PROCESSING PDF ]\n│ • Engine : iLovePDF Image Converter\n│ • Status : Mengonversi gambar ke dokumen PDF...\n└──`
    }, { quoted: m });

    try {
      const { imagesToPdf } = await import('../libs/ilovepdf.js');
      const mediaMsg = isImg ? m : { message: quoted.raw, key: m.key };
      const rawBuf = await downloadMediaMessage(mediaMsg, 'buffer', {});
      const pdfBytes = await imagesToPdf([rawBuf]);

      return await sock.sendMessage(jid, {
        document: pdfBytes,
        mimetype: 'application/pdf',
        fileName: `ilovepdf_converted_${Date.now()}.pdf`,
        caption: `┌── [ PDF CONVERTED ]\n│ • Ukuran : ${(pdfBytes.length / 1024).toFixed(1)} KB\n│ • Format : Dokumen PDF Siap Cetak\n└──`
      }, { quoted: m });
    } catch (err) {
      return sock.sendMessage(jid, {
        text: `┌── [ CONVERT ERROR ]\n│ • ${err.message}\n└──`
      }, { quoted: m });
    }
  }

  // 2. FITUR: Word ke PDF (DOCX to PDF)
  if (subCmd === 'wordtopdf' || subCmd === 'word2pdf' || subCmd === 'doc2pdf' || subCmd === 'docx2pdf') {
    if (!isDoc && !isQuotedDoc) {
      return sock.sendMessage(jid, {
        text: `┌── [ WORD TO PDF ]\n│ • Kirim atau reply file dokumen Word (.docx) dengan ${config.prefix}${cmd}\n└──`
      }, { quoted: m });
    }

    await sock.sendMessage(jid, {
      text: `┌── [ CONVERTING WORD ]\n│ • Engine : iLovePDF Word Engine\n│ • Status : Mengekstrak struktur & memformat ke PDF A4...\n└──`
    }, { quoted: m });

    try {
      const { wordToPdf } = await import('../libs/ilovepdf.js');
      const mediaMsg = isDoc ? m : { message: quoted.raw, key: m.key };
      const rawBuf = await downloadMediaMessage(mediaMsg, 'buffer', {});
      const pdfBytes = await wordToPdf(rawBuf);

      return await sock.sendMessage(jid, {
        document: pdfBytes,
        mimetype: 'application/pdf',
        fileName: `word_converted_${Date.now()}.pdf`,
        caption: `┌── [ WORD CONVERTED ]\n│ • Format : Dokumen PDF A4 Standar\n│ • Ukuran : ${(pdfBytes.length / 1024).toFixed(1)} KB\n└──`
      }, { quoted: m });
    } catch (err) {
      return sock.sendMessage(jid, {
        text: `┌── [ WORD CONVERT ERROR ]\n│ • ${err.message}\n└──`
      }, { quoted: m });
    }
  }

  // 3. FITUR: Excel ke PDF (XLSX to PDF)
  if (subCmd === 'exceltopdf' || subCmd === 'excel2pdf' || subCmd === 'xls2pdf' || subCmd === 'xlsx2pdf') {
    if (!isDoc && !isQuotedDoc) {
      return sock.sendMessage(jid, {
        text: `┌── [ EXCEL TO PDF ]\n│ • Kirim atau reply file spreadsheet Excel (.xlsx/.xls/.csv) dengan ${config.prefix}${cmd}\n└──`
      }, { quoted: m });
    }

    await sock.sendMessage(jid, {
      text: `┌── [ CONVERTING EXCEL ]\n│ • Engine : iLovePDF Sheet Engine\n│ • Status : Menyusun tabel grid spreadsheet ke PDF Landscape...\n└──`
    }, { quoted: m });

    try {
      const { excelToPdf } = await import('../libs/ilovepdf.js');
      const mediaMsg = isDoc ? m : { message: quoted.raw, key: m.key };
      const rawBuf = await downloadMediaMessage(mediaMsg, 'buffer', {});
      const pdfBytes = await excelToPdf(rawBuf);

      return await sock.sendMessage(jid, {
        document: pdfBytes,
        mimetype: 'application/pdf',
        fileName: `excel_converted_${Date.now()}.pdf`,
        caption: `┌── [ EXCEL CONVERTED ]\n│ • Format : PDF Landscape Grid Table\n│ • Ukuran : ${(pdfBytes.length / 1024).toFixed(1)} KB\n└──`
      }, { quoted: m });
    } catch (err) {
      return sock.sendMessage(jid, {
        text: `┌── [ EXCEL CONVERT ERROR ]\n│ • ${err.message}\n└──`
      }, { quoted: m });
    }
  }

  // Operasi yang memerlukan input file PDF
  if (!isDoc && !isQuotedDoc) {
    return sock.sendMessage(jid, {
      text: `┌── [ PDF REQUIRED ]\n│ • Reply atau kirim file dokumen PDF dengan perintah ${config.prefix}${cmd}\n└──`
    }, { quoted: m });
  }

  const mediaMsg = isDoc ? m : { message: quoted.raw, key: m.key };
  const rawBuf = await downloadMediaMessage(mediaMsg, 'buffer', {});

  // Validasi signature %PDF
  if (rawBuf.slice(0, 4).toString() !== '%PDF') {
    return sock.sendMessage(jid, {
      text: `┌── [ INVALID PDF ]\n│ • File yang dikirim bukan format dokumen PDF yang valid.\n└──`
    }, { quoted: m });
  }

  // 2. FITUR: Info PDF
  if (subCmd === 'info' || subCmd === 'pdfinfo') {
    try {
      const { getPdfInfo } = await import('../libs/ilovepdf.js');
      const info = await getPdfInfo(rawBuf);
      return await sock.sendMessage(jid, {
        text: `┌── [ ILOVEPDF METADATA ]\n` +
          `│ • Total Halaman : ${info.pageCount} Hal\n` +
          `│ • Dimensi Page  : ${info.width} x ${info.height} pt\n` +
          `│ • Rotasi        : ${info.rotation}°\n` +
          `│ • Judul         : ${info.title}\n` +
          `│ • Ukuran File   : ${(rawBuf.length / 1024).toFixed(1)} KB\n` +
          `└──`
      }, { quoted: m });
    } catch (err) {
      return sock.sendMessage(jid, {
        text: `┌── [ PDF INFO ERROR ]\n│ • ${err.message}\n└──`
      }, { quoted: m });
    }
  }

  // 3. FITUR: Putar PDF (Rotate)
  if (subCmd === 'rotate' || subCmd === 'pdfrotate' || subCmd === 'putar') {
    const angle = parseInt(param, 10) || 90;
    await sock.sendMessage(jid, {
      text: `┌── [ ROTATING PDF ]\n│ • Sudut  : ${angle} Derajat\n│ • Status : Memutar seluruh orientasi halaman...\n└──`
    }, { quoted: m });

    try {
      const { rotatePdf } = await import('../libs/ilovepdf.js');
      const rotatedBuf = await rotatePdf(rawBuf, angle);
      return await sock.sendMessage(jid, {
        document: rotatedBuf,
        mimetype: 'application/pdf',
        fileName: `rotated_${angle}deg.pdf`,
        caption: `┌── [ ROTATE COMPLETED ]\n│ • Orientasi berhasil diputar ${angle}°\n└──`
      }, { quoted: m });
    } catch (err) {
      return sock.sendMessage(jid, {
        text: `┌── [ ROTATE ERROR ]\n│ • ${err.message}\n└──`
      }, { quoted: m });
    }
  }

  // 4. FITUR: Pisahkan / Ekstrak Halaman (Split)
  if (subCmd === 'split' || subCmd === 'pdfsplit' || subCmd === 'ekstrak' || subCmd === 'extract') {
    const range = param || '1';
    await sock.sendMessage(jid, {
      text: `┌── [ SPLITTING PDF ]\n│ • Halaman Target : ${range}\n│ • Status         : Mengekstrak halaman terpilih...\n└──`
    }, { quoted: m });

    try {
      const { splitPdf } = await import('../libs/ilovepdf.js');
      const { buffer: splitBuf, extractedPages } = await splitPdf(rawBuf, range);
      return await sock.sendMessage(jid, {
        document: splitBuf,
        mimetype: 'application/pdf',
        fileName: `extracted_pages_${extractedPages.join('_')}.pdf`,
        caption: `┌── [ SPLIT COMPLETED ]\n│ • Halaman berhasil diekstrak : ${extractedPages.join(', ')}\n└──`
      }, { quoted: m });
    } catch (err) {
      return sock.sendMessage(jid, {
        text: `┌── [ SPLIT ERROR ]\n│ • ${err.message}\n└──`
      }, { quoted: m });
    }
  }

  // 5. FITUR: Hapus Halaman (Remove Pages)
  if (subCmd === 'del' || subCmd === 'pdfdel' || subCmd === 'remove' || subCmd === 'pdfremove') {
    if (!param) {
      return sock.sendMessage(jid, {
        text: `┌── [ INPUT REQUIRED ]\n│ • Masukkan nomor halaman yang ingin dihapus\n│ • Contoh : ${config.prefix}pdfdel 2 atau ${config.prefix}pdfdel 1,3-5\n└──`
      }, { quoted: m });
    }

    await sock.sendMessage(jid, {
      text: `┌── [ REMOVING PAGES ]\n│ • Halaman Dihapus : ${param}\n│ • Status          : Menyusun ulang dokumen...\n└──`
    }, { quoted: m });

    try {
      const { removePdfPages } = await import('../libs/ilovepdf.js');
      const { buffer: remBuf, remainingCount, removedList } = await removePdfPages(rawBuf, param);
      return await sock.sendMessage(jid, {
        document: remBuf,
        mimetype: 'application/pdf',
        fileName: `pages_removed.pdf`,
        caption: `┌── [ PAGES REMOVED ]\n│ • Halaman Dihapus : ${removedList.join(', ')}\n│ • Sisa Halaman    : ${remainingCount} Hal\n└──`
      }, { quoted: m });
    } catch (err) {
      return sock.sendMessage(jid, {
        text: `┌── [ REMOVE ERROR ]\n│ • ${err.message}\n└──`
      }, { quoted: m });
    }
  }

  // 6. FITUR: Beri Watermark
  if (subCmd === 'wm' || subCmd === 'pdfwm' || subCmd === 'watermark') {
    const wmText = param || 'CONFIDENTIAL';
    await sock.sendMessage(jid, {
      text: `┌── [ WATERMARKING PDF ]\n│ • Tanda Air : "${wmText}"\n│ • Status    : Menerapkan cap transparan...\n└──`
    }, { quoted: m });

    try {
      const { watermarkPdf } = await import('../libs/ilovepdf.js');
      const wmBuf = await watermarkPdf(rawBuf, wmText);
      return await sock.sendMessage(jid, {
        document: wmBuf,
        mimetype: 'application/pdf',
        fileName: `watermarked.pdf`,
        caption: `┌── [ WATERMARK COMPLETED ]\n│ • Teks Watermark : "${wmText}"\n└──`
      }, { quoted: m });
    } catch (err) {
      return sock.sendMessage(jid, {
        text: `┌── [ WATERMARK ERROR ]\n│ • ${err.message}\n└──`
      }, { quoted: m });
    }
  }

  // 7. FITUR: Beri Nomor Halaman (Page Numbers)
  if (subCmd === 'page' || subCmd === 'pdfpage' || subCmd === 'pagenumber') {
    await sock.sendMessage(jid, {
      text: `┌── [ NUMBERING PDF ]\n│ • Status : Menambahkan nomor halaman di bagian bawah...\n└──`
    }, { quoted: m });

    try {
      const { addPageNumbers } = await import('../libs/ilovepdf.js');
      const numBuf = await addPageNumbers(rawBuf);
      return await sock.sendMessage(jid, {
        document: numBuf,
        mimetype: 'application/pdf',
        fileName: `numbered.pdf`,
        caption: `┌── [ PAGE NUMBERING COMPLETED ]\n│ • Format : Halaman X dari Y\n└──`
      }, { quoted: m });
    } catch (err) {
      return sock.sendMessage(jid, {
        text: `┌── [ NUMBERING ERROR ]\n│ • ${err.message}\n└──`
      }, { quoted: m });
    }
  }

  // 8. FITUR: Kompres PDF
  if (subCmd === 'compress' || subCmd === 'pdfcompress' || subCmd === 'kompres') {
    await sock.sendMessage(jid, {
      text: `┌── [ COMPRESSING PDF ]\n│ • Status : Mengoptimalkan struktur & aliran data PDF...\n└──`
    }, { quoted: m });

    try {
      const { compressPdf } = await import('../libs/ilovepdf.js');
      const compBuf = await compressPdf(rawBuf);
      const diffKb = ((rawBuf.length - compBuf.length) / 1024).toFixed(1);
      return await sock.sendMessage(jid, {
        document: compBuf,
        mimetype: 'application/pdf',
        fileName: `compressed.pdf`,
        caption: `┌── [ COMPRESS COMPLETED ]\n│ • Ukuran Awal : ${(rawBuf.length / 1024).toFixed(1)} KB\n│ • Ukuran Baru : ${(compBuf.length / 1024).toFixed(1)} KB\n│ • Penghematan : ${diffKb} KB\n└──`
      }, { quoted: m });
    } catch (err) {
      return sock.sendMessage(jid, {
        text: `┌── [ COMPRESS ERROR ]\n│ • ${err.message}\n└──`
      }, { quoted: m });
    }
  }

  // 9. FITUR: PDF ke Markdown (PDF to Markdown)
  if (subCmd === 'pdf2md' || subCmd === 'pdfmarkdown' || subCmd === 'pdftomarkdown' || subCmd === 'pdfmd') {
    await sock.sendMessage(jid, {
      text: `┌── [ EXTRACTING MARKDOWN ]\n│ • Status : Mengekstrak aliran teks & menyusun ke format Markdown...\n└──`
    }, { quoted: m });

    try {
      const { pdfToMarkdown } = await import('../libs/ilovepdf.js');
      const mdContent = await pdfToMarkdown(rawBuf);
      const mdBuffer = Buffer.from(mdContent, 'utf-8');

      return await sock.sendMessage(jid, {
        document: mdBuffer,
        mimetype: 'text/markdown',
        fileName: `extracted_${Date.now()}.md`,
        caption: `┌── [ PDF TO MARKDOWN COMPLETED ]\n│ • Format : Dokumen Markdown (.md)\n│ • Ukuran : ${(mdBuffer.length / 1024).toFixed(1)} KB\n└──`
      }, { quoted: m });
    } catch (err) {
      return sock.sendMessage(jid, {
        text: `┌── [ PDF2MD ERROR ]\n│ • ${err.message}\n└──`
      }, { quoted: m });
    }
  }

  // Default fallback jika opsi tidak dikenali
  return sock.sendMessage(jid, {
    text: `┌── [ SUBCOMMAND NOT FOUND ]\n│ • Opsi "${subCmd}" tidak dikenali.\n│ • Ketik ${config.prefix}ilovepdf untuk melihat panduan lengkap.\n└──`
  }, { quoted: m });
}
