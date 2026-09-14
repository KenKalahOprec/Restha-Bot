/**
 * Instagram Downloader Module (SaveInsta engine)
 * Supports: Posts (Photo/Carousel/Video), Reels, and Stories
 */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';

export async function downloadInstagram(targetUrl) {
  // Bersihkan query parameters (seperti ?img_index=3, ?igsh=, ?stkn=) & trailing slashes
  const cleanUrl = targetUrl.trim().split('?')[0].replace(/\/+$/, '') + '/';

  // Step 1: Ambil token verifikasi dari saveinsta.to
  const homeRes = await fetch('https://saveinsta.to/en/highlights', {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    },
    signal: AbortSignal.timeout(10000)
  });
  const html = await homeRes.text();
  const k_exp = html.match(/k_exp\s*=\s*"([^"]+)"/)?.[1];
  const k_token = html.match(/k_token\s*=\s*"([^"]+)"/)?.[1];

  if (!k_exp || !k_token) {
    throw new Error('Gagal mendapatkan token server Instagram');
  }

  // Jeda 800ms
  await new Promise(r => setTimeout(r, 800));

  // Step 2: Request user verification token
  const verifyRes = await fetch('https://saveinsta.to/api/userverify', {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Origin': 'https://saveinsta.to',
      'Referer': 'https://saveinsta.to/en/video',
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: new URLSearchParams({ url: cleanUrl }),
    signal: AbortSignal.timeout(10000)
  });
  const verifyJson = await verifyRes.json();
  const cftoken = verifyJson?.token;
  if (!cftoken) {
    throw new Error('Gagal memverifikasi request ke server');
  }

  // Jeda 800ms
  await new Promise(r => setTimeout(r, 800));

  // Step 3: Ajax search media
  const searchRes = await fetch('https://saveinsta.to/api/ajaxSearch', {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Origin': 'https://saveinsta.to',
      'Referer': 'https://saveinsta.to/en/highlights',
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: new URLSearchParams({
      k_exp,
      k_token,
      q: cleanUrl,
      t: 'media',
      lang: 'en',
      v: 'v2',
      cftoken
    }),
    signal: AbortSignal.timeout(12000)
  });
  const searchJson = await searchRes.json();

  if (searchJson.status !== 'ok' || !searchJson.data) {
    const rawMess = searchJson.mess || 'Media tidak ditemukan atau akun privat.';
    throw new Error(rawMess.replace(/<[^>]+>/g, '').trim());
  }

  // Step 4: Parse media link dari respons HTML
  const content = searchJson.data;

  // Cari seluruh tag video download link
  const videoMatches = [...content.matchAll(/<a[^>]+href="([^"]+)"[^>]*title="Download Video"[^>]*>/gi)];
  const photoMatches = [...content.matchAll(/<a[^>]+href="([^"]+)"[^>]*title="Download Photo"[^>]*>/gi)];
  const thumbMatches = [...content.matchAll(/<img[^>]+(?:src|data-src)="([^"]+)"/gi)];

  const videos = videoMatches.map(m => m[1]);
  const photos = photoMatches.map(m => m[1]);
  const thumbs = thumbMatches.map(m => m[1]).filter(url => !url.includes('loader.gif'));

  return {
    videos,
    photos,
    thumbs,
    rawCount: videos.length + photos.length
  };
}

