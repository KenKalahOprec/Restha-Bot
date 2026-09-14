import config from '../../config.js';
import { nabiList, doaHinduList, dhammapadaList } from '../libs/constants.js';

export async function handleReligion(sock, m, { jid, cmd, args, q }) {
  switch (cmd) {
    case 'kisahnabi': {
      const query = (args[0] || '').toLowerCase();
      if (!query || !nabiList[query]) {
        const daftar = Object.keys(nabiList).map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(', ');
        return sock.sendMessage(jid, { text: `Gunakan: ${config.prefix}kisahnabi <nama>\nContoh: ${config.prefix}kisahnabi adam\n\nDaftar 25 Nabi & Rasul:\n${daftar}` }, { quoted: m });
      }
      await sock.sendMessage(jid, { text: `📜 *KISAH 25 NABI & RASUL*\n\n${nabiList[query]}` }, { quoted: m });
      break;
    }

    case 'quran':
    case 'alquran': {
      if (!q) return sock.sendMessage(jid, { text: `Format: ${config.prefix}quran <surah:ayat>\nContoh: ${config.prefix}quran 1:1` }, { quoted: m });
      const [surah, ayat] = q.split(':');
      if (!surah || !ayat) return sock.sendMessage(jid, { text: `Format salah. Contoh: ${config.prefix}quran 1:1` }, { quoted: m });
      try {
        const res = await fetch(`https://api.alquran.cloud/v1/ayah/${surah}:${ayat}/editions/quran-uthmani,id.indonesian`);
        const data = await res.json();
        if (data.code === 200) {
          const ar = data.data[0].text;
          const idText = data.data[1].text;
          const surahName = data.data[0].surah.englishName;
          await sock.sendMessage(jid, { text: `📖 *QS. ${surahName} [${surah}:${ayat}]*\n\n${ar}\n\n*Terjemahan:*\n"${idText}"` }, { quoted: m });
        } else {
          await sock.sendMessage(jid, { text: 'Ayat Al-Qur\'an tidak ditemukan. Pastikan nomor surah dan ayat benar.' }, { quoted: m });
        }
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal memuat Al-Qur'an: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'jadwalsholat':
    case 'sholat': {
      const kota = q || 'Jakarta';
      try {
        const date = new Date().toISOString().split('T')[0];
        const res = await fetch(`https://api.aladhan.com/v1/timingsByCity/${date}?city=${encodeURIComponent(kota)}&country=Indonesia&method=11`);
        const data = await res.json();
        if (data.code === 200) {
          const t = data.data.timings;
          let text = `🕌 *JADWAL SHOLAT WILAYAH ${kota.toUpperCase()}*\n`;
          text += `📅 Tanggal: ${data.data.date.readable}\n\n`;
          text += `• Imsak    : ${t.Imsak}\n`;
          text += `• Subuh    : ${t.Fajr}\n`;
          text += `• Dzuhur   : ${t.Dhuhr}\n`;
          text += `• Ashar    : ${t.Asr}\n`;
          text += `• Maghrib  : ${t.Maghrib}\n`;
          text += `• Isya     : ${t.Isha}`;
          await sock.sendMessage(jid, { text }, { quoted: m });
        } else {
          await sock.sendMessage(jid, { text: `Jadwal sholat untuk kota "${kota}" tidak ditemukan.` }, { quoted: m });
        }
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal mengambil jadwal sholat: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'alkitab':
    case 'bible': {
      if (!q) return sock.sendMessage(jid, { text: `Format: ${config.prefix}alkitab <kitab pasal:ayat>\nContoh: ${config.prefix}alkitab Kejadian 1:1` }, { quoted: m });
      try {
        const res = await fetch(`https://bible-api.com/${encodeURIComponent(q)}?translation=kjv`);
        const data = await res.json();
        if (data.text) {
          await sock.sendMessage(jid, { text: `✝️ *ALKITAB (${data.reference})*\n\n"${data.text.trim()}"` }, { quoted: m });
        } else {
          await sock.sendMessage(jid, { text: `Ayat Alkitab "${q}" tidak ditemukan. Pastikan penulisan sesuai (Contoh: Kejadian 1:1 atau John 3:16).` }, { quoted: m });
        }
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal memuat ayat Alkitab: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'gita':
    case 'bhagavadgita': {
      if (!q) return sock.sendMessage(jid, { text: `[PETUNJUK] Format: ${config.prefix}gita <bab:sloka>\nContoh: ${config.prefix}gita 2:47 (Bab 1-18)` }, { quoted: m });
      const parts = q.trim().split(/[:\s]+/);
      const ch = parseInt(parts[0]);
      const sl = parseInt(parts[1]);

      if (isNaN(ch) || isNaN(sl) || ch < 1 || ch > 18 || sl < 1) {
        return sock.sendMessage(jid, { text: `[ERROR] Bab atau sloka tidak valid. Bhagavad Gita terdiri dari Bab 1 sampai 18.\nContoh: ${config.prefix}gita 2:47` }, { quoted: m });
      }

      try {
        const res = await fetch(`https://vedicscriptures.github.io/slok/${ch}/${sl}`, {
          headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(8000)
        });
        if (!res.ok) {
          return sock.sendMessage(jid, { text: `[ERROR] Sloka ${ch}:${sl} tidak ditemukan dalam kitab Bhagavad Gita.` }, { quoted: m });
        }
        const data = await res.json();
        if (data.slok) {
          const trans = data.siva?.et || data.purohit?.et || data.tej?.ht || '-';
          await sock.sendMessage(jid, {
            text: `┌── [ BHAGAVAD GITA: BAB ${ch} SLOKA ${sl} ]\n│ Sanskrit:\n${data.slok}\n\n│ Meaning:\n"${trans}"\n└──`
          }, { quoted: m });
        } else {
          await sock.sendMessage(jid, { text: `[ERROR] Sloka ${ch}:${sl} tidak ditemukan.` }, { quoted: m });
        }
      } catch (err) {
        await sock.sendMessage(jid, { text: `[ERROR] Gagal memuat Bhagavad Gita: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'doahindu':
    case 'hindu': {
      const query = (args[0] || '').toLowerCase().replace(/[^a-z]/g, '');
      if (!query || !doaHinduList[query]) {
        const list = Object.keys(doaHinduList).map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ');
        return sock.sendMessage(jid, {
          text: `┌── [ DOA HARIAN HINDU ]\n│ Pilihan doa: ${list}\n│ Contoh: ${config.prefix}doahindu gayatri\n│ Atau: ${config.prefix}hindu trisandya\n└──`
        }, { quoted: m });
      }
      await sock.sendMessage(jid, {
        text: `┌── [ DOA HINDU: ${query.toUpperCase()} ]\n${doaHinduList[query]}\n└──`
      }, { quoted: m });
      break;
    }

    case 'dhammapada':
    case 'buddha': {
      const idx = parseInt(args[0]) || 1;
      const verse = dhammapadaList.find(d => d.verse === idx) || dhammapadaList[0];
      await sock.sendMessage(jid, {
        text: `┌── [ DHAMMAPADA: SYAIR ${verse.verse} ]\n"${verse.text}"\n└──`
      }, { quoted: m });
      break;
    }
  }
}

