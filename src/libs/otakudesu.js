import fs from 'fs';
import path from 'path';
import os from 'os';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export function isOtakudesuUrl(url) {
  return /otakudesu\.[a-z0-9]+/i.test(url);
}

export async function downloadOtakudesu(url) {
  let epUrl = url.trim();

  // Jika user memasukkan link anime (bukan episode), ambil episode pertama
  if (epUrl.includes('/anime/')) {
    const aRes = await fetch(epUrl, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) });
    const aHtml = await aRes.text();
    const epMatch = aHtml.match(/<a href="(https?:\/\/[^"]*\/episode\/[^"]+)"/i);
    if (!epMatch) throw new Error('Episode tidak ditemukan pada tautan anime ini.');
    epUrl = epMatch[1];
  }

  const pageRes = await fetch(epUrl, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) });
  if (!pageRes.ok) throw new Error(`Gagal membuka halaman Otakudesu (${pageRes.status})`);
  const html = await pageRes.text();

  // 1. Ambil Judul
  const titleMatch = html.match(/<h1[^>]*class="posttl"[^>]*>([^<]+)<\/h1>/i) ||
                     html.match(/<div class="download">\s*<h4>([^<]+)<\/h4>/i);
  const title = (titleMatch ? titleMatch[1].trim() : 'Anime_Episode').replace(/\s+/g, ' ');

  // 2. Ambil Action hashes dari inline script
  const actionMatches = [...html.matchAll(/action:\s*["']([a-f0-9]{32})["']/g)].map(m => m[1]);
  const nonceAction = actionMatches.find(a => a !== actionMatches[0]) || 'aa1208d27f29ca340c92c66d1926f13f';
  const embedAction = actionMatches[0] || '2a3505c93b0035d3f455df82bf976b84';

  // 3. Request Nonce
  const fd1 = new URLSearchParams();
  fd1.append('action', nonceAction);

  let nonce = null;
  try {
    const rNonce = await fetch('https://otakudesu.blog/wp-admin/admin-ajax.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': UA,
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': epUrl
      },
      body: fd1.toString(),
      signal: AbortSignal.timeout(8000)
    });
    const jsonNonce = await rNonce.json();
    nonce = jsonNonce?.data;
  } catch {}

  let directStreamUrl = null;

  // 4. Cari dari Mirror Stream AJAX
  if (nonce) {
    const mirrorElements = [...html.matchAll(/data-content="([^"]+)"/g)];
    for (const [, b64] of mirrorElements) {
      try {
        const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
        const fdEmbed = new URLSearchParams();
        for (const [k, v] of Object.entries(payload)) {
          fdEmbed.append(k, v);
        }
        fdEmbed.append('nonce', nonce);
        fdEmbed.append('action', embedAction);

        const rEmbed = await fetch('https://otakudesu.blog/wp-admin/admin-ajax.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'User-Agent': UA,
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': epUrl
          },
          body: fdEmbed.toString(),
          signal: AbortSignal.timeout(8000)
        });
        const jsonEmbed = await rEmbed.json();
        if (!jsonEmbed?.data) continue;

        const embedHtml = Buffer.from(jsonEmbed.data, 'base64').toString('utf-8');
        const iframeSrc = embedHtml.match(/<iframe[^>]+src="([^"]+)"/i)?.[1];
        if (!iframeSrc) continue;

        const resIframe = await fetch(iframeSrc, {
          headers: { 'User-Agent': UA, 'Referer': 'https://otakudesu.blog/' },
          signal: AbortSignal.timeout(8000)
        });
        const iframeHtml = await resIframe.text();
        const videoSource = iframeHtml.match(/<source[^>]+src="([^"]+)"/i)?.[1] ||
                            iframeHtml.match(/https?:\/\/[^"'\s<>]+\.(?:mp4|m3u8)[^"'\s<>]*/i)?.[0];
        if (videoSource) {
          directStreamUrl = videoSource;
          break;
        }
      } catch {}
    }
  }

  // 5. Fallback jika mirror ajax kosong: Cari dari Download Box 360p
  if (!directStreamUrl) {
    const dlow = html.match(/<div class="download">([\s\S]*?)<\/div>/i);
    if (dlow) {
      const match360 = dlow[1].match(/<li><strong>360p<\/strong>([\s\S]*?)<\/li>/i) ||
                       dlow[1].match(/<li><strong>480p<\/strong>([\s\S]*?)<\/li>/i);
      if (match360) {
        const links = [...match360[1].matchAll(/<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi)];
        for (const [, href] of links) {
          try {
            const redir = await fetch(href, {
              headers: { 'User-Agent': UA, 'Referer': epUrl },
              redirect: 'manual',
              signal: AbortSignal.timeout(6000)
            });
            const loc = redir.headers.get('location');
            if (loc && (loc.endsWith('.mp4') || loc.includes('.mp4?') || loc.includes('letsupload'))) {
              directStreamUrl = loc;
              break;
            }
          } catch {}
        }
      }
    }
  }

  if (!directStreamUrl) {
    throw new Error('Tidak dapat menemukan tautan video stream untuk episode ini.');
  }

  // Stream video langsung ke file sementara
  const tmpOut = path.join(os.tmpdir(), `otaku_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`);
  const videoRes = await fetch(directStreamUrl, {
    headers: { 'User-Agent': UA, 'Referer': 'https://desustream.me/' },
    signal: AbortSignal.timeout(120000)
  });
  if (!videoRes.ok) throw new Error(`Gagal mengunduh stream video (${videoRes.status})`);

  if (videoRes.body) {
    await pipeline(Readable.fromWeb(videoRes.body), fs.createWriteStream(tmpOut));
  } else {
    const ab = await videoRes.arrayBuffer();
    await fs.promises.writeFile(tmpOut, Buffer.from(ab));
  }

  const buffer = await fs.promises.readFile(tmpOut);
  await fs.promises.unlink(tmpOut).catch(() => {});

  return {
    buffer,
    meta: {
      title
    }
  };
}

export async function searchAndDownloadAnime(query) {
  const epMatch = query.match(/(?:ep|eps|episode)?\s*(\d+(?:\.\d+)?)$/i);
  const targetEpNum = epMatch ? parseFloat(epMatch[1]) : null;
  const cleanTitle = epMatch ? query.replace(/(?:ep|eps|episode)?\s*(\d+(?:\.\d+)?)$/i, '').trim() : query.trim();

  const searchRes = await fetch(`https://www.sankavollerei.web.id/anime/search/${encodeURIComponent(cleanTitle || query)}`, {
    headers: { 'Accept': 'application/json', 'User-Agent': UA },
    signal: AbortSignal.timeout(8000)
  });
  if (!searchRes.ok) throw new Error(`Anime "${query}" tidak ditemukan.`);
  const searchJson = await searchRes.json();
  const animeList = searchJson?.data?.animeList || [];
  if (animeList.length === 0) throw new Error(`Anime "${query}" tidak ditemukan.`);

  const anime = animeList[0];
  const detailRes = await fetch(`https://www.sankavollerei.web.id/anime/anime/${anime.animeId}`, {
    headers: { 'Accept': 'application/json', 'User-Agent': UA },
    signal: AbortSignal.timeout(8000)
  });
  const detailJson = await detailRes.json();
  const epList = detailJson?.data?.episodeList || [];
  if (epList.length === 0) throw new Error(`Daftar episode untuk "${anime.title}" tidak ditemukan.`);

  let selectedEp = epList[0];
  if (targetEpNum !== null) {
    const found = epList.find(e => {
      const n = parseFloat(e.eps) || parseFloat((e.title || '').match(/(\d+(?:\.\d+)?)/)?.[1]);
      return n === targetEpNum;
    });
    if (found) selectedEp = found;
  }

  const epUrl = selectedEp.otakudesuUrl || `https://otakudesu.blog/episode/${selectedEp.episodeId}/`;
  return await downloadOtakudesu(epUrl);
}

