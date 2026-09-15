import config from '../../config.js';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { applyAudioEffect, AUDIO_EFFECT_NAMES, shazamRecognize } from '../libs/media.js';
import { animeQuote, beritaIndo, searchFilm, searchApk } from '../libs/scrapers.js';

// ─── Audio Effects ─────────────────────────────────────────────────────────
export async function handleAudioEffect(sock, m, { jid, cmd, msgType, quoted }) {
  const isAudio = msgType === 'audioMessage' || msgType === 'videoMessage';
  const isQuotedAudio = quoted?.type === 'audioMessage' || quoted?.type === 'videoMessage';

  if (!isAudio && !isQuotedAudio) {
    return sock.sendMessage(jid, {
      text: `Reply audio/video dengan *${cmd}* untuk menerapkan efek.\n\nEfek tersedia: ${AUDIO_EFFECT_NAMES.join(', ')}`
    }, { quoted: m });
  }

  await sock.sendMessage(jid, { text: `Menerapkan efek *${cmd}*...` }, { quoted: m });
  try {
    const mediaMsg = isAudio ? m : { message: quoted.raw, key: m.key };
    const raw = await downloadMediaMessage(mediaMsg, 'buffer', {});
    const out = await applyAudioEffect(raw, cmd);
    await sock.sendMessage(jid, {
      audio: out,
      mimetype: 'audio/mpeg',
      ptt: false,
      fileName: `${cmd}_${Date.now()}.mp3`
    }, { quoted: m });
  } catch (err) {
    await sock.sendMessage(jid, { text: `[ERROR] ${err.message}` }, { quoted: m });
  }
}

// ─── Shazam ─────────────────────────────────────────────────────────────────
export async function handleShazam(sock, m, { jid, msgType, quoted }) {
  const isAudio = msgType === 'audioMessage' || msgType === 'videoMessage';
  const isQuotedAudio = quoted?.type === 'audioMessage' || quoted?.type === 'videoMessage';

  if (!isAudio && !isQuotedAudio) {
    return sock.sendMessage(jid, { text: '🎵 Reply audio/video dengan *.shazam* untuk mendeteksi lagunya.' }, { quoted: m });
  }

  await sock.sendMessage(jid, { text: '🎵 Mengidentifikasi lagu...' }, { quoted: m });
  try {
    const mediaMsg = isAudio ? m : { message: quoted.raw, key: m.key };
    const raw = await downloadMediaMessage(mediaMsg, 'buffer', {});
    const result = await shazamRecognize(raw);

    if (!result) {
      return sock.sendMessage(jid, { text: '❌ Lagu tidak terdeteksi. Coba audio yang lebih panjang (min. 5 detik).' }, { quoted: m });
    }

    let caption = `🎵 *[ SHAZAM DETECTED ]*\n`;
    caption += `📀 *Judul*   : ${result.title}\n`;
    caption += `🎤 *Artis*   : ${result.artist}\n`;
    if (result.album) caption += `💿 *Album*   : ${result.album}\n`;
    if (result.released) caption += `📅 *Rilis*   : ${result.released}\n`;
    if (result.label) caption += `🏷️ *Label*   : ${result.label}\n`;
    if (result.shazamUrl) caption += `🔗 *Shazam* : ${result.shazamUrl}\n`;
    if (result.spotifyUrl) caption += `🟢 *Spotify* : ${result.spotifyUrl}\n`;

    if (result.coverUrl) {
      try {
        const imgRes = await fetch(result.coverUrl, { signal: AbortSignal.timeout(8000) });
        if (imgRes.ok) {
          const imgBuf = Buffer.from(await imgRes.arrayBuffer());
          return await sock.sendMessage(jid, { image: imgBuf, caption }, { quoted: m });
        }
      } catch {}
    }

    await sock.sendMessage(jid, { text: caption }, { quoted: m });
  } catch (err) {
    await sock.sendMessage(jid, { text: `[SHAZAM ERROR] ${err.message}` }, { quoted: m });
  }
}

// ─── Anime Quote ────────────────────────────────────────────────────────────
export async function handleAnimeQuote(sock, m, { jid }) {
  try {
    const q = await animeQuote();
    const text = `┌── [ ANIME QUOTE ]\n│ Karakter : ${q.karakter}\n│ Anime    : ${q.anime}\n│ Episode  : ${q.episode}\n└──\n\n"${q.quotes}"`;

    if (q.gambar) {
      const res = await fetch(q.gambar, { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        return sock.sendMessage(jid, { image: buf, caption: text }, { quoted: m });
      }
    }
    await sock.sendMessage(jid, { text }, { quoted: m });
  } catch (err) {
    await sock.sendMessage(jid, { text: `[ERROR] ${err.message}` }, { quoted: m });
  }
}

// ─── Berita Indonesia ───────────────────────────────────────────────────────
export async function handleBerita(sock, m, { jid, q }) {
  try {
    const berita = await beritaIndo(q);
    const lines = berita.map((b, i) => `${i + 1}. *${b.judul}*\n   📅 ${b.waktu}${b.snippet ? `\n   📝 ${b.snippet}` : ''}\n   🔗 ${b.link}`);
    await sock.sendMessage(jid, {
      text: `┌── [ BERITA INDONESIA ]\n│ Sumber: CNN / CNBC Indonesia\n${q ? `│ Pencarian: "${q}"\n` : ''}└──\n\n${lines.join('\n\n')}`
    }, { quoted: m });
  } catch (err) {
    await sock.sendMessage(jid, { text: `[ERROR] ${err.message}` }, { quoted: m });
  }
}

// ─── Film / Drakor Search ──────────────────────────────────────────────────
export async function handleFilm(sock, m, { jid, q, cmd }) {
  if (!q) return sock.sendMessage(jid, { text: `Format: .${cmd} <judul film/drakor>` }, { quoted: m });

  const isDrakor = cmd === 'drakor' || cmd === 'kdrama';
  await sock.sendMessage(jid, { text: `🔍 Mencari ${isDrakor ? 'Drama Korea' : 'Film'} "${q}" di TMDB / IMDb...` }, { quoted: m });
  try {
    const results = await searchFilm(q, isDrakor);
    if (!results.length) return sock.sendMessage(jid, { text: `Tidak ada hasil untuk "${q}".` }, { quoted: m });

    for (const r of results.slice(0, 3)) {
      let caption = `🎬 *${r.judul}*\n`;
      caption += `• Tipe: ${r.tipe}\n`;
      if (r.rating) caption += `• Rating: ${r.rating}\n`;
      if (r.pemeran) caption += `• ${r.pemeran}\n`;
      if (r.overview) caption += `• Sinopsis: ${r.overview}\n`;
      caption += `• Sumber: ${r.source || 'TMDB'}\n`;
      caption += `🔗 Link: ${r.link}`;

      if (r.thumb) {
        try {
          const res = await fetch(r.thumb, { signal: AbortSignal.timeout(8000) });
          if (res.ok) {
            const buf = Buffer.from(await res.arrayBuffer());
            await sock.sendMessage(jid, { image: buf, caption }, { quoted: m });
            continue;
          }
        } catch {}
      }
      await sock.sendMessage(jid, { text: caption }, { quoted: m });
    }
  } catch (err) {
    await sock.sendMessage(jid, { text: `[ERROR] ${err.message}` }, { quoted: m });
  }
}

// ─── APK Search ─────────────────────────────────────────────────────────────
export async function handleApkSearch(sock, m, { jid, q }) {
  if (!q) return sock.sendMessage(jid, { text: 'Format: .apksearch <nama aplikasi>' }, { quoted: m });

  await sock.sendMessage(jid, { text: `Mencari APK "${q}"...` }, { quoted: m });
  try {
    const results = await searchApk(q);
    if (!results.length) return sock.sendMessage(jid, { text: 'Tidak ada APK ditemukan.' }, { quoted: m });

    const lines = results.map((r, i) =>
      `*${i + 1}. ${r.judul}*\nKategori: ${r.kategori}\nTanggal: ${r.tanggal}\n${r.deskripsi ? r.deskripsi.slice(0, 100) + '...' : ''}\n${r.link}`
    );
    await sock.sendMessage(jid, {
      text: `┌── [ APK SEARCH: ${q} ]\n└──\n\n${lines.join('\n\n')}`
    }, { quoted: m });
  } catch (err) {
    await sock.sendMessage(jid, { text: `[ERROR] ${err.message}` }, { quoted: m });
  }
}

// ─── MENFESS (Secret Confession / Anonymous Messenger) ──────────────────────
export const menfessSessions = new Map();

export async function handleMenfess(sock, m, { jid, q, senderNumber, isGroup, cmd }) {
  if (isGroup) {
    return sock.sendMessage(jid, {
      text: '🔒 Fitur Menfess hanya dapat digunakan di Private Chat (PC) bot demi menjaga kerahasiaan pengirim anonim.'
    }, { quoted: m });
  }

  // Format: .menfess 08123456789|Halo aku penggemar rahasiamu
  // Alias: .confess, .menfes
  const parts = (q || '').split('|').map(s => s.trim());
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    return sock.sendMessage(jid, {
      text: `💌 *[ CARA KIRIM MENFESS / PESAN ANONIM ]*\n\n` +
        `Kirim pesan ke seseorang tanpa diketahui identitasmu!\n\n` +
        `*Format:* ${config.prefix}${cmd} <nomor_tujuan> | <pesan>\n\n` +
        `*Contoh:* ${config.prefix}${cmd} 628123456789 | Hai, diam-diam aku suka sama kamu...\n\n` +
        `_Catatan: Nomor bisa diawali 08, 628, atau +62._`
    }, { quoted: m });
  }

  let rawTarget = parts[0].replace(/\D/g, '');
  if (rawTarget.startsWith('0')) {
    rawTarget = '62' + rawTarget.slice(1);
  } else if (rawTarget.startsWith('8')) {
    rawTarget = '62' + rawTarget;
  }

  if (rawTarget.length < 8) {
    return sock.sendMessage(jid, { text: '❌ Nomor tujuan tidak valid.' }, { quoted: m });
  }

  const targetJid = `${rawTarget}@s.whatsapp.net`;
  const cleanSender = String(senderNumber || jid.split('@')[0].split(':')[0]).replace(/\D/g, '');
  const senderJid = cleanSender ? `${cleanSender}@s.whatsapp.net` : jid;
  const pesan = parts.slice(1).join(' | ');

  if (targetJid === senderJid || targetJid === jid) {
    return sock.sendMessage(jid, { text: '❌ Kamu tidak bisa mengirim menfess ke nomor sendiri!' }, { quoted: m });
  }

  // Cek apakah nomor tujuan terdaftar di WhatsApp
  const [onWa] = await sock.onWhatsApp(targetJid).catch(() => []);
  if (!onWa?.exists) {
    return sock.sendMessage(jid, {
      text: `❌ Nomor +${rawTarget} tidak terdaftar di WhatsApp.`
    }, { quoted: m });
  }

  const confessionMsg =
    `💌 *[ MENFESS / PESAN RAHASIA BARU ]*\n\n` +
    `Seseorang mengirimkan pesan anonim untukmu:\n\n` +
    `"${pesan}"\n\n` +
    `────────────────────\n` +
    `💡 *Cara Membalas:*\n` +
    `Langsung reply/balas chat ini dengan pesanmu, maka bot akan meneruskannya ke si pengirim secara anonim tanpa membuka identitas kalian berdua!`;

  try {
    await sock.sendMessage(targetJid, { text: confessionMsg });

    // Catat session timbal-balik agar target bisa reply
    const sessionData = {
      from: senderJid,
      to: targetJid,
      lastActive: Date.now()
    };
    menfessSessions.set(targetJid, sessionData);
    menfessSessions.set(senderJid, sessionData);
    menfessSessions.set(jid, sessionData);
    if (cleanSender) menfessSessions.set(cleanSender, sessionData);
    menfessSessions.set(rawTarget, sessionData);

    await sock.sendMessage(jid, {
      text: `✅ *Menfess Berhasil Terkirim!*\n\nPesan anonimmu telah diteruskan ke target (+${rawTarget}).\nJika target membalas, pesannya akan otomatis masuk ke sini.`
    }, { quoted: m });
  } catch (err) {
    await sock.sendMessage(jid, { text: `[GAGAL KIRIM MENFESS] ${err.message}` }, { quoted: m });
  }
}


