import sharp from 'sharp';

/**
 * Pure JS PDF builder from JPEG buffers (Zero external dependencies).
 * Directly embeds DCT-encoded JPEGs into PDF stream objects.
 */
export function createPdfFromJpegs(images) {
  const pageCount = images.length;
  if (pageCount === 0) throw new Error('Tidak ada halaman gambar untuk dijadikan PDF');

  const objects = [];
  const pageObjIds = [];
  for (let i = 0; i < pageCount; i++) {
    pageObjIds.push(3 + i * 3);
  }

  objects.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`);
  const kidsStr = pageObjIds.map(id => `${id} 0 R`).join(' ');
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [${kidsStr}] /Count ${pageCount} >>\nendobj`);

  for (let i = 0; i < pageCount; i++) {
    const { buffer, width, height } = images[i];
    const pageId = 3 + i * 3;
    const imgId = pageId + 1;
    const contentId = pageId + 2;

    objects.push(`${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im${i} ${imgId} 0 R >> >> /Contents ${contentId} 0 R >>\nendobj`);

    const imgHeader = `${imgId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${buffer.length} >>\nstream\n`;
    const imgFooter = `\nendstream\nendobj`;
    objects.push({ header: imgHeader, buffer, footer: imgFooter });

    const streamContent = `q\n${width} 0 0 ${height} 0 0 cm\n/Im${i} Do\nQ\n`;
    objects.push(`${contentId} 0 obj\n<< /Length ${Buffer.byteLength(streamContent)} >>\nstream\n${streamContent}endstream\nendobj`);
  }

  const chunks = [Buffer.from('%PDF-1.4\n')];
  const offsets = [0];
  let currentOffset = chunks[0].length;

  for (let i = 0; i < objects.length; i++) {
    offsets.push(currentOffset);
    const obj = objects[i];
    if (typeof obj === 'string') {
      const b = Buffer.from(obj + '\n');
      chunks.push(b);
      currentOffset += b.length;
    } else {
      const hBuf = Buffer.from(obj.header);
      const fBuf = Buffer.from(obj.footer + '\n');
      chunks.push(hBuf, obj.buffer, fBuf);
      currentOffset += hBuf.length + obj.buffer.length + fBuf.length;
    }
  }

  const xrefOffset = currentOffset;
  let xref = `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) {
    xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }
  xref += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  chunks.push(Buffer.from(xref));
  return Buffer.concat(chunks);
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchImagesBatched(rawUrls, referer) {
  const images = [];
  const fetchLimit = rawUrls.slice(0, 50);
  const BATCH_SIZE = 10;

  for (let i = 0; i < fetchLimit.length; i += BATCH_SIZE) {
    const batch = fetchLimit.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (rawUrl) => {
        try {
          const cleanUrl = encodeURI(rawUrl.trim());
          const r = await fetch(cleanUrl, {
            headers: { 'User-Agent': UA, 'Referer': referer },
            signal: AbortSignal.timeout(9000)
          });
          if (!r.ok) return null;
          const rawBuf = Buffer.from(await r.arrayBuffer());
          const processed = await sharp(rawBuf)
            .resize({ width: 1080, withoutEnlargement: true })
            .jpeg({ quality: 70, mozjpeg: true })
            .toBuffer({ resolveWithObject: true });
          return {
            buffer: processed.data,
            width: processed.info.width,
            height: processed.info.height
          };
        } catch {
          return null;
        }
      })
    );
    images.push(...results.filter(Boolean));
  }
  return images;
}

async function downloadFromBacaKomik(query, chapterTarget) {
  const sRes = await fetch(`https://www.sankavollerei.web.id/comic/bacakomik/search/${encodeURIComponent(query)}`, {
    headers: { 'Accept': 'application/json', 'User-Agent': UA },
    signal: AbortSignal.timeout(8000)
  });
  if (!sRes.ok) return null;
  const sJson = await sRes.json();
  const comics = sJson?.komikList || [];
  if (comics.length === 0) return null;

  const comic = comics[0];
  const dRes = await fetch(`https://www.sankavollerei.web.id/comic/bacakomik/detail/${comic.slug}`, {
    headers: { 'Accept': 'application/json', 'User-Agent': UA },
    signal: AbortSignal.timeout(8000)
  });
  if (!dRes.ok) return null;
  const dJson = await dRes.json();
  const chapters = dJson?.detail?.chapters || dJson?.chapters || [];
  if (chapters.length === 0) return null;

  let selectedCh = chapters[chapters.length - 1]; // Chapter 1
  if (chapterTarget) {
    const targetNum = parseFloat(chapterTarget);
    const found = chapters.find(c => {
      const m = (c.slug || c.title || '').match(/(\d+(?:\.\d+)?)/);
      return m && parseFloat(m[1]) === targetNum;
    });
    if (found) selectedCh = found;
  } else {
    selectedCh = chapters[0]; // Chapter terbaru
  }

  const chRes = await fetch(`https://www.sankavollerei.web.id/comic/bacakomik/chapter/${selectedCh.slug}`, {
    headers: { 'Accept': 'application/json', 'User-Agent': UA },
    signal: AbortSignal.timeout(8000)
  });
  if (!chRes.ok) return null;
  const chJson = await chRes.json();
  const imageUrls = chJson?.images || [];
  if (imageUrls.length === 0) return null;

  const images = await fetchImagesBatched(imageUrls, 'https://bacakomik.my/');
  if (images.length === 0) return null;

  const pdfBuffer = createPdfFromJpegs(images);
  return {
    pdfBuffer,
    mangaTitle: comic.title || query,
    chTitle: chJson.title || selectedCh.slug,
    pageCount: images.length,
    source: 'BacaKomik (Indo)'
  };
}

async function downloadFromKomikindo(query, chapterTarget) {
  const sRes = await fetch(`https://www.sankavollerei.web.id/comic/komikindo/search/${encodeURIComponent(query)}`, {
    headers: { 'Accept': 'application/json', 'User-Agent': UA },
    signal: AbortSignal.timeout(8000)
  });
  if (!sRes.ok) return null;
  const sJson = await sRes.json();
  const comics = sJson?.komikList || sJson?.data || [];
  if (comics.length === 0) return null;

  const comic = comics[0];
  const dRes = await fetch(`https://www.sankavollerei.web.id/comic/komikindo/detail/${comic.slug}`, {
    headers: { 'Accept': 'application/json', 'User-Agent': UA },
    signal: AbortSignal.timeout(8000)
  });
  if (!dRes.ok) return null;
  const dJson = await dRes.json();
  const data = dJson?.data || dJson?.detail || dJson;
  const chapters = data?.chapters || [];
  if (chapters.length === 0) return null;

  let selectedCh = chapters[chapters.length - 1]; // Chapter 1
  if (chapterTarget) {
    const targetNum = parseFloat(chapterTarget);
    const found = chapters.find(c => {
      const m = (c.slug || c.title || '').match(/(\d+(?:\.\d+)?)/);
      return m && parseFloat(m[1]) === targetNum;
    });
    if (found) selectedCh = found;
  } else {
    selectedCh = chapters[0]; // Chapter terbaru
  }

  const chRes = await fetch(`https://www.sankavollerei.web.id/comic/komikindo/chapter/${selectedCh.slug}`, {
    headers: { 'Accept': 'application/json', 'User-Agent': UA },
    signal: AbortSignal.timeout(8000)
  });
  if (!chRes.ok) return null;
  const chJson = await chRes.json();
  const chData = chJson?.data || chJson;
  const rawImages = chData?.images || [];
  const imageUrls = rawImages.map(img => (typeof img === 'string' ? img : img.url || img.src)).filter(Boolean);
  if (imageUrls.length === 0) return null;

  const images = await fetchImagesBatched(imageUrls, 'https://komikindo.ch/');
  if (images.length === 0) return null;

  const pdfBuffer = createPdfFromJpegs(images);
  return {
    pdfBuffer,
    mangaTitle: data.title?.replace(/Komik\s*/i, '').trim() || comic.title || query,
    chTitle: chData.title || selectedCh.slug,
    pageCount: images.length,
    source: 'Komikindo (Indo)'
  };
}

async function downloadFromMangaPill(query, chapterTarget) {
  const sRes = await fetch(`https://mangapill.com/search?q=${encodeURIComponent(query)}`, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(10000)
  });
  const sHtml = await sRes.text();
  const mangaMatches = [...sHtml.matchAll(/<a[^>]+href="(\/manga\/[^"]+)"[^>]*>/gi)];
  if (mangaMatches.length === 0) throw new Error(`Manga "${query}" tidak ditemukan.`);

  const mangaPath = mangaMatches[0][1];
  const mangaUrl = 'https://mangapill.com' + mangaPath;
  const rawTitle = mangaPath.split('/')[3] || 'manga';
  const mangaTitle = rawTitle.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const mRes = await fetch(mangaUrl, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(10000)
  });
  const mHtml = await mRes.text();
  const chMatches = [...mHtml.matchAll(/<a[^>]+href="(\/chapters\/[^"]+)"[^>]*>([^<]+)<\/a>/gi)];
  if (chMatches.length === 0) throw new Error(`Daftar chapter untuk "${mangaTitle}" tidak ditemukan.`);

  let selectedCh = chMatches[chMatches.length - 1]; // Chapter 1
  if (chapterTarget) {
    const targetNum = parseFloat(chapterTarget);
    const found = chMatches.find(c => {
      const match = c[2].match(/(\d+(?:\.\d+)?)/);
      return match && parseFloat(match[1]) === targetNum;
    });
    if (found) selectedCh = found;
  }

  const chPath = selectedCh[1];
  const chUrl = 'https://mangapill.com' + chPath;
  const chTitle = selectedCh[2].trim();

  const chRes = await fetch(chUrl, {
    headers: { 'User-Agent': UA, 'Referer': mangaUrl },
    signal: AbortSignal.timeout(10000)
  });
  const chHtml = await chRes.text();
  const imgMatches = [...chHtml.matchAll(/<img[^>]+(?:data-src|src)="([^"]+)"[^>]*width="(\d+)"[^>]*height="(\d+)"/gi)];
  if (imgMatches.length === 0) throw new Error(`Halaman gambar untuk ${chTitle} tidak ditemukan.`);

  const rawUrls = imgMatches.map(m => m[1]);
  const images = await fetchImagesBatched(rawUrls, 'https://mangapill.com/');

  if (images.length === 0) throw new Error(`Gagal mengunduh halaman gambar dari ${chTitle}`);

  const pdfBuffer = createPdfFromJpegs(images);
  return {
    pdfBuffer,
    mangaTitle,
    chTitle,
    pageCount: images.length,
    source: 'MangaPill (Global)'
  };
}

export async function downloadMangaChapterPdf(query, chapterTarget) {
  // 1. Coba BacaKomik (Indo)
  try {
    const r1 = await downloadFromBacaKomik(query, chapterTarget);
    if (r1) return r1;
  } catch {}

  // 2. Coba Komikindo (Indo)
  try {
    const r2 = await downloadFromKomikindo(query, chapterTarget);
    if (r2) return r2;
  } catch {}

  // 3. Fallback ke MangaPill (Global)
  return await downloadFromMangaPill(query, chapterTarget);
}
