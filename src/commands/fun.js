import config from '../../config.js';

// ─── Urban Dictionary ───────────────────────────────────────────────────────
export async function getUrbanDefinition(term) {
  const res = await fetch(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(term)}`, {
    signal: AbortSignal.timeout(8000)
  });
  if (!res.ok) throw new Error('Gagal menghubungi Urban Dictionary');
  const data = await res.json();
  if (!data.list || data.list.length === 0) return null;
  const item = data.list[0];
  return {
    word: item.word,
    definition: item.definition?.replace(/[\[\]]/g, ''),
    example: item.example?.replace(/[\[\]]/g, ''),
    author: item.author,
    thumbsUp: item.thumbs_up,
    thumbsDown: item.thumbs_down
  };
}

// ─── Facts ──────────────────────────────────────────────────────────────────
const CURATED_FACTS = [
  'Madu murni adalah satu-satunya makanan yang tidak akan pernah basi selamanya.',
  'Gurita memiliki tiga jantung, sembilan otak, dan darah berwarna biru.',
  'Sidik jari koala sangat mirip dengan manusia hingga sering membingungkan penyelidik TKP.',
  'Stroberi secara botani bukanlah buah beri, tetapi pisang dan semangka adalah buah beri.',
  'Otak manusia menghasilkan daya listrik sekitar 12-25 watt, cukup untuk menyalakan lampu LED kecil.',
  'Venus adalah satu-satunya planet di tata surya kita yang berputar searah jarum jam.',
  'Jantung paus biru berukuran sebesar mobil kecil dan detak jantungnya terdengar dari jarak 3 km.',
  'Kupu-kupu mengecap rasa dengan kakinya.',
  'Sebelum tahun 1800-an, gigi tiruan dibuat dari gigi prajurit yang gugur dalam pertempuran.',
  'Pohon bambu tertentu dapat tumbuh hingga 91 cm hanya dalam waktu satu hari.'
];

export async function getRandomFact() {
  try {
    const res = await fetch('https://uselessfacts.jsph.pl/api/v2/facts/random?language=en', {
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.text) return data.text;
    }
  } catch {}
  return CURATED_FACTS[Math.floor(Math.random() * CURATED_FACTS.length)];
}

// ─── Quotes & Pickuplines ───────────────────────────────────────────────────
const PICKUPLINES = [
  'Kamu punya peta nggak? Soalnya aku tersesat di dalam matamu.',
  'Kamu itu kayak WiFi, selalu bikin aku pengen deket-deket biar sinyalnya kuat.',
  'Kamu tau nggak bedanya kamu sama modem? Kalau modem menghubungkan ke internet, kalau kamu menghubungkan ke masa depan.',
  'Cita-citaku dulu pengen jadi astronot, tapi sekarang berubah, pengen jadi yang terbaik buat kamu.',
  'Rumah sakit boleh penuh, asalkan hatimu cuma penuh sama aku.',
  'Jangan diam aja dong, senyummu itu recharge energi harianku.',
  'Kamu tahu kenapa aku nggak butuh gula lagi di kopi? Soalnya ada manisnya kamu.'
];

const QUOTES = [
  'Kesuksesan bukanlah akhir, kegagalan bukanlah kehancuran: keberanian untuk terus melangkah adalah yang terpenting.',
  'Cara terbaik untuk memulai adalah berhenti berbicara dan mulai melakukan.',
  'Jangan menunggu kesempatan datang, ciptakan kesempatan itu sendiri.',
  'Kegagalan hari ini adalah pondasi kebijaksanaan hari esok.',
  'Satu-satunya batasan dalam meraih mimpi adalah keraguanmu hari ini.'
];

// ─── Anime Reactions via nekos.best & purrbot ──────────────────────────────
const NEKOS_ACTIONS = new Set([
  'hug', 'kiss', 'pat', 'slap', 'bite', 'cry', 'cuddle', 'dance', 'feed',
  'handhold', 'happy', 'highfive', 'nom', 'poke', 'smile', 'smug', 'tickle',
  'wave', 'wink', 'yeet', 'blush', 'bonk'
]);

const ACTION_FALLBACK_MAP = {
  kill: 'shoot',
  bully: 'slap',
  spank: 'slap',
  glomp: 'hug',
  awoo: 'blush',
  cringe: 'facepalm'
};

const ACTION_DESCRIPTIONS = {
  hug: 'memeluk',
  kiss: 'mencium',
  pat: 'mengelus kepala',
  slap: 'menampar',
  bite: 'menggigit',
  cry: 'menangis di pelukan',
  cuddle: 'memeluk erat',
  dance: 'berdansa bersama',
  feed: 'menyuapi makanan ke',
  handhold: 'menggenggam tangan',
  happy: 'tersenyum bahagia bersama',
  highfive: 'tos high-five dengan',
  nom: 'mengunyah bersama',
  poke: 'mencolek pipi',
  smile: 'tersenyum manis ke',
  smug: 'tersenyum bangga di depan',
  tickle: 'menggelitik',
  wave: 'melambaikan tangan ke',
  wink: 'mengedipkan mata ke',
  yeet: 'melempar jauh',
  blush: 'tersipu malu di depan',
  bonk: 'memukul kepala (bonk!)',
  kill: 'menyerang (kill!)',
  lick: 'menjilat',
  bully: 'menjahili',
  spank: 'memukul pelan',
  glomp: 'menerjang peluk',
  awoo: 'melolong cute ke',
  cringe: 'merasa malu melihat'
};

export const REACTION_COMMANDS = [
  'cry', 'kill', 'hug', 'pat', 'lick', 'kiss', 'bite', 'yeet', 'bully', 'bonk',
  'wink', 'poke', 'nom', 'slap', 'smile', 'wave', 'awoo', 'blush', 'smug', 'glomp',
  'happy', 'dance', 'cringe', 'cuddle', 'highfive', 'handhold', 'spank', 'tickle', 'feed'
];

export async function fetchReactionGif(cmd) {
  // Try purrbot for lick
  if (cmd === 'lick') {
    try {
      const res = await fetch('https://api.purrbot.site/v2/img/sfw/lick/gif', { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        if (data.link) {
          const dl = await fetch(data.link, { signal: AbortSignal.timeout(10000) });
          if (dl.ok) return Buffer.from(await dl.arrayBuffer());
        }
      }
    } catch {}
  }

  const endpoint = NEKOS_ACTIONS.has(cmd) ? cmd : (ACTION_FALLBACK_MAP[cmd] || 'hug');
  const res = await fetch(`https://nekos.best/api/v2/${endpoint}`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error('Gagal mengambil reaction gif');
  const data = await res.json();
  const url = data?.results?.[0]?.url;
  if (!url) throw new Error('URL reaksi tidak ditemukan');

  const dl = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!dl.ok) throw new Error('Gagal mengunduh gif reaksi');
  return Buffer.from(await dl.arrayBuffer());
}

// ─── Main Fun Command Handler ──────────────────────────────────────────────
export async function handleFun(sock, m, context) {
  const { jid, cmd, args, q, quoted, isGroup } = context;
  const sender = m.key.participant || (sock.user?.id ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : jid);
  const senderName = sender.split('@')[0];

  // 1. Urban Dictionary Definition
  if (cmd === 'define') {
    if (!q) return sock.sendMessage(jid, { text: `Format: ${config.prefix}define <kata / istilah>` }, { quoted: m });
    await sock.sendMessage(jid, { text: `🔍 Mencari arti "${q}" di Urban Dictionary...` }, { quoted: m });
    try {
      const def = await getUrbanDefinition(q);
      if (!def) return sock.sendMessage(jid, { text: `Arti untuk kata "${q}" tidak ditemukan.` }, { quoted: m });
      const text = `📖 *URBAN DICTIONARY: ${def.word.toUpperCase()}*\n\n`
        + `*Definisi:*\n${def.definition}\n\n`
        + (def.example ? `*Contoh Penggunaan:*\n_"${def.example}"_\n\n` : '')
        + `👍 ${def.thumbsUp} | 👎 ${def.thumbsDown} (Penulis: ${def.author || 'Anonim'})`;
      await sock.sendMessage(jid, { text }, { quoted: m });
    } catch (err) {
      await sock.sendMessage(jid, { text: `Gagal mencari definisi: ${err.message}` }, { quoted: m });
    }
    return;
  }

  // 2. Readmore Generator
  if (cmd === 'readmore') {
    const readmoreChar = String.fromCharCode(8206).repeat(4001);
    if (!q) {
      return sock.sendMessage(jid, {
        text: `Gunakan tanda "|" untuk memisahkan teks depan dan teks tersembunyi.\n\nContoh: ${config.prefix}readmore Klik disini | Kamu kena jebakan!`
      }, { quoted: m });
    }
    const parts = q.split('|');
    const front = parts[0]?.trim() || '';
    const hidden = parts.slice(1).join('|').trim() || '';
    const text = front + readmoreChar + (hidden ? '\n' + hidden : '');
    await sock.sendMessage(jid, { text });
    return;
  }

  // 3. Facts
  if (cmd === 'fact') {
    const fact = await getRandomFact();
    return sock.sendMessage(jid, {
      text: `💡 *TAHUKAH KAMU?*\n\n"${fact}"`
    }, { quoted: m });
  }

  // 4. Group Couple & Soulmate
  if (cmd === 'couple' || cmd === 'soulmate') {
    if (!isGroup) return sock.sendMessage(jid, { text: 'Perintah ini hanya dapat digunakan di dalam grup!' }, { quoted: m });
    try {
      const metadata = await sock.groupMetadata(jid);
      const members = metadata.participants.map(p => p.id);
      if (members.length < 2) return sock.sendMessage(jid, { text: 'Anggota grup terlalu sedikit.' }, { quoted: m });

      if (cmd === 'couple') {
        const shuffled = [...members].sort(() => 0.5 - Math.random());
        const u1 = shuffled[0];
        const u2 = shuffled[1];
        const text = `💘 *PASANGAN HARI INI* 💘\n\nSelamat kepada:\n@${u1.split('@')[0]} ❤️ @${u2.split('@')[0]}\n\nSemoga langgeng sampai akhir hayat ya! ✨`;
        return sock.sendMessage(jid, { text, mentions: [u1, u2] }, { quoted: m });
      }

      if (cmd === 'soulmate') {
        const target = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || (quoted ? (quoted.sender || m.message?.extendedTextMessage?.contextInfo?.participant) : sender);
        const candidates = members.filter(id => id !== target);
        const match = candidates[Math.floor(Math.random() * candidates.length)];
        const percent = Math.floor(Math.random() * 51) + 50; // 50-100%
        const text = `💞 *HASIL SOULMATE RADAR* 💞\n\nBelahan jiwa dari @${target.split('@')[0]} adalah:\n✨ @${match.split('@')[0]} ✨\n\nTingkat kecocokan: *${percent}%* 💍`;
        return sock.sendMessage(jid, { text, mentions: [target, match] }, { quoted: m });
      }
    } catch (err) {
      return sock.sendMessage(jid, { text: `Gagal memproses jodoh: ${err.message}` }, { quoted: m });
    }
  }

  // 5. Checkers (stupidcheck, handsomecheck, etc.)
  if (cmd.endsWith('check') || cmd === 'checkme') {
    const target = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || (quoted ? (quoted.sender || m.message?.extendedTextMessage?.contextInfo?.participant) : sender);
    const targetName = target.split('@')[0];

    if (cmd === 'checkme') {
      const stats = [
        `😎 Coolness      : ${Math.floor(Math.random() * 101)}%`,
        `🧠 Smartness     : ${Math.floor(Math.random() * 101)}%`,
        `✨ Handsomeness  : ${Math.floor(Math.random() * 101)}%`,
        `🥰 Loveliness    : ${Math.floor(Math.random() * 101)}%`,
        `😈 Evilness      : ${Math.floor(Math.random() * 101)}%`,
        `🔥 Hotness       : ${Math.floor(Math.random() * 101)}%`
      ];
      const text = `📊 *HASIL SCAN PROFIL LENGKAP: @${targetName}*\n\n${stats.join('\n')}`;
      return sock.sendMessage(jid, { text, mentions: [target] }, { quoted: m });
    }

    const trait = cmd.replace('check', '');
    const percent = Math.floor(Math.random() * 101);
    const text = `🔍 *${cmd.toUpperCase()}*\n\nTingkat *${trait}* dari @${targetName} adalah: *${percent}%*!`;
    return sock.sendMessage(jid, { text, mentions: [target] }, { quoted: m });
  }

  // 6. Pick / Choice
  if (cmd === 'pick') {
    if (!q) return sock.sendMessage(jid, { text: `Format: ${config.prefix}pick pilihan 1 | pilihan 2 | pilihan 3` }, { quoted: m });
    const delimiter = q.includes('|') ? '|' : (q.includes(',') ? ',' : ' ');
    const items = q.split(delimiter).map(i => i.trim()).filter(Boolean);
    if (items.length < 2) return sock.sendMessage(jid, { text: 'Berikan minimal 2 pilihan yang dipisahkan tanda | atau koma.' }, { quoted: m });
    const chosen = items[Math.floor(Math.random() * items.length)];
    return sock.sendMessage(jid, {
      text: `🎲 Menurut analisaku, pilihan terbaik adalah:\n👉 *${chosen}*`
    }, { quoted: m });
  }

  // 7. Pickupline & Quotes
  if (cmd === 'pickupline') {
    const line = PICKUPLINES[Math.floor(Math.random() * PICKUPLINES.length)];
    return sock.sendMessage(jid, { text: `💘 "${line}"` }, { quoted: m });
  }

  if (cmd === 'quotes') {
    const qLine = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    return sock.sendMessage(jid, { text: `📜 "${qLine}"` }, { quoted: m });
  }

  // 8. Magic Answers (can, is, when, where, what, how, rate)
  if (['can', 'is', 'when', 'where', 'what', 'how', 'rate'].includes(cmd)) {
    if (!q) return sock.sendMessage(jid, { text: `Format: ${config.prefix}${cmd} <pertanyaan / hal>` }, { quoted: m });

    let answer = '';
    if (cmd === 'can') {
      const ans = ['Tentu saja bisa!', 'Bisa banget!', 'Mungkin bisa, coba dulu.', 'Tidak bisa.', 'Mustahil.', 'Sangat sulit, tapi bisa dicoba.'];
      answer = ans[Math.floor(Math.random() * ans.length)];
    } else if (cmd === 'is') {
      const ans = ['Iya, benar sekali.', 'Sangat iya!', 'Mungkin saja.', 'Tidak.', 'Bukan.', 'Jelas tidak.'];
      answer = ans[Math.floor(Math.random() * ans.length)];
    } else if (cmd === 'when') {
      const ans = ['Besok pagi.', '3 hari lagi.', 'Minggu depan.', 'Bulan depan.', 'Tahun depan.', 'Tidak akan pernah!', 'Saat kamu sudah siap.'];
      answer = ans[Math.floor(Math.random() * ans.length)];
    } else if (cmd === 'where') {
      const ans = ['Di dalam hatimu.', 'Di kamarmu.', 'Di warteg terdekat.', 'Di surga.', 'Di tempat yang tidak terduga.', 'Di masa depan.'];
      answer = ans[Math.floor(Math.random() * ans.length)];
    } else if (cmd === 'what') {
      const ans = ['Rahasia alam semesta.', 'Sesuatu yang sangat berharga.', 'Hal biasa saja.', 'Sebuah takdir yang indah.', 'Cinta dan harapan.'];
      answer = ans[Math.floor(Math.random() * ans.length)];
    } else if (cmd === 'how') {
      const ans = ['Dengan sabar dan berdoa.', 'Kerja keras tanpa henti.', 'Fokus pada satu tujuan.', 'Tanyakan pada ahlinya.', 'Coba lakukan perlahan tapi pasti.'];
      answer = ans[Math.floor(Math.random() * ans.length)];
    } else if (cmd === 'rate') {
      const score = Math.floor(Math.random() * 10) + 1;
      const stars = '⭐'.repeat(Math.min(score, 5));
      answer = `Skor penilaian: *${score}/10* ${stars}`;
    }

    return sock.sendMessage(jid, {
      text: `❓ Pertanyaan: *${q}*\n🔮 Jawaban: *${answer}*`
    }, { quoted: m });
  }

  // 9. Anime Reactions (hug, kiss, pat, etc.)
  if (REACTION_COMMANDS.includes(cmd)) {
    const target = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || (quoted ? (quoted.sender || m.message?.extendedTextMessage?.contextInfo?.participant) : null);
    const actDesc = ACTION_DESCRIPTIONS[cmd] || cmd;
    let caption = `✨ *[ ${cmd.toUpperCase()} ]*`;

    const mentions = [sender];
    if (target) {
      mentions.push(target);
      caption = `✨ @${senderName} ${actDesc} @${target.split('@')[0]}! 💕`;
    } else {
      caption = `✨ @${senderName} sedang ${cmd}!`;
    }

    try {
      const gifBuf = await fetchReactionGif(cmd);
      await sock.sendMessage(jid, {
        video: gifBuf,
        gifPlayback: true,
        caption,
        mentions
      }, { quoted: m });
    } catch (err) {
      await sock.sendMessage(jid, { text: `[${cmd.toUpperCase()}] ${caption}`, mentions }, { quoted: m });
    }
  }
}

