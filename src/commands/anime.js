import { downloadMangaChapterPdf } from '../libs/manga.js';
import { downloadAnime360p } from '../libs/media.js';
import { isOtakudesuUrl, downloadOtakudesu, searchAndDownloadAnime } from '../libs/otakudesu.js';

const BASE = 'https://kitsu.io/api/edge';
const HEADERS = { Accept: 'application/vnd.api+json' };

async function kitsuGet(path) {
  const r = await fetch(`${BASE}${path}`, { headers: HEADERS, signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error(`Kitsu error ${r.status}`);
  return r.json();
}

function formatStatus(s) {
  const map = { current: 'Ongoing', finished: 'Selesai', tba: 'TBA', unreleased: 'Belum Rilis', upcoming: 'Upcoming' };
  return map[s] || s || '-';
}

function buildCaption(item, type) {
  const a = item.attributes;
  const title = a.canonicalTitle || '-';
  const synopsis = (a.synopsis || '').slice(0, 300) + ((a.synopsis || '').length > 300 ? '...' : '');
  const status = formatStatus(a.status);
  const subtype = (a.subtype || '').toUpperCase();
  const url = `https://kitsu.io/${type}/${a.slug}`;

  if (type === 'anime') {
    return `┌── [ ANIME INFO ]\n│ Judul   : ${title}\n│ Tipe    : ${subtype}\n│ Status  : ${status}\n│ Episode : ${a.episodeCount || '?'}\n│ Link    : ${url}\n└──\n\n${synopsis}`;
  }
  const chType = type === 'manga' ? 'Chapter' : 'Chapter';
  return `┌── [ ${type.toUpperCase()} INFO ]\n│ Judul   : ${title}\n│ Tipe    : ${subtype}\n│ Status  : ${status}\n│ ${chType}  : ${a.chapterCount || '?'}\n│ Link    : ${url}\n└──\n\n${synopsis}`;
}

export async function handleAnime(sock, m, { jid, args }) {
  const q = args.join(' ').trim();
  if (!q) return sock.sendMessage(jid, { text: '❌ Masukkan judul anime.\nContoh: .anime naruto' }, { quoted: m });

  await sock.sendMessage(jid, { text: '🔍 Mencari anime...' }, { quoted: m });
  const data = await kitsuGet(`/anime?filter[text]=${encodeURIComponent(q)}&page[limit]=1&fields[anime]=slug,canonicalTitle,synopsis,status,episodeCount,posterImage,subtype`);

  if (!data.data?.length) return sock.sendMessage(jid, { text: `❌ Anime *${q}* tidak ditemukan.` }, { quoted: m });

  const item = data.data[0];
  const poster = item.attributes.posterImage?.large || item.attributes.posterImage?.medium;
  const caption = buildCaption(item, 'anime');

  if (poster) {
    await sock.sendMessage(jid, { image: { url: poster }, caption }, { quoted: m });
  } else {
    await sock.sendMessage(jid, { text: caption }, { quoted: m });
  }
}

export async function handleManga(sock, m, { jid, args }) {
  const q = args.join(' ').trim();
  if (!q) return sock.sendMessage(jid, { text: '❌ Masukkan judul manga.\nContoh: .manga one piece' }, { quoted: m });

  await sock.sendMessage(jid, { text: '🔍 Mencari manga...' }, { quoted: m });
  const data = await kitsuGet(`/manga?filter[text]=${encodeURIComponent(q)}&filter[subtype]=manga&page[limit]=1&fields[manga]=slug,canonicalTitle,synopsis,status,chapterCount,posterImage,subtype`);

  if (!data.data?.length) return sock.sendMessage(jid, { text: `❌ Manga *${q}* tidak ditemukan.` }, { quoted: m });

  const item = data.data[0];
  const poster = item.attributes.posterImage?.large || item.attributes.posterImage?.medium;
  const caption = buildCaption(item, 'manga');

  if (poster) {
    await sock.sendMessage(jid, { image: { url: poster }, caption }, { quoted: m });
  } else {
    await sock.sendMessage(jid, { text: caption }, { quoted: m });
  }
}

export async function handleManhwa(sock, m, { jid, args }) {
  const q = args.join(' ').trim();
  if (!q) return sock.sendMessage(jid, { text: '❌ Masukkan judul manhwa.\nContoh: .manhwa solo leveling' }, { quoted: m });

  await sock.sendMessage(jid, { text: '🔍 Mencari manhwa...' }, { quoted: m });
  const data = await kitsuGet(`/manga?filter[text]=${encodeURIComponent(q)}&filter[subtype]=manhwa&page[limit]=1&fields[manga]=slug,canonicalTitle,synopsis,status,chapterCount,posterImage,subtype`);

  if (!data.data?.length) return sock.sendMessage(jid, { text: `❌ Manhwa *${q}* tidak ditemukan.` }, { quoted: m });

  const item = data.data[0];
  const poster = item.attributes.posterImage?.large || item.attributes.posterImage?.medium;
  const caption = buildCaption(item, 'manhwa');

  if (poster) {
    await sock.sendMessage(jid, { image: { url: poster }, caption }, { quoted: m });
  } else {
    await sock.sendMessage(jid, { text: caption }, { quoted: m });
  }
}

export async function handleMangaDownload(sock, m, { jid, args }) {
  if (!args.length) {
    return sock.sendMessage(jid, {
      text: '❌ Masukkan judul manga dan nomor chapter (opsional).\nContoh: .mangadl naruto 1\nAtau: .mangadl one piece'
    }, { quoted: m });
  }

  let chapterTarget = null;
  let mangaQuery = '';

  const lastArg = args[args.length - 1];
  if (args.length > 1 && /^\d+(\.\d+)?$/.test(lastArg)) {
    chapterTarget = lastArg;
    mangaQuery = args.slice(0, -1).join(' ').trim();
  } else {
    mangaQuery = args.join(' ').trim();
  }

  await sock.sendMessage(jid, { text: '[SYSTEM] Mengunduh halaman manga & kompilasi PDF...' }, { quoted: m });

  try {
    const { pdfBuffer, mangaTitle, chTitle, pageCount, source } = await downloadMangaChapterPdf(mangaQuery, chapterTarget);
    const safeFile = `${mangaTitle}_${chTitle}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);

    await sock.sendMessage(jid, {
      document: pdfBuffer,
      mimetype: 'application/pdf',
      fileName: `${safeFile}.pdf`,
      caption: `┌── [ MANGA DOWNLOADER ]\n│ Judul   : ${mangaTitle}\n│ Chapter : ${chTitle}\n│ Halaman : ${pageCount} hal\n│ Sumber  : ${source || 'Manga/Komik'}\n│ Format  : PDF Document\n└──`
    }, { quoted: m });
  } catch (err) {
    await sock.sendMessage(jid, { text: `[ERROR] Gagal mengunduh manga: ${err.message}` }, { quoted: m });
  }
}

export async function handleAnimeDownload(sock, m, { jid, q }) {
  const query = (q || '').trim();
  if (!query) {
    return sock.sendMessage(jid, {
      text: '[ERROR] Masukkan judul anime atau link video.\nContoh: .animedl naruto episode 1\nAtau: .animedl https://...'
    }, { quoted: m });
  }

  await sock.sendMessage(jid, { text: '[SYSTEM] Mengunduh video anime 360p stream...' }, { quoted: m });

  try {
    let result = null;
    if (isOtakudesuUrl(query)) {
      result = await downloadOtakudesu(query);
    } else if (!query.startsWith('http')) {
      try {
        result = await searchAndDownloadAnime(query);
      } catch {
        result = await downloadAnime360p(query);
      }
    } else {
      result = await downloadAnime360p(query);
    }

    const { buffer, meta } = result;
    const rawTitle = meta?.title || query;
    const cleanTitle = rawTitle.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 45);

    await sock.sendMessage(jid, {
      document: buffer,
      mimetype: 'video/mp4',
      fileName: `${cleanTitle}_360p.mp4`,
      caption: `┌── [ ANIME DOWNLOADER ]\n│ Judul    : ${rawTitle}\n│ Kualitas : 360p\n│ Format   : Video MP4 (Document)\n└──`
    }, { quoted: m });
  } catch (err) {
    const rawMsg = err.message || '';
    const cleanMsg = rawMsg
      .split('\n')
      .filter(l => !l.includes('yt-dlp') && !l.includes('--format') && !l.includes('ffmpeg-installer'))
      .slice(-2)
      .join(' ')
      .trim() || rawMsg;
    await sock.sendMessage(jid, { text: `[ERROR] Gagal mengunduh anime: ${cleanMsg}` }, { quoted: m });
  }
}

