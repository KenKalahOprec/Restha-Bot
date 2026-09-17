import config from '../../config.js';
import https from 'https';
import fs from 'fs';
import path from 'path';
import os from 'os';
import ytdlp from 'yt-dlp-exec';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { createPdfFromJpegs } from '../libs/manga.js';
import sharp from 'sharp';
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
  if (!q) {
    return sock.sendMessage(jid, {
      text: `┌── [ JAV DATABASE HELP ]\n│ • Format : ${config.prefix}javsearch <kode ID / nama aktris>\n│ • Contoh : ${config.prefix}javsearch SSIS-001\n└──`
    }, { quoted: m });
  }

  await sock.sendMessage(jid, {
    text: `┌── [ JAV DATABASE ]\n│ • Mencari data JAV untuk "${q}"...\n└──`
  }, { quoted: m });

  try {
    const trimmed = q.trim();
    const isCode = /^[a-zA-Z0-9]+-\d+$/i.test(trimmed);

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

            let caption = `┌── [ JAV DETAIL ]\n`;
            caption += `│ • ID       : ${trimmed.toUpperCase()}\n`;
            caption += `│ • Judul    : ${title}\n`;
            caption += `│ • Sinopsis : ${desc}\n`;
            if (trailer) caption += `│ • Trailer  : ${trailer}\n`;
            caption += `│ • Detail   : https://www.javdatabase.com/movies/${encodeURIComponent(trimmed.toLowerCase())}/\n`;
            caption += `└──`;

            const imgBuf = await fetchJavCover(cover);
            if (imgBuf) {
              return await sock.sendMessage(jid, { image: imgBuf, caption }, { quoted: m });
            }

            return await sock.sendMessage(jid, { text: caption }, { quoted: m });
          }
        }
      } catch {}
    }

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
      return await sock.sendMessage(jid, {
        text: `┌── [ NOT FOUND ]\n│ • Tidak ditemukan hasil untuk "${q}".\n│ • Gunakan kode ID (contoh: SSIS-001) atau nama model.\n└──`
      }, { quoted: m });
    }

    let listText = `┌── [ HASIL PENCARIAN JAV ]\n│ • Query : ${trimmed}\n│\n`;
    items.forEach((it, idx) => {
      listText += `│ • ${idx + 1}. [${it.id}] ${it.title}\n`;
      listText += `│   Studio : ${it.studio} | Rilis : ${it.date}\n`;
      listText += `│   Link   : ${it.url}\n`;
      if (idx < items.length - 1) listText += `│\n`;
    });
    listText += `└──`;

    const coverBuf = await fetchJavCover(items[0]?.thumb);
    if (coverBuf) {
      return await sock.sendMessage(jid, { image: coverBuf, caption: listText }, { quoted: m });
    }

    await sock.sendMessage(jid, { text: listText }, { quoted: m });
  } catch (err) {
    await sock.sendMessage(jid, {
      text: `┌── [ ERROR JAV ]\n│ • ${err.message}\n└──`
    }, { quoted: m });
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
  const searchUrl = isEn
    ? `https://budayabali.com/search?q=${encodeURIComponent(cleanQ)}`
    : `https://budayabali.com/id/search?q=${encodeURIComponent(cleanQ)}`;

  await sock.sendMessage(jid, { text: `🌺 Mencari artikel Budaya Bali (${langLabel}) untuk "${cleanQ}"...` }, { quoted: m });

  try {
    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(12000)
    });

    if (!res.ok) throw new Error('Gagal menghubungi server BudayaBali.com');
    const html = await res.text();

    const itemRegex = /<div[^>]*class="post-item"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
    let mItem;
    const articles = [];
    while ((mItem = itemRegex.exec(html)) !== null) {
      const block = mItem[1];
      const link = block.match(/<a[^>]+href="([^"]+)"/i)?.[1];
      const cover = block.match(/data-src="([^"]+)"/i)?.[1];
      const title = block.match(/alt="([^"]+)"/i)?.[1]
        || block.match(/<h3[^>]*class="title"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i)?.[1]?.replace(/<[^>]+>/g, '').trim();
      const author = block.match(/class="a-username"[^>]*>([\s\S]*?)<\/a>/i)?.[1]?.replace(/<[^>]+>/g, '').trim();
      const date = block.match(/<span[^>]*>([\s\S]*?)<\/span>/i)?.[1]?.trim();
      const desc = block.match(/<p[^>]*class="description"[^>]*>([\s\S]*?)<\/p>/i)?.[1]?.replace(/<[^>]+>/g, '').trim();

      if (link && title && !articles.some(a => a.link === link)) {
        articles.push({ link, cover, title, author, date, desc });
      }
    }

    if (!articles.length) {
      return await sock.sendMessage(jid, {
        text: `❌ Tidak ada artikel budaya ditemukan untuk "${cleanQ}". Coba kata kunci lain seperti: *tari*, *pura*, *desa*, *tradisi*.`
      }, { quoted: m });
    }

    const targetArticle = articles.find(a => a.title.toLowerCase().includes(cleanQ.toLowerCase())) || articles[0];

    let title = targetArticle.title;
    let snippet = targetArticle.desc || '';
    let author = targetArticle.author || 'budayabali.com';
    let published = targetArticle.date || '-';
    let coverUrl = targetArticle.cover || '';

    try {
      const artRes = await fetch(targetArticle.link, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(4000)
      });
      if (artRes.ok) {
        const artHtml = await artRes.text();
        const fullTitle = artHtml.match(/<meta property="og:title" content="([^"]+)"/)?.[1];
        if (fullTitle) title = fullTitle;

        const ogDesc = artHtml.match(/<meta property="og:description" content="([^"]+)"/)?.[1];
        const ogCover = artHtml.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
        if (ogCover) coverUrl = ogCover;
        const ogAuthor = artHtml.match(/<meta property="article:author" content="([^"]+)"/)?.[1];
        if (ogAuthor) author = ogAuthor;
        const ogPub = artHtml.match(/<meta property="article:published_time" content="([^"]+)"/)?.[1];
        if (ogPub) published = ogPub;

        const bodyMatch = artHtml.match(/<div[^>]*class="[^"]*post-text[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
          || artHtml.match(/<div[^>]*class="[^"]*text[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
          || artHtml.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

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
        } else if (ogDesc) {
          snippet = ogDesc;
        }
      }
    } catch {}

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

    if (coverUrl) {
      try {
        const imgRes = await fetch(coverUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(5000)
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

function whDecodeMediaUrl(s) {
  try {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const x = Buffer.from(s, 'base64').toString('binary');
    const k = 13;
    let r = '';
    for (let i = 0; i < x.length; i++) {
      r += String.fromCharCode(x.charCodeAt(i) ^ ((k + i % 17) & 255));
    }
    return Buffer.from(r.split('').reverse().join(''), 'base64').toString('utf8');
  } catch {
    return null;
  }
}

async function resolveWatchHentaiStream(urlOrQuery, requestedEp = null) {
  let targetEpUrl = '';
  let animeTitle = '';

  if (/^https?:\/\/watchhentai\.net\/videos\//i.test(urlOrQuery)) {
    targetEpUrl = urlOrQuery;
  } else if (/^https?:\/\/watchhentai\.net\/series\//i.test(urlOrQuery)) {
    const sBuf = await fetchWatchHentaiBuffer(urlOrQuery);
    const sHtml = sBuf.toString('utf8');
    const epLinks = [...new Set([...sHtml.matchAll(/href="([^"]*\/videos\/[^"]+)"/gi)].map(m => m[1]))];
    if (!epLinks.length) throw new Error('Tidak ada episode yang ditemukan di halaman seri ini.');
    if (requestedEp) {
      targetEpUrl = epLinks.find(l => l.includes(`episode-${requestedEp}`)) || epLinks[0];
    } else {
      targetEpUrl = epLinks[0];
    }
  } else if (/^https?:\/\/hstorage\.xyz\//i.test(urlOrQuery)) {
    return { streamUrl: urlOrQuery, title: 'WatchHentai Video', episodeUrl: urlOrQuery };
  } else {
    const sBuf = await fetchWatchHentaiBuffer(`/?s=${encodeURIComponent(urlOrQuery)}`);
    const sHtml = sBuf.toString('utf8');
    const articles = [...sHtml.matchAll(/<article[^>]*>([\s\S]*?)<\/article>/gi)].map(m => m[1]);
    if (!articles.length) throw new Error(`Tidak ditemukan anime di WatchHentai untuk "${urlOrQuery}"`);

    const firstArt = articles[0];
    const link = firstArt.match(/href="([^"]+)"/i)?.[1];
    animeTitle = firstArt.match(/alt="([^"]+)"/i)?.[1] || firstArt.match(/title="([^"]+)"/i)?.[1] || '';

    if (link && link.includes('/videos/')) {
      targetEpUrl = link;
    } else if (link) {
      const serBuf = await fetchWatchHentaiBuffer(link);
      const serHtml = serBuf.toString('utf8');
      const epLinks = [...new Set([...serHtml.matchAll(/href="([^"]*\/videos\/[^"]+)"/gi)].map(m => m[1]))];
      if (!epLinks.length) {
        targetEpUrl = link;
      } else if (requestedEp) {
        targetEpUrl = epLinks.find(l => l.includes(`episode-${requestedEp}`)) || epLinks[0];
      } else {
        targetEpUrl = epLinks[0];
      }
    } else {
      throw new Error(`Tidak ditemukan tautan anime untuk "${urlOrQuery}"`);
    }
  }

  const epBuf = await fetchWatchHentaiBuffer(targetEpUrl);
  const epHtml = epBuf.toString('utf8');

  const h1Match = epHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) {
    animeTitle = h1Match[1].replace(/<[^>]+>/g, '').replace(/&#8211;/g, '-').replace(/\s+/g, ' ').trim();
  }

  const playerUrls = [...epHtml.matchAll(/data-[a-z0-9-]*player-url="([^"]+)"/gi)].map(m => m[1]);

  let streamUrl = null;
  for (const pUrl of playerUrls) {
    try {
      const pBuf = await fetchWatchHentaiBuffer(pUrl);
      const pHtml = pBuf.toString('utf8');
      const encMatch = pHtml.match(/(?:whJwSources|whVjsSources)\s*=\s*\[\{.*?"file":"([^"]+)"/i)
        || pHtml.match(/jw\s*=\s*\{"file":"([^"]+)"/i)
        || pHtml.match(/"file":"([^"]+)"/i);
      if (encMatch) {
        const decoded = whDecodeMediaUrl(encMatch[1]);
        if (decoded && decoded.startsWith('http')) {
          streamUrl = decoded;
          break;
        }
      }
    } catch {}
  }

  if (!streamUrl) {
    const directMp4 = epHtml.match(/https?:\/\/hstorage\.xyz\/files\/[^\s"'<>]+\.mp4/i)
      || epHtml.match(/https?:\/\/[^\s"'<>]+\.(?:mp4|m3u8)/i);
    if (directMp4) streamUrl = directMp4[0];
  }

  if (!streamUrl) {
    throw new Error('Gagal mengekstrak tautan video dari WatchHentai');
  }

  return { streamUrl, title: animeTitle || 'WatchHentai Video', episodeUrl: targetEpUrl };
}

export async function handleWatchHentai(sock, m, { jid, q, cmd, args }) {
  const isDl = cmd.includes('dl') || args?.includes('--dl') || (args?.[0] || '').toLowerCase() === 'dl';

  if (!q && !isDl) {
    return sock.sendMessage(jid, {
      text: `┌── [ WATCHHENTAI HELP ]\n` +
        `│ • Cari anime & unduh video 360p langsung dari WatchHentai\n` +
        `│\n` +
        `│ • Format Cari  : ${config.prefix}${cmd} <judul/kata kunci>\n` +
        `│ • Format Unduh : ${config.prefix}whentaidl <judul / ep / link>\n` +
        `│   (atau: ${config.prefix}${cmd} dl <judul> [ep])\n` +
        `│\n` +
        `│ • Contoh Cari  : ${config.prefix}whentai inaka\n` +
        `│ • Contoh Unduh : ${config.prefix}whentaidl overflow\n` +
        `│ • Contoh Episode: ${config.prefix}whentai dl mankitsu 2\n` +
        `│ • Link Langsung: ${config.prefix}whentaidl https://watchhentai.net/videos/...\n` +
        `└──`
    }, { quoted: m });
  }

  // ─── MODE DOWNLOAD (360p) ───
  if (isDl) {
    let rawTarget = q ? q.replace(/--dl/g, '').replace(/^\s*dl\s+/i, '').replace(/\s+dl\s*$/i, '').trim() : '';
    if (!rawTarget) {
      return sock.sendMessage(jid, {
        text: `┌── [ WATCHHENTAI DOWNLOADER ]\n` +
          `│ • Masukkan judul anime atau tautan episode (360p)\n` +
          `│\n` +
          `│ • Contoh Judul   : ${config.prefix}whentaidl overflow\n` +
          `│ • Contoh Episode : ${config.prefix}whentai dl mankitsu 2\n` +
          `│ • Link Langsung  : ${config.prefix}whentaidl https://watchhentai.net/videos/...\n` +
          `└──`
      }, { quoted: m });
    }

    let targetQuery = rawTarget;
    let requestedEp = null;

    if (!/^https?:\/\//i.test(rawTarget)) {
      const epMatch = rawTarget.match(/\b(?:ep|eps|episode)\s*(\d+)\b/i) || rawTarget.match(/\s+(\d+)$/);
      if (epMatch) {
        requestedEp = parseInt(epMatch[1], 10);
        targetQuery = rawTarget.replace(epMatch[0], '').trim();
      }
    }

    await sock.sendMessage(jid, {
      text: `┌── [ EXTRACTING HENTAI ]\n│ • Target : ${targetQuery}${requestedEp ? ` (Episode ${requestedEp})` : ''}\n│ • Status : Mencari episode & stream...\n└──`
    }, { quoted: m });

    try {
      const { streamUrl, title, episodeUrl } = await resolveWatchHentaiStream(targetQuery, requestedEp);

      await sock.sendMessage(jid, {
        text: `┌── [ DOWNLOADING 360P ]\n│ • Judul    : ${title}\n│ • Kualitas : 360p (Cepat & Hemat Kuota)\n│ • Status   : Sedang mengunduh video...\n└──`
      }, { quoted: m });

      const { buffer, meta } = await downloadAdultVideo360p(streamUrl, {
        referer: 'https://watchhentai.net/',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });

      const videoTitle = title || meta?.title || 'WatchHentai_Video';
      const duration = meta?.duration_string || (meta?.duration ? `${meta.duration}s` : '-');
      const cleanTitle = videoTitle.replace(/[\\/:*?"<>|]/g, '_').slice(0, 60);
      const sizeMb = (buffer.length / (1024 * 1024)).toFixed(2);

      const caption = `┌── [ WATCHHENTAI VIDEO 360P ]\n` +
        `│ • Judul   : ${videoTitle}\n` +
        `│ • Durasi  : ${duration}\n` +
        `│ • Ukuran  : ${sizeMb} MB\n` +
        `│ • Sumber  : ${episodeUrl}\n` +
        `└──`;

      if (buffer.length <= 64 * 1024 * 1024) {
        return await sock.sendMessage(jid, { video: buffer, caption }, { quoted: m });
      } else if (buffer.length <= 100 * 1024 * 1024) {
        return await sock.sendMessage(jid, {
          document: buffer,
          mimetype: 'video/mp4',
          fileName: `${cleanTitle}.mp4`,
          caption
        }, { quoted: m });
      } else {
        return await sock.sendMessage(jid, {
          text: `┌── [ FILE LIMIT EXCEEDED ]\n│ • Ukuran video melebihi batas 100 MB (${sizeMb} MB)\n│ • Tautan Stream : ${streamUrl}\n│ • Sumber : ${episodeUrl}\n└──`
        }, { quoted: m });
      }
    } catch (err) {
      return await sock.sendMessage(jid, {
        text: `┌── [ DOWNLOAD ERROR ]\n│ • Gagal memproses video WatchHentai\n│ • ${err.message}\n└──`
      }, { quoted: m });
    }
  }

  // ─── MODE PENCARIAN BIASA ───
  await sock.sendMessage(jid, {
    text: `┌── [ WATCHHENTAI ]\n│ • Mencari anime hentai "${q}"...\n└──`
  }, { quoted: m });

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
        text: `┌── [ NOT FOUND ]\n│ • Tidak ditemukan hasil di WatchHentai untuk kata kunci "${q}".\n└──`
      }, { quoted: m });
    }

    const first = results[0];
    let caption = `┌── [ WATCHHENTAI SEARCH ]\n`;
    caption += `│ • Judul  : ${first.title}\n`;
    caption += `│ • Rilis  : ${first.year}\n`;
    caption += `│ • Sensor : ${first.cens}\n`;
    caption += `│ • Link   : ${first.link}\n`;
    caption += `│ • Unduh  : ${config.prefix}whentaidl ${first.link}\n`;

    if (results.length > 1) {
      caption += `│\n│ [ HASIL LAINNYA ]\n`;
      results.slice(1, 6).forEach((item, idx) => {
        caption += `│ • ${idx + 2}. ${item.title} (${item.year} | ${item.cens})\n│   ${item.link}\n`;
      });
    }
    caption += `└──`;

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
    await sock.sendMessage(jid, {
      text: `┌── [ WATCHHENTAI ERROR ]\n│ • ${err.message}\n└──`
    }, { quoted: m });
  }
}

// Helper download video 18+ resolusi 360p
export async function downloadAdultVideo360p(targetUrl, customOptions = {}) {
  const tmpOut = path.join(os.tmpdir(), `adult360_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`);
  
  const isWatchHentai = targetUrl.includes('watchhentai.net') || targetUrl.includes('hstorage.xyz');
  const baseOptions = {
    noPlaylist: true,
    ...(isWatchHentai ? {
      referer: 'https://watchhentai.net/',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    } : {}),
    ...customOptions
  };

  let meta = null;
  try {
    meta = await ytdlp(targetUrl, { dumpSingleJson: true, ...baseOptions });
  } catch {}

  const ffmpegBin = (ffmpegInstaller?.path && fs.existsSync(ffmpegInstaller.path)) ? ffmpegInstaller.path : 'ffmpeg';

  await ytdlp(targetUrl, {
    format: '18/best[height<=360][ext=mp4]/bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360]/best',
    ffmpegLocation: ffmpegBin,
    output: tmpOut,
    concurrentFragments: 6,
    remuxVideo: 'mp4',
    postprocessorArgs: ['ffmpeg:-movflags +faststart'],
    ...baseOptions
  });

  const buffer = await fs.promises.readFile(tmpOut);
  await fs.promises.unlink(tmpOut).catch(() => {});
  return { buffer, meta };
}

// ─── Lustpress (R18 Video Search & 360p Downloader: Eporner, XNXX, PornHub) ─
export async function handleLustpress(sock, m, { jid, q, cmd, args }) {
  const isDl = cmd.includes('dl') || args?.includes('--dl') || (args?.[0] || '').toLowerCase() === 'dl';

  if (!q && !isDl) {
    return sock.sendMessage(jid, {
      text: `┌── [ LUSTPRESS 18+ AGGREGATOR ]\n` +
        `│ • Pencarian & unduh video multi-provider dalam satu endpoint\n` +
        `│\n` +
        `│ • Format Cari  : ${config.prefix}${cmd} [provider] <kata kunci>\n` +
        `│ • Format Unduh : ${config.prefix}lpdl <url / query>\n` +
        `│\n` +
        `│ [ PROVIDER LIST ]\n` +
        `│ 1. eporner (default, HD + thumbnail)\n` +
        `│    Cari  : ${config.prefix}${cmd} cosplay\n` +
        `│    Unduh : ${config.prefix}lpdl cosplay (atau ${config.prefix}epornerdl <query>)\n` +
        `│\n` +
        `│ 2. xnxx (database xnxx)\n` +
        `│    Cari  : ${config.prefix}${cmd} xnxx makima\n` +
        `│    Unduh : ${config.prefix}xnxxdl makima\n` +
        `│\n` +
        `│ 3. pornhub / ph (database pornhub)\n` +
        `│    Cari  : ${config.prefix}${cmd} ph anime\n` +
        `│    Unduh : ${config.prefix}phdl anime\n` +
        `│\n` +
        `│ • Shortcuts: .xnxx, .pornhub, .eporner, .lpdl, .xnxxdl, .phdl, .epornerdl\n` +
        `└──`
    }, { quoted: m });
  }

  // ─── MODE DOWNLOAD (360p) ───
  if (isDl) {
    let rawTarget = q ? q.replace(/--dl/g, '').replace(/\bdl\b/gi, '').trim() : '';
    if (!rawTarget) {
      return sock.sendMessage(jid, {
        text: `┌── [ LUSTPRESS DOWNLOADER ]\n` +
          `│ • Masukkan tautan video atau kata kunci pencarian (360p)\n` +
          `│\n` +
          `│ • Link langsung : ${config.prefix}lpdl https://www.eporner.com/video-...\n` +
          `│ • Cari otomatis : ${config.prefix}lpdl cosplay\n` +
          `│ • XNXX          : ${config.prefix}xnxxdl makima\n` +
          `└──`
      }, { quoted: m });
    }

    let targetUrl = '';
    let dlProvider = 'eporner';

    if (/^https?:\/\//i.test(rawTarget)) {
      targetUrl = rawTarget;
      if (targetUrl.includes('xnxx.com')) dlProvider = 'xnxx';
      else if (targetUrl.includes('pornhub.com')) dlProvider = 'pornhub';
      else if (targetUrl.includes('eporner.com')) dlProvider = 'eporner';
      else dlProvider = 'video';
    } else {
      const firstW = (args?.[0] || '').toLowerCase();
      if (cmd.includes('xnxx') || firstW === 'xnxx') {
        dlProvider = 'xnxx';
        rawTarget = rawTarget.replace(/\bxnxx\b/gi, '').trim();
      } else if (cmd.includes('ph') || cmd.includes('pornhub') || firstW === 'ph' || firstW === 'pornhub') {
        dlProvider = 'pornhub';
        rawTarget = rawTarget.replace(/\b(pornhub|ph)\b/gi, '').trim();
      } else if (cmd.includes('eporner') || firstW === 'eporner') {
        dlProvider = 'eporner';
        rawTarget = rawTarget.replace(/\beporner\b/gi, '').trim();
      }

      await sock.sendMessage(jid, {
        text: `┌── [ SEARCHING VIDEO ]\n│ • Provider : ${dlProvider.toUpperCase()}\n│ • Query    : ${rawTarget}\n└──`
      }, { quoted: m });

      try {
        if (dlProvider === 'xnxx') {
          const sRes = await fetch(`https://r.jina.ai/https://www.xnxx.com/search/${encodeURIComponent(rawTarget)}`, { signal: AbortSignal.timeout(15000) });
          const sText = await sRes.text();
          const match = sText.match(/https:\/\/www\.xnxx\.com\/video-[^\s\)]+/);
          if (!match) throw new Error(`Tidak ditemukan video di XNXX untuk "${rawTarget}"`);
          targetUrl = match[0];
        } else if (dlProvider === 'pornhub') {
          const sRes = await fetch(`https://r.jina.ai/https://www.pornhub.com/video/search?search=${encodeURIComponent(rawTarget)}`, { signal: AbortSignal.timeout(15000) });
          const sText = await sRes.text();
          const match = sText.match(/https:\/\/www\.pornhub\.com\/view_video\.php\?viewkey=[a-zA-Z0-9]+/);
          if (!match) throw new Error(`Tidak ditemukan video di PornHub untuk "${rawTarget}"`);
          targetUrl = match[0];
        } else {
          const sRes = await fetch(`https://www.eporner.com/api/v2/video/search/?query=${encodeURIComponent(rawTarget)}&per_page=1`, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(10000)
          });
          const sData = await sRes.json();
          if (!sData?.videos?.length) throw new Error(`Tidak ditemukan video di Eporner untuk "${rawTarget}"`);
          targetUrl = sData.videos[0].url;
        }
      } catch (err) {
        return sock.sendMessage(jid, {
          text: `┌── [ DOWNLOAD ERROR ]\n│ • Gagal menemukan URL video\n│ • ${err.message}\n└──`
        }, { quoted: m });
      }
    }

    await sock.sendMessage(jid, {
      text: `┌── [ DOWNLOADING 360P ]\n│ • Provider : ${dlProvider.toUpperCase()}\n│ • URL      : ${targetUrl}\n│ • Kualitas : 360p (Cepat & Hemat Kuota)\n│ • Status   : Sedang mengunduh...\n└──`
    }, { quoted: m });

    try {
      const { buffer, meta } = await downloadAdultVideo360p(targetUrl);
      const title = meta?.title || `${dlProvider}_video`;
      const duration = meta?.duration_string || (meta?.duration ? `${meta.duration}s` : '-');
      const cleanTitle = title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 60);
      const sizeMb = (buffer.length / (1024 * 1024)).toFixed(2);

      const caption = `┌── [ LUSTPRESS VIDEO 360P ]\n` +
        `│ • Judul   : ${title}\n` +
        `│ • Durasi  : ${duration}\n` +
        `│ • Ukuran  : ${sizeMb} MB\n` +
        `│ • Sumber  : ${targetUrl}\n` +
        `└──`;

      if (buffer.length <= 64 * 1024 * 1024) {
        return await sock.sendMessage(jid, { video: buffer, caption }, { quoted: m });
      } else if (buffer.length <= 100 * 1024 * 1024) {
        return await sock.sendMessage(jid, {
          document: buffer,
          mimetype: 'video/mp4',
          fileName: `${cleanTitle}.mp4`,
          caption
        }, { quoted: m });
      } else {
        return await sock.sendMessage(jid, {
          text: `┌── [ FILE LIMIT EXCEEDED ]\n│ • Ukuran video melebihi batas 100 MB (${sizeMb} MB)\n│ • Tautan : ${targetUrl}\n└──`
        }, { quoted: m });
      }
    } catch (err) {
      return await sock.sendMessage(jid, {
        text: `┌── [ DOWNLOAD ERROR ]\n│ • Gagal mengunduh video\n│ • ${err.message}\n└──`
      }, { quoted: m });
    }
  }

  // Deteksi provider dari prefix command atau argument pertama
  let provider = 'eporner';
  let query = q.trim();

  const firstWord = (args?.[0] || '').toLowerCase();
  if (['xnxx', 'ph', 'pornhub', 'eporner'].includes(firstWord)) {
    provider = (firstWord === 'ph') ? 'pornhub' : firstWord;
    query = args.slice(1).join(' ').trim();
  } else if (cmd === 'xnxx') {
    provider = 'xnxx';
  } else if (cmd === 'pornhub' || cmd === 'ph') {
    provider = 'pornhub';
  } else if (cmd === 'eporner') {
    provider = 'eporner';
  }

  if (!query) {
    return sock.sendMessage(jid, {
      text: `┌── [ QUERY REQUIRED ]\n│ • Masukkan kata kunci pencarian untuk provider ${provider.toUpperCase()}\n└──`
    }, { quoted: m });
  }

  await sock.sendMessage(jid, {
    text: `┌── [ SEARCHING ]\n│ • Provider : ${provider.toUpperCase()}\n│ • Query    : ${query}\n└──`
  }, { quoted: m });

  // 1. PROVIDER: XNXX
  if (provider === 'xnxx') {
    try {
      const searchUrl = `https://r.jina.ai/https://www.xnxx.com/search/${encodeURIComponent(query)}`;
      const res = await fetch(searchUrl, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error('Gagal mengambil data dari XNXX');

      const text = await res.text();
      const videoRegex = /\[!\[Image \d+\]\(([^\)]+)\)\]\((https:\/\/www\.xnxx\.com\/video-[^\)]+)\)\s*\[([^\]]+)\]/gi;
      let match;
      const items = [];
      while ((match = videoRegex.exec(text)) !== null && items.length < 5) {
        items.push({
          thumb: match[1],
          url: match[2],
          title: match[3].trim()
        });
      }

      if (!items.length) {
        const simpleRegex = /\[([^\]]+)\]\((https:\/\/www\.xnxx\.com\/video-[^\)]+)\)/gi;
        while ((match = simpleRegex.exec(text)) !== null && items.length < 5) {
          if (!items.some(i => i.url === match[2])) {
            items.push({ thumb: null, url: match[2], title: match[1].trim() });
          }
        }
      }

      if (!items.length) {
        return sock.sendMessage(jid, {
          text: `┌── [ NOT FOUND ]\n│ • Tidak ditemukan video di XNXX untuk "${query}".\n└──`
        }, { quoted: m });
      }

      let caption = `┌── [ XNXX SEARCH: ${query} ]\n`;
      items.forEach((it, idx) => {
        caption += `│ • ${idx + 1}. ${it.title}\n│   ${it.url}\n`;
      });
      caption += `│\n│ • Unduh 360p : ${config.prefix}lpdl <url>\n└──`;

      if (items[0]?.thumb) {
        try {
          const tRes = await fetch(items[0].thumb, { signal: AbortSignal.timeout(8000) });
          if (tRes.ok) {
            const buf = Buffer.from(await tRes.arrayBuffer());
            return await sock.sendMessage(jid, { image: buf, caption }, { quoted: m });
          }
        } catch {}
      }

      return await sock.sendMessage(jid, { text: caption }, { quoted: m });
    } catch (err) {
      return await sock.sendMessage(jid, {
        text: `┌── [ XNXX ERROR ]\n│ • ${err.message}\n└──`
      }, { quoted: m });
    }
  }

  // 2. PROVIDER: PORNHUB
  if (provider === 'pornhub') {
    try {
      const searchUrl = `https://r.jina.ai/https://www.pornhub.com/video/search?search=${encodeURIComponent(query)}`;
      const res = await fetch(searchUrl, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error('Gagal mengambil data dari PornHub');

      const text = await res.text();
      const videoRegex = /\[!\[Image \d*\]\(([^\)]+)\)\]\((https:\/\/www\.pornhub\.com\/view_video\.php\?viewkey=[a-zA-Z0-9]+)\)\s*\[([^\]]+)\]/gi;
      let match;
      const items = [];
      while ((match = videoRegex.exec(text)) !== null && items.length < 5) {
        items.push({
          thumb: match[1],
          url: match[2],
          title: match[3].trim()
        });
      }

      if (!items.length) {
        const phRegex = /\[([^\]]+)\]\((https:\/\/www\.pornhub\.com\/view_video\.php\?viewkey=[a-zA-Z0-9]+)\)/gi;
        while ((match = phRegex.exec(text)) !== null && items.length < 5) {
          if (!items.some(i => i.url === match[2])) {
            items.push({ thumb: null, url: match[2], title: match[1].trim() });
          }
        }
      }

      if (!items.length) {
        return sock.sendMessage(jid, {
          text: `┌── [ NOT FOUND ]\n│ • Tidak ditemukan video di PornHub untuk "${query}".\n└──`
        }, { quoted: m });
      }

      let caption = `┌── [ PORNHUB SEARCH: ${query} ]\n`;
      items.forEach((it, idx) => {
        caption += `│ • ${idx + 1}. ${it.title}\n│   ${it.url}\n`;
      });
      caption += `│\n│ • Unduh 360p : ${config.prefix}lpdl <url>\n└──`;

      if (items[0]?.thumb) {
        try {
          const tRes = await fetch(items[0].thumb, { signal: AbortSignal.timeout(8000) });
          if (tRes.ok) {
            const buf = Buffer.from(await tRes.arrayBuffer());
            return await sock.sendMessage(jid, { image: buf, caption }, { quoted: m });
          }
        } catch {}
      }

      return await sock.sendMessage(jid, { text: caption }, { quoted: m });
    } catch (err) {
      return await sock.sendMessage(jid, {
        text: `┌── [ PORNHUB ERROR ]\n│ • ${err.message}\n└──`
      }, { quoted: m });
    }
  }

  // 3. PROVIDER DEFAULT: EPORNER
  try {
    const res = await fetch(`https://www.eporner.com/api/v2/video/search/?query=${encodeURIComponent(query)}&per_page=5`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const videos = data?.videos || [];

    if (!videos.length) {
      return sock.sendMessage(jid, {
        text: `┌── [ NOT FOUND ]\n│ • Tidak ada video ditemukan di Eporner untuk "${query}".\n└──`
      }, { quoted: m });
    }

    const first = videos[0];
    let text = `┌── [ EPORNER SEARCH: ${query} ]\n`;
    text += `│ • 1. ${first.title}\n`;
    text += `│   Durasi : ${first.length_min || '-'}\n`;
    text += `│   Views  : ${first.views?.toLocaleString('id-ID') || '-'}\n`;
    text += `│   Rating : ${first.rate || '0'}\n`;
    text += `│   URL    : ${first.url}\n`;

    if (videos.length > 1) {
      text += `│\n│ [ VIDEO LAINNYA ]\n`;
      videos.slice(1).forEach((v, idx) => {
        text += `│ • ${idx + 2}. ${v.title} (${v.length_min || '-'} | ${v.views?.toLocaleString('id-ID') || '-'} views)\n│   ${v.url}\n`;
      });
    }

    text += `│\n│ • Unduh 360p : ${config.prefix}lpdl <url>\n└──`;

    const thumbUrl = first.default_thumb?.src || first.thumbs?.[0]?.src;
    if (thumbUrl) {
      try {
        const thumbRes = await fetch(thumbUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) });
        if (thumbRes.ok) {
          const imgBuf = Buffer.from(await thumbRes.arrayBuffer());
          return await sock.sendMessage(jid, { image: imgBuf, caption: text }, { quoted: m });
        }
      } catch {}
    }

    await sock.sendMessage(jid, { text }, { quoted: m });
  } catch (err) {
    await sock.sendMessage(jid, {
      text: `┌── [ EPORNER ERROR ]\n│ • ${err.message}\n└──`
    }, { quoted: m });
  }
}

// Helper generator PDF nHentai (Optimized & Compressed)
async function generateNhentaiPdf(code) {
  const res = await fetch(`https://r.jina.ai/https://nhentai.net/g/${code}/1/`, {
    signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) throw new Error(`Gagal membuka halaman pembaca nhentai #${code}`);

  const text = await res.text();
  const titleMatch = text.match(/^Title:\s*(.+?)(?:\s*-\s*Page\s*\d+)?$/m);
  const title = titleMatch ? titleMatch[1].trim() : `nhentai_${code}`;

  const pagesMatch = text.match(/1\s+of\s+(\d+)/i);
  const totalPages = pagesMatch ? parseInt(pagesMatch[1], 10) : 0;

  const imgMatch = text.match(/https:\/\/[ti]\d*\.nhentai\.net\/galleries\/(\d+)\/1\.([a-zA-Z0-9]+)/);
  if (!imgMatch || !totalPages) {
    throw new Error(`Informasi galeri nhentai #${code} tidak dapat dideteksi`);
  }

  const mediaId = imgMatch[1];
  const defaultExt = imgMatch[2];

  const pages = new Array(totalPages).fill(null);
  const BATCH_SIZE = 10;

  async function downloadPage(pageNum) {
    const exts = [defaultExt, 'webp', 'jpg', 'png'].filter((v, i, a) => a.indexOf(v) === i);
    for (const ext of exts) {
      try {
        const url = `https://i.nhentai.net/galleries/${mediaId}/${pageNum}.${ext}`;
        const pRes = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(10000)
        });
        if (pRes.ok) {
          const rawBuf = Buffer.from(await pRes.arrayBuffer());
          const processed = await sharp(rawBuf)
            .resize({ width: 1080, withoutEnlargement: true })
            .jpeg({ quality: 70, mozjpeg: true })
            .toBuffer({ resolveWithObject: true });
          return {
            pageNum,
            buffer: processed.data,
            width: processed.info.width,
            height: processed.info.height
          };
        }
      } catch (e) {}
    }
    return null;
  }

  for (let i = 1; i <= totalPages; i += BATCH_SIZE) {
    const batch = [];
    for (let j = i; j < i + BATCH_SIZE && j <= totalPages; j++) {
      batch.push(downloadPage(j));
    }
    const results = await Promise.all(batch);
    for (const r of results) {
      if (r) pages[r.pageNum - 1] = r;
    }
  }

  const validPages = pages.filter(Boolean);
  if (validPages.length === 0) throw new Error('Gagal mengunduh halaman doujin');

  const pdfBuf = createPdfFromJpegs(validPages);
  return { title, totalPages: validPages.length, pdfBuf };
}

// ─── Tomoe (R18 Doujinshi / Manga: NHentai, Pururin, HentaiFox) ─────────────
export async function handleTomoe(sock, m, { jid, q, cmd, args }) {
  if (!q && !cmd.includes('pdf')) {
    return sock.sendMessage(jid, {
      text: `┌── [ TOMOE 18+ DOUJINSHI AGGREGATOR ]\n` +
        `│ • Pencarian & detail doujinshi multi-provider dalam satu endpoint\n` +
        `│\n` +
        `│ • Format : ${config.prefix}${cmd} [provider] <kata kunci / kode>\n` +
        `│\n` +
        `│ [ PROVIDER LIST ]\n` +
        `│ 1. nhentai / nh (default)\n` +
        `│    Cari : ${config.prefix}${cmd} genshin\n` +
        `│    Kode : ${config.prefix}${cmd} nh 681176\n` +
        `│\n` +
        `│ 2. pururin\n` +
        `│    Cari : ${config.prefix}${cmd} pururin genshin\n` +
        `│    Kode : ${config.prefix}${cmd} pururin 67870\n` +
        `│\n` +
        `│ 3. hentaifox / hfox\n` +
        `│    Cari : ${config.prefix}${cmd} hentaifox genshin\n` +
        `│    Kode : ${config.prefix}${cmd} hfox 172872\n` +
        `│\n` +
        `│ 4. Download PDF\n` +
        `│    Unduh : ${config.prefix}nhpdf 681176\n` +
        `│\n` +
        `│ • Shortcuts: .nhentai, .nh, .nhpdf, .pururin, .hentaifox, .hfox\n` +
        `└──`
    }, { quoted: m });
  }

  // Deteksi mode PDF
  const isPdf = cmd.includes('pdf') || args?.includes('--pdf') || (args?.[0] || '').toLowerCase() === 'pdf';
  if (isPdf) {
    const rawTarget = q ? q.replace(/--pdf/g, '').replace(/\bpdf\b/gi, '').trim() : '';
    const codeMatch = rawTarget.match(/\b\d{4,7}\b/);
    if (!codeMatch) {
      return sock.sendMessage(jid, {
        text: `┌── [ INPUT INVALID ]\n│ • Masukkan kode nHentai yang valid untuk diunduh sebagai PDF\n│ • Contoh : ${config.prefix}nhpdf 681176\n└──`
      }, { quoted: m });
    }

    const code = codeMatch[0];
    await sock.sendMessage(jid, {
      text: `┌── [ COMPILING PDF ]\n│ • Kode   : #${code}\n│ • Status : Sedang mengunduh halaman & menyusun PDF...\n└──`
    }, { quoted: m });

    try {
      const { title, totalPages, pdfBuf } = await generateNhentaiPdf(code);
      const cleanTitle = title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 70);
      const sizeMb = (pdfBuf.length / (1024 * 1024)).toFixed(2);

      return await sock.sendMessage(jid, {
        document: pdfBuf,
        mimetype: 'application/pdf',
        fileName: `${cleanTitle}.pdf`,
        caption: `┌── [ NHENTAI PDF COMPLETED ]\n` +
          `│ • Judul  : ${title}\n` +
          `│ • Kode   : #${code}\n` +
          `│ • Total  : ${totalPages} Halaman\n` +
          `│ • Ukuran : ${sizeMb} MB\n` +
          `└──`
      }, { quoted: m });
    } catch (err) {
      return await sock.sendMessage(jid, {
        text: `┌── [ PDF ERROR ]\n│ • Gagal membuat PDF untuk #${code}\n│ • ${err.message}\n└──`
      }, { quoted: m });
    }
  }

  // Deteksi provider dari prefix command atau argument pertama
  let provider = 'nhentai';
  let query = q.trim();

  const firstWord = (args?.[0] || '').toLowerCase();
  if (['nh', 'nhentai', 'pururin', 'hentaifox', 'hfox'].includes(firstWord)) {
    if (firstWord === 'nh') provider = 'nhentai';
    else if (firstWord === 'hfox') provider = 'hentaifox';
    else provider = firstWord;
    query = args.slice(1).join(' ').trim();
  } else if (cmd === 'nhentai' || cmd === 'nh') {
    provider = 'nhentai';
  } else if (cmd === 'pururin') {
    provider = 'pururin';
  } else if (cmd === 'hentaifox' || cmd === 'hfox') {
    provider = 'hentaifox';
  }

  if (!query) {
    return sock.sendMessage(jid, {
      text: `┌── [ QUERY REQUIRED ]\n│ • Masukkan kata kunci atau kode doujin untuk provider ${provider.toUpperCase()}\n└──`
    }, { quoted: m });
  }

  await sock.sendMessage(jid, {
    text: `┌── [ SEARCHING ]\n│ • Provider : ${provider.toUpperCase()}\n│ • Target   : ${query}\n└──`
  }, { quoted: m });

  const cleanLinks = (str) => str ? str.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1, ').replace(/,\s*$/, '') : '-';

  const sendResult = async (caption, thumbUrl) => {
    if (thumbUrl) {
      try {
        const tRes = await fetch(thumbUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(8000)
        });
        if (tRes.ok) {
          const buf = Buffer.from(await tRes.arrayBuffer());
          return await sock.sendMessage(jid, { image: buf, caption }, { quoted: m });
        }
      } catch {}
    }
    return await sock.sendMessage(jid, { text: caption }, { quoted: m });
  };

  // 1. PROVIDER: NHENTAI
  if (provider === 'nhentai') {
    try {
      const codeMatch = query.match(/\b\d{5,7}\b/);
      const isCode = /^\d+$/.test(query) || (codeMatch && query.includes('nhentai.net/g/'));

      if (isCode) {
        const code = codeMatch ? codeMatch[0] : query;
        const res = await fetch(`https://r.jina.ai/https://nhentai.net/g/${code}/`, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) throw new Error(`Gagal memuat galeri nhentai #${code}`);

        const text = await res.text();
        const fullTitle = text.match(/#\s+(\[[^\]]+\][^\n]+)/)?.[1] || text.match(/^Title:\s*([^\n]+)/m)?.[1] || `#${code}`;
        const cover = text.match(/\[!\[Image \d+:[^\]]*\]\((https:\/\/t\d*\.nhentai\.net\/galleries\/\d+\/[^\)]+)\)\]/)?.[1];
        const parodies = cleanLinks(text.match(/Parodies:\s*([^\n]+)/)?.[1]);
        const characters = cleanLinks(text.match(/Characters:\s*([^\n]+)/)?.[1]);
        const tags = cleanLinks(text.match(/Tags:\s*([^\n]+)/)?.[1]);
        const artists = cleanLinks(text.match(/Artists:\s*([^\n]+)/)?.[1]);
        const languages = cleanLinks(text.match(/Languages:\s*([^\n]+)/)?.[1]);
        const pages = text.match(/Pages:\s*\[?(\d+)\]?/)?.[1] || '-';

        let caption = `┌── [ NHENTAI: #${code} ]\n`;
        caption += `│ • Judul     : ${fullTitle}\n`;
        caption += `│ • Artist    : ${artists}\n`;
        caption += `│ • Parodi    : ${parodies}\n`;
        caption += `│ • Karakter  : ${characters}\n`;
        caption += `│ • Bahasa    : ${languages}\n`;
        caption += `│ • Halaman   : ${pages}\n`;
        caption += `│ • Tags      : ${tags}\n`;
        caption += `│ • Link      : https://nhentai.net/g/${code}/\n`;
        caption += `│\n│ • Unduh PDF : ${config.prefix}nhpdf ${code}\n└──`;

        return await sendResult(caption, cover);
      }

      const res = await fetch(`https://r.jina.ai/https://nhentai.net/search/?q=${encodeURIComponent(query)}`, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error('Gagal mencari di nHentai');

      const text = await res.text();
      const items = [];
      const lines = text.split('\n');
      for (const line of lines) {
        const m = line.match(/\((https:\/\/t\d+\.nhentai\.net\/galleries\/\d+\/[^\)]+)\)\s*(.+?)\]\((https:\/\/nhentai\.net\/g\/(\d+)\/)\)/);
        if (m && !items.some(x => x.code === m[4])) {
          items.push({ thumb: m[1], title: m[2].trim(), url: m[3], code: m[4] });
          if (items.length >= 5) break;
        }
      }

      if (!items.length) {
        return sock.sendMessage(jid, {
          text: `┌── [ NOT FOUND ]\n│ • Tidak ditemukan doujin di nHentai untuk "${query}".\n└──`
        }, { quoted: m });
      }

      let caption = `┌── [ NHENTAI SEARCH: ${query} ]\n`;
      items.forEach((it, idx) => {
        caption += `│ • ${idx + 1}. ${it.title}\n│   Code: #${it.code} | Link: ${it.url}\n`;
      });
      caption += `│\n│ • Detail : ${config.prefix}nh <kode>\n└──`;

      return await sendResult(caption, items[0]?.thumb);
    } catch (err) {
      return await sock.sendMessage(jid, {
        text: `┌── [ NHENTAI ERROR ]\n│ • ${err.message}\n└──`
      }, { quoted: m });
    }
  }

  // 2. PROVIDER: PURURIN
  if (provider === 'pururin') {
    try {
      const codeMatch = query.match(/\b\d{4,6}\b/);
      const isCode = /^\d+$/.test(query) || (codeMatch && query.includes('pururin.me/gallery/'));

      if (isCode) {
        const code = codeMatch ? codeMatch[0] : query;
        const res = await fetch(`https://r.jina.ai/https://pururin.me/gallery/${code}`, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) throw new Error(`Gagal memuat galeri Pururin #${code}`);

        const text = await res.text();
        const title = text.match(/^Title:\s*([^\n]+)/m)?.[1] || `#${code}`;
        const cover = text.match(/\((https:\/\/i\.pururin\.me\/[^\)]+)\)/)?.[1];

        let caption = `┌── [ PURURIN: #${code} ]\n`;
        caption += `│ • Judul : ${title}\n`;
        caption += `│ • Kode  : #${code}\n`;
        caption += `│ • Link  : https://pururin.me/gallery/${code}\n└──`;

        return await sendResult(caption, cover);
      }

      const res = await fetch(`https://r.jina.ai/https://pururin.me/search?q=${encodeURIComponent(query)}`, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error('Gagal mencari di Pururin');

      const text = await res.text();
      const items = [];
      const pururinRegex = /\((https:\/\/i\.pururin\.me\/[^\)]+)\)\s*##\s*([^\]]+)\]\((https:\/\/pururin\.me\/gallery\/(\d+)[^\s"\)]*)/g;
      let match;
      while ((match = pururinRegex.exec(text)) !== null && items.length < 5) {
        if (!items.some(x => x.code === match[4])) {
          items.push({ thumb: match[1], title: match[2].trim(), url: match[3], code: match[4] });
        }
      }

      if (!items.length) {
        return sock.sendMessage(jid, {
          text: `┌── [ NOT FOUND ]\n│ • Tidak ditemukan doujin di Pururin untuk "${query}".\n└──`
        }, { quoted: m });
      }

      let caption = `┌── [ PURURIN SEARCH: ${query} ]\n`;
      items.forEach((it, idx) => {
        caption += `│ • ${idx + 1}. ${it.title}\n│   Code: #${it.code} | Link: ${it.url}\n`;
      });
      caption += `│\n│ • Detail : ${config.prefix}pururin <kode>\n└──`;

      return await sendResult(caption, items[0]?.thumb);
    } catch (err) {
      return await sock.sendMessage(jid, {
        text: `┌── [ PURURIN ERROR ]\n│ • ${err.message}\n└──`
      }, { quoted: m });
    }
  }

  // 3. PROVIDER: HENTAIFOX
  if (provider === 'hentaifox') {
    try {
      const codeMatch = query.match(/\b\d{4,7}\b/);
      const isCode = /^\d+$/.test(query) || (codeMatch && query.includes('hentaifox.com/gallery/'));

      if (isCode) {
        const code = codeMatch ? codeMatch[0] : query;
        const res = await fetch(`https://r.jina.ai/https://hentaifox.com/gallery/${code}/`, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) throw new Error(`Gagal memuat galeri HentaiFox #${code}`);

        const text = await res.text();
        const title = text.match(/#\s+([^\n]+)/)?.[1] || text.match(/^Title:\s*([^\n]+)/m)?.[1] || `#${code}`;
        const cover = text.match(/\((https:\/\/i\d*\.hentaifox\.com\/[^\)]+)\)/)?.[1];
        const parodies = cleanLinks(text.match(/Parodies:\s*([^\n]+)/)?.[1]);
        const artists = cleanLinks(text.match(/Artists:\s*([^\n]+)/)?.[1]);
        const tags = cleanLinks(text.match(/Tags:\s*([^\n]+)/)?.[1]);
        const pages = text.match(/Pages:\s*\[?(\d+)\]?/)?.[1] || '-';

        let caption = `┌── [ HENTAIFOX: #${code} ]\n`;
        caption += `│ • Judul    : ${title}\n`;
        caption += `│ • Artist   : ${artists}\n`;
        caption += `│ • Parodi   : ${parodies}\n`;
        caption += `│ • Halaman  : ${pages}\n`;
        caption += `│ • Tags     : ${tags}\n`;
        caption += `│ • Link     : https://hentaifox.com/gallery/${code}/\n└──`;

        return await sendResult(caption, cover);
      }

      const res = await fetch(`https://r.jina.ai/https://hentaifox.com/search/?q=${encodeURIComponent(query)}`, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error('Gagal mencari di HentaiFox');

      const text = await res.text();
      const items = [];
      const hfoxRegex = /\[!\[Image \d+\]\((https:\/\/i\d*\.hentaifox\.com\/[^\)]+)\)\]\((https:\/\/hentaifox\.com\/gallery\/(\d+)\/)\)[\s\S]*?##\s*\[([^\]]+)\]/g;
      let match;
      while ((match = hfoxRegex.exec(text)) !== null && items.length < 5) {
        if (!items.some(x => x.code === match[3])) {
          items.push({ thumb: match[1], url: match[2], code: match[3], title: match[4].trim() });
        }
      }

      if (!items.length) {
        return sock.sendMessage(jid, {
          text: `┌── [ NOT FOUND ]\n│ • Tidak ditemukan doujin di HentaiFox untuk "${query}".\n└──`
        }, { quoted: m });
      }

      let caption = `┌── [ HENTAIFOX SEARCH: ${query} ]\n`;
      items.forEach((it, idx) => {
        caption += `│ • ${idx + 1}. ${it.title}\n│   Code: #${it.code} | Link: ${it.url}\n`;
      });
      caption += `│\n│ • Detail : ${config.prefix}hfox <kode>\n└──`;

      return await sendResult(caption, items[0]?.thumb);
    } catch (err) {
      return await sock.sendMessage(jid, {
        text: `┌── [ HENTAIFOX ERROR ]\n│ • ${err.message}\n└──`
      }, { quoted: m });
    }
  }
}




