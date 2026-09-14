import { load } from 'cheerio';

const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function get(url, headers = {}) {
  const res = await fetch(url, {
    headers: { 'User-Agent': ua, ...headers },
    signal: AbortSignal.timeout(12000)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// ─── Anime Quotes ──────────────────────────────────────────────────────────
export async function animeQuote() {
  const page = Math.floor(Math.random() * 184);
  const html = await get(`https://otakotaku.com/quote/feed/${page}`);
  const $ = load(html);
  const results = [];
  $('div.kotodama-list').each((_, el) => {
    results.push({
      gambar: $(el).find('img').attr('data-src') || $(el).find('img').attr('src'),
      karakter: $(el).find('div.char-name').text().trim(),
      anime: $(el).find('div.anime-title').text().trim(),
      episode: $(el).find('div.meta').text().trim(),
      quotes: $(el).find('div.quote').text().trim()
    });
  });
  if (!results.length) throw new Error('Tidak ada quote ditemukan');
  return results[Math.floor(Math.random() * results.length)];
}

// ─── Berita Indonesia (berita-indo-api by satyawikananda) ────────────────────
export async function beritaIndo(query = '') {
  const q = (query || '').trim();
  const endpoints = q
    ? [
        `https://berita-indo-api-next.vercel.app/api/cnn-news?search=${encodeURIComponent(q)}`,
        `https://berita-indo-api-next.vercel.app/api/cnbc-news?search=${encodeURIComponent(q)}`
      ]
    : [
        'https://berita-indo-api-next.vercel.app/api/cnn-news',
        'https://berita-indo-api-next.vercel.app/api/cnbc-news'
      ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) continue;
      const json = await res.json();
      const list = json.data || [];
      if (list.length > 0) {
        return list.slice(0, 8).map(b => ({
          judul: b.title || b.judul || '',
          link: b.link || '',
          waktu: b.isoDate ? new Date(b.isoDate).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '',
          snippet: b.contentSnippet || '',
          thumb: b.image?.large || b.image?.small || ''
        }));
      }
    } catch {}
  }
  throw new Error(q ? `Tidak ditemukan berita untuk "${q}"` : 'Gagal mengambil berita terkini');
}

// ─── Film & Drakor (TMDB & IMDb Integration) ──────────────────────────────
const TMDB_API_KEY = '493840a2f05e02c49d3708051f0052fd';

async function searchTmdb(query, isDrakor = false) {
  try {
    const endpoint = isDrakor
      ? `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=id-ID`
      : `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=id-ID`;

    let res = await fetch(endpoint, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];
    let data = await res.json();
    let results = data.results || [];

    // Fallback to en-US if id-ID has no results or empty overview
    if (!results.length) {
      const fallbackEndpoint = isDrakor
        ? `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US`
        : `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US`;
      res = await fetch(fallbackEndpoint, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        data = await res.json();
        results = data.results || [];
      }
    }

    if (isDrakor) {
      // Prioritize Korean origin or Asian dramas
      results.sort((a, b) => {
        const aKo = (a.origin_country || []).includes('KR') || a.original_language === 'ko' ? 1 : 0;
        const bKo = (b.origin_country || []).includes('KR') || b.original_language === 'ko' ? 1 : 0;
        return bKo - aKo;
      });
    }

    const sliced = results.slice(0, 3);
    const enriched = await Promise.all(
      sliced.map(async item => {
        let title = item.title || item.name || item.original_name || item.original_title;
        let overview = item.overview || '';

        // If overview or international title is missing in id-ID, fetch en-US details
        if (!overview) {
          try {
            const detailType = item.media_type === 'movie' ? 'movie' : (isDrakor ? 'tv' : (item.media_type || 'tv'));
            const detailRes = await fetch(
              `https://api.themoviedb.org/3/${detailType}/${item.id}?api_key=${TMDB_API_KEY}&language=en-US`,
              { signal: AbortSignal.timeout(4000) }
            );
            if (detailRes.ok) {
              const detail = await detailRes.json();
              if (detail.name || detail.title) title = `${detail.title || detail.name} / ${title}`;
              if (detail.overview) overview = detail.overview;
            }
          } catch {}
        }

        const releaseDate = item.release_date || item.first_air_date || '';
        const year = releaseDate ? ` (${releaseDate.split('-')[0]})` : '';
        const mediaType = (item.media_type || (isDrakor ? 'tv' : 'movie')).toUpperCase();
        const rating = item.vote_average ? `⭐ ${item.vote_average.toFixed(1)}/10 (${item.vote_count} votes)` : '';
        const poster = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '';
        const cleanOverview = overview ? overview.slice(0, 220) + (overview.length > 220 ? '...' : '') : '';

        return {
          judul: `${title}${year}`,
          tipe: mediaType === 'TV' ? 'DRAMA / TV SERIES' : 'MOVIE',
          rating,
          overview: cleanOverview,
          thumb: poster,
          link: `https://www.themoviedb.org/${mediaType.toLowerCase() === 'movie' ? 'movie' : 'tv'}/${item.id}`,
          source: 'TMDB'
        };
      })
    );

    return enriched;
  } catch {
    return [];
  }
}

async function searchImdb(query, isDrakor = false) {
  try {
    const finalQuery = isDrakor
      ? (query.toLowerCase().includes('drama') || query.toLowerCase().includes('korean') ? query : `${query} korean drama`)
      : query;

    const url = `https://v3.sg.media-imdb.com/suggestion/x/${encodeURIComponent(finalQuery.toLowerCase())}.json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': ua },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) return [];
    const data = await res.json();
    const items = (data.d || []).filter(item => item.id && item.l);
    if (!items.length) return [];

    return items.slice(0, 3).map(item => ({
      judul: `${item.l}${item.y ? ` (${item.y})` : ''}`,
      tipe: item.q ? item.q.toUpperCase() : (isDrakor ? 'DRAMA / TV SERIES' : 'MOVIE'),
      pemeran: item.s ? `Cast: ${item.s}` : '',
      thumb: item.i?.imageUrl || '',
      link: `https://www.imdb.com/title/${item.id}/`,
      source: 'IMDb'
    }));
  } catch {
    return [];
  }
}

export async function searchFilm(query, isDrakor = false) {
  // First search TMDB (from Kdrama-Site)
  const tmdbResults = await searchTmdb(query, isDrakor);
  if (tmdbResults && tmdbResults.length > 0) return tmdbResults;

  // Fallback to IMDb if TMDB yields no results
  return searchImdb(query, isDrakor);
}

export async function searchDrakor(query) {
  return searchFilm(query, true);
}

// ─── APK Search (APKCombo / Pure Engine) ───────────────────────────────────
export async function searchApk(query) {
  try {
    const url = `https://apkcombo.com/search/${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': ua,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const results = [];

    // Regex extraction for resilience against cheerio nesting
    const itemRegex = /<a[^>]+class=\"[^\"]*l_item[^\"]*\"[^>]*href=\"([^\"]+)\"[^>]*>([\s\S]*?)<\/a>/g;
    let match;
    while ((match = itemRegex.exec(html)) !== null && results.length < 5) {
      const relativeHref = match[1];
      const inner = match[2];

      const nameMatch = inner.match(/<span class=\"name\">([^<]+)<\/span>/);
      const authorMatch = inner.match(/<span class=\"author\">([^<]+)<\/span>/);
      const descMatch = inner.match(/<span class=\"description\">([\s\S]*?)<\/span>/);
      const imgMatch = inner.match(/data-src=\"([^\"]+)\"/) || inner.match(/src=\"([^\"]+)\"/);

      const judul = nameMatch ? nameMatch[1].trim() : '';
      const author = authorMatch ? authorMatch[1].trim() : 'Android App';
      const cleanDesc = descMatch ? descMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
      const thumb = imgMatch ? imgMatch[1] : '';
      const link = relativeHref.startsWith('http') ? relativeHref : `https://apkcombo.com${relativeHref}`;

      if (judul) {
        results.push({
          judul,
          kategori: author,
          tanggal: 'Latest Release',
          deskripsi: cleanDesc ? `Info: ${cleanDesc}` : `Developer: ${author}`,
          thumb,
          link
        });
      }
    }

    return results;
  } catch (err) {
    throw new Error(`Gagal mencari APK: ${err.message}`);
  }
}

