import config from '../../config.js';
import https from 'https';
import ytdlp from 'yt-dlp-exec';
import { searchImage, downloadVideoWithMeta } from '../libs/media.js';
import { askAI } from '../libs/ai.js';
import { searchApk } from '../libs/scrapers.js';

export async function handleGoogle(sock, m, { jid, q }) {
  if (!q) return sock.sendMessage(jid, { text: `Format: ${config.prefix}google <pencarian>` }, { quoted: m });
  await sock.sendMessage(jid, { text: `🔍 Sedang mencari informasi "${q}"...` }, { quoted: m });

  let explanation = '';
  let imgBuf = null;
  const webUrl = `https://www.google.com/search?q=${encodeURIComponent(q)}`;

  try {
    const wikiRes = await fetch(`https://id.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(4000) });
    if (wikiRes.ok) {
      const wData = await wikiRes.json();
      if (wData.extract) {
        explanation = wData.extract;
        const wImg = wData.thumbnail?.source || wData.originalimage?.source;
        if (wImg) {
          const imgRes = await fetch(wImg, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(4000) });
          if (imgRes.ok) imgBuf = Buffer.from(await imgRes.arrayBuffer());
        }
      }
    }
  } catch {}

  if (!explanation) {
    try {
      explanation = await askAI(`Berikan penjelasan informatif, padat, dan jelas dalam 2-3 kalimat mengenai: ${q}`);
    } catch {}
  }

  if (!imgBuf) {
    imgBuf = await searchImage(q);
  }

  const caption = `🔍 *Google Search: ${q}*\n\n${explanation || 'Berikut rangkuman dan informasi pencarian terkait topik tersebut.'}\n\n🔗 *Sumber Web:*\n${webUrl}`;

  if (imgBuf) {
    await sock.sendMessage(jid, { image: imgBuf, caption }, { quoted: m });
  } else {
    await sock.sendMessage(jid, { text: caption }, { quoted: m });
  }
}

export async function handleWiki(sock, m, { jid, q }) {
  if (!q) return sock.sendMessage(jid, { text: `Format: ${config.prefix}wiki <kata_kunci>` }, { quoted: m });
  await sock.sendMessage(jid, { text: `📚 Sedang mencari "${q}" di Wikipedia...` }, { quoted: m });
  try {
    let res = await fetch(`https://id.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`);
    let data = await res.json();
    if (!data.title || !data.extract) {
      res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`);
      data = await res.json();
    }

    if (data.title && data.extract) {
      const wikiUrl = data.content_urls?.desktop?.page || `https://id.wikipedia.org/wiki/${encodeURIComponent(data.title)}`;
      const caption = `📚 *${data.title}*\n\n${data.extract}\n\n🔗 *Sumber Web:*\n${wikiUrl}`;

      let imgBuf = null;
      const imgUrl = data.thumbnail?.source || data.originalimage?.source;
      if (imgUrl) {
        try {
          const imgRes = await fetch(imgUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) });
          if (imgRes.ok) imgBuf = Buffer.from(await imgRes.arrayBuffer());
        } catch {}
      }
      if (!imgBuf) imgBuf = await searchImage(data.title);

      if (imgBuf) {
        await sock.sendMessage(jid, { image: imgBuf, caption }, { quoted: m });
      } else {
        await sock.sendMessage(jid, { text: caption }, { quoted: m });
      }
    } else {
      await sock.sendMessage(jid, { text: `Informasi untuk "${q}" tidak ditemukan di Wikipedia.` }, { quoted: m });
    }
  } catch (err) {
    await sock.sendMessage(jid, { text: `Gagal mencari Wikipedia: ${err.message}` }, { quoted: m });
  }
}

export async function handleYts(sock, m, { jid, q }) {
  if (!q) return sock.sendMessage(jid, { text: `Format: ${config.prefix}yts <judul>` }, { quoted: m });
  await sock.sendMessage(jid, { text: '🔎 Sedang mencari video di YouTube...' }, { quoted: m });
  try {
    const info = await ytdlp(`ytsearch5:${q}`, { dumpSingleJson: true, flatPlaylist: true });
    const entries = info.entries || [info];
    let ytsText = `🔎 *Hasil Pencarian YouTube:* "${q}"\n\n`;
    entries.slice(0, 5).forEach((item, idx) => {
      const dur = item.duration_string || (item.duration ? `${item.duration}s` : '');
      const videoUrl = item.webpage_url || item.url || (item.id ? `https://www.youtube.com/watch?v=${item.id}` : '');
      ytsText += `*${idx + 1}. ${item.title}*\n⏱️ Durasi: ${dur} | 👤 ${item.uploader || item.channel || ''}\n🔗 ${videoUrl}\n\n`;
    });

    const topItem = entries[0];
    let thumbBuf = null;
    const thumbUrl = topItem?.thumbnails?.[0]?.url || topItem?.thumbnail || (topItem?.id ? `https://i.ytimg.com/vi/${topItem.id}/hqdefault.jpg` : null);
    if (thumbUrl) {
      try {
        const thumbRes = await fetch(thumbUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(6000) });
        if (thumbRes.ok) thumbBuf = Buffer.from(await thumbRes.arrayBuffer());
      } catch {}
    }

    if (thumbBuf) {
      await sock.sendMessage(jid, { image: thumbBuf, caption: ytsText.trim() }, { quoted: m });
    } else {
      await sock.sendMessage(jid, { text: ytsText.trim() }, { quoted: m });
    }
  } catch (err) {
    await sock.sendMessage(jid, { text: `Gagal mencari YouTube: ${err.message}` }, { quoted: m });
  }
}

export async function handleLyrics(sock, m, { jid, q }) {
  if (!q) return sock.sendMessage(jid, { text: `Format: ${config.prefix}lyrics <judul lagu>` }, { quoted: m });
  await sock.sendMessage(jid, { text: `🎵 Sedang mencari lirik "${q}"...` }, { quoted: m });
  try {
    const res = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(q.split('-')[0] || '')}/${encodeURIComponent(q.split('-')[1] || q)}`);
    const data = await res.json();
    if (data.lyrics) {
      await sock.sendMessage(jid, { text: `🎤 *LIRIK LAGU: ${q.toUpperCase()}*\n\n${data.lyrics}` }, { quoted: m });
    } else {
      const aiLyrics = await askAI(`Tuliskan lirik lagu lengkap untuk: ${q}`);
      await sock.sendMessage(jid, { text: `🎤 *LIRIK LAGU: ${q.toUpperCase()}*\n\n${aiLyrics}` }, { quoted: m });
    }
  } catch {
    const aiLyrics = await askAI(`Tuliskan lirik lagu lengkap untuk: ${q}`);
    await sock.sendMessage(jid, { text: `🎤 *LIRIK LAGU: ${q.toUpperCase()}*\n\n${aiLyrics}` }, { quoted: m });
  }
}

export async function handleChord(sock, m, { jid, q }) {
  if (!q) return sock.sendMessage(jid, { text: `Format: ${config.prefix}chord <judul lagu>` }, { quoted: m });
  await sock.sendMessage(jid, { text: `🎸 Sedang mencari chord gitar "${q}"...` }, { quoted: m });
  try {
    const chordText = await askAI(`Berikan chord gitar dan lirik kunci nada asli yang akurat dan rapi untuk lagu: ${q}`);
    await sock.sendMessage(jid, { text: `🎸 *CHORD GITAR: ${q.toUpperCase()}*\n\n${chordText}` }, { quoted: m });
  } catch (err) {
    await sock.sendMessage(jid, { text: `Gagal memproses chord: ${err.message}` }, { quoted: m });
  }
}

export async function handlePixiv(sock, m, { jid, q }) {
  if (!q) return sock.sendMessage(jid, { text: `Format: ${config.prefix}pixiv <query>` }, { quoted: m });
  await sock.sendMessage(jid, { text: `🎨 Mencari ilustrasi anime untuk "${q}"...` }, { quoted: m });
  const buf = await searchImage(`${q} anime illustration pixiv`);
  if (buf) {
    await sock.sendMessage(jid, { image: buf, caption: `🎨 *Pixiv Art:* "${q}"` }, { quoted: m });
  } else {
    await sock.sendMessage(jid, { text: `Ilustrasi untuk "${q}" tidak ditemukan.` }, { quoted: m });
  }
}

export async function handlePinterest(sock, m, { jid, q }) {
  if (!q) return sock.sendMessage(jid, { text: `Format: ${config.prefix}pin <pencarian>` }, { quoted: m });
  await sock.sendMessage(jid, { text: `📌 Sedang mencari gambar Pinterest untuk: "${q}"...` }, { quoted: m });
  const imgBuf = await searchImage(`${q} pinterest`);
  if (imgBuf) {
    await sock.sendMessage(jid, { image: imgBuf, caption: `📌 *Pinterest Result:* "${q}"` }, { quoted: m });
  } else {
    await sock.sendMessage(jid, { text: `Gambar untuk "${q}" tidak ditemukan di Pinterest.` }, { quoted: m });
  }
}

export async function handleTiktokSearch(sock, m, { jid, q }) {
  if (!q) return sock.sendMessage(jid, { text: `[PETUNJUK] Format: ${config.prefix}ttsearch <query>` }, { quoted: m });
  await sock.sendMessage(jid, { text: `[SYSTEM] Mencari video terkait "${q}"...` }, { quoted: m });

  // 1. Coba TikWM Search API jika tidak kena Cloudflare
  try {
    const res = await fetch(`https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(q)}&count=1`, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      const data = await res.json();
      const vid = data.data?.videos?.[0];
      if (vid && vid.play) {
        const vRes = await fetch(vid.play, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(15000) });
        if (vRes.ok) {
          const vBuf = Buffer.from(await vRes.arrayBuffer());
          return await sock.sendMessage(jid, {
            video: vBuf,
            mimetype: 'video/mp4',
            caption: `┌── [ TIKTOK SEARCH ]\n│ Judul  : ${vid.title || q}\n│ Author : @${vid.author?.unique_id || '-'}\n└──`
          }, { quoted: m });
        }
      }
    }
  } catch {}

  // 2. Fallback: Search Short Video Pipeline (yt-dlp)
  try {
    const query = `${q} tiktok shorts`;
    const { buffer, meta } = await downloadVideoWithMeta(query);
    if (buffer && buffer.length > 0) {
      const title = meta?.title || q;
      const uploader = meta?.uploader || meta?.channel || '-';
      return await sock.sendMessage(jid, {
        video: buffer,
        mimetype: 'video/mp4',
        caption: `┌── [ SHORT VIDEO SEARCH ]\n│ Judul   : ${title}\n│ Channel : ${uploader}\n└──`
      }, { quoted: m });
    }
  } catch {}

  await sock.sendMessage(jid, { text: `[ERROR] Video untuk query "${q}" tidak ditemukan atau server sedang sibuk.` }, { quoted: m });
}

// ─── APK Search ─────────────────────────────────────────────────────────────
export async function handleApkSearch(sock, m, { jid, q }) {
  if (!q) return sock.sendMessage(jid, { text: `Format: ${config.prefix}apksearch <nama aplikasi>` }, { quoted: m });

  await sock.sendMessage(jid, { text: `🔍 Mencari APK "${q}" di database Android...` }, { quoted: m });
  try {
    const results = await searchApk(q);
    if (!results.length) return sock.sendMessage(jid, { text: `Tidak ada APK ditemukan untuk "${q}".` }, { quoted: m });

    for (const r of results.slice(0, 3)) {
      let caption = `📦 *${r.judul}*\n`;
      caption += `• Developer: ${r.kategori}\n`;
      caption += `• Versi: ${r.tanggal}\n`;
      if (r.deskripsi) caption += `• Info: ${r.deskripsi}\n`;
      caption += `🔗 Download: ${r.link}`;

      if (r.thumb) {
        try {
          const res = await fetch(r.thumb, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(6000) });
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

// ─── JAV Search & Metadata (18+ / JavLuv - JAV Database) ────────────────────
export async function handleJavSearch(sock, m, { jid, q }) {
  if (!q) return sock.sendMessage(jid, { text: `⚠️ *PERINGATAN KONTEN DEWASA (18+)*\nFormat: ${config.prefix}javsearch <kode ID / nama aktris>\nContoh: ${config.prefix}javsearch SSIS-001` }, { quoted: m });

  const warnHeader = `🔞 *[WARNING 18+ RESTRICTED CONTENT]*\n_Informasi ini memuat metadata video dewasa khusus 18+._\n────────────────────\n`;
  await sock.sendMessage(jid, { text: `${warnHeader}🔍 Mencari database JAV untuk "${q}"...` }, { quoted: m });

  try {
    const trimmed = q.trim();
    const isCode = /^[a-zA-Z0-9]+-\d+$/i.test(trimmed);

    // Helper ambil cover asli dari javdatabase via CDN proxy (bypass blokir ISP/Cloudflare)
    const fetchJavCover = async (rawUrl) => {
      if (!rawUrl) return null;
      const fullUrl = rawUrl.replace('/covers/thumb/', '/covers/full/').replace('ps.webp', 'pl.webp');
      const candidates = [
        `https://i0.wp.com/${fullUrl.replace(/^https?:\/\//, '')}`,
        `https://i0.wp.com/${rawUrl.replace(/^https?:\/\//, '')}`
      ];
      for (const u of candidates) {
        try {
          const res = await fetch(u, { signal: AbortSignal.timeout(8000) });
          if (res.ok) {
            const buf = Buffer.from(await res.arrayBuffer());
            if (buf.length > 2048) return buf;
          }
        } catch {}
      }
      return null;
    };

    // Jika input spesifik kode ID JAV (misal: SSIS-001)
    if (isCode) {
      try {
        const detailUrl = `https://r.jina.ai/https://www.javdatabase.com/movies/${encodeURIComponent(trimmed.toLowerCase())}/`;
        const res = await fetch(detailUrl, { signal: AbortSignal.timeout(15000) });
        if (res.ok) {
          const text = await res.text();
          if (!text.includes('Page not found') && text.includes('Title:')) {
            const titleMatch = text.match(/Title:\s*([^\n]+)/);
            const coverMatch = text.match(/https:\/\/www\.javdatabase\.com\/covers\/[^\)\s]+/i);
            const descMatch = text.match(/#### About [^\n]+\n\n([\s\S]*?)(?=\n\n\d+ Stars|\n\n####|$)/);
            const trailerMatch = text.match(/\[Video \d+\]\(([^\)]+)\)/i);

            const title = titleMatch ? titleMatch[1].replace(/\s*-\s*JAV Database/i, '') : trimmed.toUpperCase();
            const desc = descMatch ? descMatch[1].trim() : '-';
            const trailer = trailerMatch ? trailerMatch[1] : null;
            const cover = coverMatch ? coverMatch[0] : null;

            let caption = `${warnHeader}`;
            caption += `🎬 *ID:* ${trimmed.toUpperCase()}\n`;
            caption += `📌 *Judul:* ${title}\n`;
            caption += `📖 *Sinopsis / Info:*\n${desc}\n`;
            if (trailer) caption += `\n🎥 *Preview / Trailer:* ${trailer}\n`;
            caption += `🔗 *Detail:* https://www.javdatabase.com/movies/${encodeURIComponent(trimmed.toLowerCase())}/`;

            const imgBuf = await fetchJavCover(cover);
            if (imgBuf) {
              return await sock.sendMessage(jid, { image: imgBuf, caption }, { quoted: m });
            }

            return await sock.sendMessage(jid, { text: caption }, { quoted: m });
          }
        }
      } catch {}
    }

    // Pencarian umum (query kata kunci / nama aktris / ID)
    const searchUrl = `https://r.jina.ai/https://www.javdatabase.com/search/${encodeURIComponent(trimmed)}/`;
    const res = await fetch(searchUrl, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error('Gagal menghubungi server database JAV');

    const text = await res.text();
    const itemRegex = /\[([A-Z0-9]+-\d+)\]\((https:\/\/www\.javdatabase\.com\/movies\/[^\)]+)\)\s+\[!\[Image \d+: [^\]]*\]\(([^\)]+)\)\]\([^\)]+\)\s+\[([^\]]+)\]\([^\)]+\)\s+(\d{4}-\d{2}-\d{2})?\s+\[([^\]]+)\]/gi;
    let match;
    const items = [];
    while ((match = itemRegex.exec(text)) !== null && items.length < 5) {
      items.push({
        id: match[1],
        url: match[2],
        thumb: match[3],
        title: match[4],
        date: match[5] || '-',
        studio: match[6] || '-'
      });
    }

    if (!items.length) {
      return await sock.sendMessage(jid, { text: `${warnHeader}❌ Tidak ditemukan hasil untuk "${q}". Pastikan menggunakan kode ID (contoh: SSIS-001) atau nama model.` }, { quoted: m });
    }

    let listText = `${warnHeader}📋 *Hasil Pencarian JAV untuk: ${trimmed}*\n\n`;
    items.forEach((it, idx) => {
      listText += `*${idx + 1}. [${it.id}] ${it.title}*\n`;
      listText += `  • Studio: ${it.studio}\n`;
      listText += `  • Rilis: ${it.date}\n`;
      listText += `  • Link: ${it.url}\n\n`;
    });

    // Ambil cover asli dari item pertama hasil database
    const coverBuf = await fetchJavCover(items[0]?.thumb);
    if (coverBuf) {
      return await sock.sendMessage(jid, { image: coverBuf, caption: listText }, { quoted: m });
    }

    await sock.sendMessage(jid, { text: listText }, { quoted: m });
  } catch (err) {
    await sock.sendMessage(jid, { text: `${warnHeader}[ERROR] ${err.message}` }, { quoted: m });
  }
}

// ─── Budaya Bali Scraper (budayabali.com ID/EN) ──────────────────────────────
export async function handleBudayaBali(sock, m, { jid, q, cmd }) {
  if (!q) {
    return sock.sendMessage(jid, {
      text: `Format: ${config.prefix}${cmd} <kata kunci> [--en]\nContoh:\n• ${config.prefix}budayabali kuwum\n• ${config.prefix}bbali kuwum\n• ${config.prefix}bbali kuwum --en (bahasa inggris)`
    }, { quoted: m });
  }

  const isEn = q.includes('--en');
  const cleanQ = q.replace(/--en/gi, '').trim();
  const langLabel = isEn ? 'English' : 'Indonesia';
  const baseUrl = isEn ? 'https://budayabali.com' : 'https://budayabali.com/id';
  const searchUrl = isEn
    ? `https://budayabali.com/search?q=${encodeURIComponent(cleanQ)}`
    : `https://budayabali.com/id/search?q=${encodeURIComponent(cleanQ)}`;

  await sock.sendMessage(jid, { text: `🌺 Mencari artikel Budaya Bali (${langLabel}) untuk "${cleanQ}"...` }, { quoted: m });

  try {
    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(10000)
    });

    if (!res.ok) throw new Error('Gagal menghubungi server BudayaBali.com');
    const html = await res.text();

    // 1. Ekstrak daftar artikel dari hasil pencarian
    const regex = /<h\d[^>]*class="[^"]*title[^"]*"[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    const articles = [];
    while ((match = regex.exec(html)) !== null) {
      const link = match[1];
      const title = match[2].replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&#039;/g, "'").trim();
      if (!articles.some(a => a.link === link)) {
        articles.push({ link, title });
      }
    }

    if (!articles.length) {
      return await sock.sendMessage(jid, {
        text: `❌ Tidak ada artikel budaya ditemukan untuk "${cleanQ}". Coba kata kunci lain seperti: *tari*, *pura*, *desa*, *tradisi*.`
      }, { quoted: m });
    }

    // Prioritaskan artikel yang paling relevan dengan query
    const targetArticle = articles.find(a => a.title.toLowerCase().includes(cleanQ.toLowerCase())) || articles[0];

    // 2. Crawl detail artikel terpilih
    const artRes = await fetch(targetArticle.link, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(10000)
    });
    const artHtml = await artRes.text();

    const title = artHtml.match(/<meta property="og:title" content="([^"]+)"/)?.[1]
      || targetArticle.title;
    const desc = artHtml.match(/<meta property="og:description" content="([^"]+)"/)?.[1] || '';
    const coverUrl = artHtml.match(/<meta property="og:image" content="([^"]+)"/)?.[1] || '';
    const author = artHtml.match(/<meta property="article:author" content="([^"]+)"/)?.[1] || 'budayabali.com';
    const published = artHtml.match(/<meta property="article:published_time" content="([^"]+)"/)?.[1] || '-';

    // Ekstrak paragraf isi artikel
    const bodyMatch = artHtml.match(/<div[^>]*class="[^"]*post-text[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
      || artHtml.match(/<div[^>]*class="[^"]*text[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
      || artHtml.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

    let snippet = desc;
    if (bodyMatch) {
      const pText = bodyMatch[1]
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (pText.length > 50) {
        snippet = pText.slice(0, 900) + '...';
      }
    }

    let caption = `🌺 *[ BUDAYA BALI - PADMA BHUWANA ]*\n`;
    caption += `📖 *Judul*    : ${title}\n`;
    caption += `✍️ *Penulis*  : ${author}\n`;
    caption += `📅 *Rilis*    : ${published}\n`;
    caption += `🌐 *Bahasa*   : ${langLabel}\n`;
    caption += `────────────────────\n\n`;
    caption += `${snippet || 'Informasi budaya berhasil dirangkum.'}\n\n`;
    caption += `🔗 *Baca Selengkapnya:*\n${targetArticle.link}`;

    if (articles.length > 1) {
      caption += `\n\n📚 *Artikel Terkait Lainnya:*`;
      articles.slice(1, 4).forEach((a, i) => {
        caption += `\n${i + 1}. ${a.title}\n   ${a.link}`;
      });
    }

    // 3. Ambil dan kirim gambar cover asli artikel
    if (coverUrl) {
      try {
        const imgRes = await fetch(coverUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(8000)
        });
        if (imgRes.ok) {
          const imgBuf = Buffer.from(await imgRes.arrayBuffer());
          if (imgBuf.length > 2048) {
            return await sock.sendMessage(jid, { image: imgBuf, caption }, { quoted: m });
          }
        }
      } catch {}
    }

    await sock.sendMessage(jid, { text: caption }, { quoted: m });
  } catch (err) {
    await sock.sendMessage(jid, { text: `[ERROR BUDAYA BALI] ${err.message}` }, { quoted: m });
  }
}

// ─── WatchHentai API Scraper (watchhentai.net) ───────────────────────────────
function fetchWatchHentaiBuffer(urlOrPath, isImage = false) {
  let path = urlOrPath;
  if (urlOrPath.startsWith('http')) {
    try {
      const u = new URL(urlOrPath);
      path = u.pathname + u.search;
    } catch {}
  }
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: '104.21.37.208',
      port: 443,
      path: path,
      method: 'GET',
      servername: 'watchhentai.net',
      headers: {
        'Host': 'watchhentai.net',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://watchhentai.net/',
        'Accept': isImage
          ? 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
          : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 12000
    }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Koneksi ke WatchHentai timeout'));
    });
    req.end();
  });
}

export async function handleWatchHentai(sock, m, { jid, q, cmd }) {
  if (!q) {
    return sock.sendMessage(jid, {
      text: `Format: ${config.prefix}${cmd} <judul/kata kunci>\nContoh:\n• ${config.prefix}watchhentai overflow\n• ${config.prefix}whentai inaka\n• ${config.prefix}hentaisearch tsuma`
    }, { quoted: m });
  }

  await sock.sendMessage(jid, { text: `🔞 Mencari anime hentai "${q}" di WatchHentai...` }, { quoted: m });

  try {
    const path = `/?s=${encodeURIComponent(q.trim())}`;
    const rawHtmlBuf = await fetchWatchHentaiBuffer(path, false);
    const html = rawHtmlBuf.toString('utf8');

    const articleMatches = [...html.matchAll(/<article[^>]*>([\s\S]*?)<\/article>/gi)].map(m => m[1]);
    const results = [];

    for (const art of articleMatches) {
      const link = art.match(/href="([^"]+)"/i)?.[1] || '';
      const title = art.match(/alt="([^"]+)"/i)?.[1]
        || art.match(/title="([^"]+)"/i)?.[1]
        || art.match(/<h3><a[^>]*>([^<]+)<\/a><\/h3>/i)?.[1] || '';
      const poster = art.match(/data-src="([^"]+)"/i)?.[1]
        || art.match(/src="([^"]+\/uploads\/[^"]+)"/i)?.[1] || '';
      const year = art.match(/class="buttonyear"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/i)?.[1] || '-';
      const cens = art.match(/class="buttoncensured"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/i)?.[1] || '-';

      if (title && link && !results.some(r => r.link === link)) {
        results.push({ title, link, poster, year, cens });
      }
    }

    if (!results.length) {
      return await sock.sendMessage(jid, {
        text: `❌ Tidak ditemukan hasil di WatchHentai untuk kata kunci "${q}".`
      }, { quoted: m });
    }

    const first = results[0];
    let caption = `🔞 *[ WATCHHENTAI SEARCH ]*\n`;
    caption += `📖 *Judul*   : ${first.title}\n`;
    caption += `📅 *Rilis*   : ${first.year}\n`;
    caption += `🛡️ *Sensor*  : ${first.cens}\n`;
    caption += `🔗 *Link*    : ${first.link}\n`;
    caption += `────────────────────\n`;

    if (results.length > 1) {
      caption += `\n📑 *Hasil Lainnya:*`;
      results.slice(1, 6).forEach((item, idx) => {
        caption += `\n${idx + 2}. *${item.title}* (${item.year} | ${item.cens})\n   ${item.link}`;
      });
    }

    if (first.poster) {
      try {
        const imgBuf = await fetchWatchHentaiBuffer(first.poster, true);
        if (imgBuf && imgBuf.length > 1000) {
          return await sock.sendMessage(jid, { image: imgBuf, caption }, { quoted: m });
        }
      } catch {}
    }

    await sock.sendMessage(jid, { text: caption }, { quoted: m });
  } catch (err) {
    await sock.sendMessage(jid, { text: `[WATCHHENTAI ERROR] ${err.message}` }, { quoted: m });
  }
}



