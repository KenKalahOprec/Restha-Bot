import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import sharp from 'sharp';

/**
 * iLovePDF Suite Core Engine
 */

// 1. Info PDF (Jumlah halaman, dimensi, orientasi, dll)
export async function getPdfInfo(buffer) {
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const pageCount = doc.getPageCount();
  const pages = doc.getPages();
  const first = pages[0];
  const { width, height } = first.getSize();
  const rotation = first.getRotation().angle;
  return {
    pageCount,
    width: Math.round(width),
    height: Math.round(height),
    rotation,
    title: doc.getTitle() || '-',
    author: doc.getAuthor() || '-',
    subject: doc.getSubject() || '-'
  };
}

// 2. Putar Halaman PDF (Rotate PDF)
export async function rotatePdf(buffer, angleDegrees = 90) {
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const pages = doc.getPages();
  const normAngle = ((parseInt(angleDegrees, 10) || 90) % 360 + 360) % 360;
  for (const page of pages) {
    const current = page.getRotation().angle;
    page.setRotation(degrees((current + normAngle) % 360));
  }
  const bytes = await doc.save();
  return Buffer.from(bytes);
}

// 3. Pisahkan / Ekstrak Halaman PDF (Split / Extract PDF)
export async function splitPdf(buffer, pageRangeStr = '1') {
  const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const total = srcDoc.getPageCount();
  const targetDoc = await PDFDocument.create();

  // Parse page range string (e.g. "1-3", "2,4,5", "1")
  const targetIndices = new Set();
  const parts = String(pageRangeStr).split(',').map(s => s.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(n => parseInt(n.trim(), 10));
      if (!isNaN(start) && !isNaN(end)) {
        const s = Math.max(1, Math.min(start, end));
        const e = Math.min(total, Math.max(start, end));
        for (let i = s; i <= e; i++) targetIndices.add(i - 1);
      }
    } else {
      const n = parseInt(part, 10);
      if (!isNaN(n) && n >= 1 && n <= total) {
        targetIndices.add(n - 1);
      }
    }
  }

  if (targetIndices.size === 0) {
    targetIndices.add(0); // Default ke halaman pertama
  }

  const sortedIndices = Array.from(targetIndices).sort((a, b) => a - b);
  const copied = await targetDoc.copyPages(srcDoc, sortedIndices);
  for (const p of copied) {
    targetDoc.addPage(p);
  }

  const bytes = await targetDoc.save();
  return {
    buffer: Buffer.from(bytes),
    extractedPages: sortedIndices.map(i => i + 1)
  };
}

// 4. Hapus Halaman PDF (Remove Pages)
export async function removePdfPages(buffer, pagesToRemoveStr) {
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const total = doc.getPageCount();

  const toRemove = new Set();
  const parts = String(pagesToRemoveStr).split(',').map(s => s.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(n => parseInt(n.trim(), 10));
      if (!isNaN(start) && !isNaN(end)) {
        const s = Math.max(1, Math.min(start, end));
        const e = Math.min(total, Math.max(start, end));
        for (let i = s; i <= e; i++) toRemove.add(i - 1);
      }
    } else {
      const n = parseInt(part, 10);
      if (!isNaN(n) && n >= 1 && n <= total) {
        toRemove.add(n - 1);
      }
    }
  }

  if (toRemove.size >= total) {
    throw new Error('Tidak dapat menghapus semua halaman PDF.');
  }

  // Hapus dari indeks terbesar agar indeks yang lebih kecil tidak bergeser
  const sortedDesc = Array.from(toRemove).sort((a, b) => b - a);
  for (const idx of sortedDesc) {
    doc.removePage(idx);
  }

  const bytes = await doc.save();
  return {
    buffer: Buffer.from(bytes),
    remainingCount: doc.getPageCount(),
    removedList: Array.from(toRemove).map(i => i + 1).sort((a, b) => a - b)
  };
}

// 5. Tambahkan Watermark ke PDF (Watermark PDF)
export async function watermarkPdf(buffer, text = 'CONFIDENTIAL') {
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const pages = doc.getPages();

  for (const page of pages) {
    const { width, height } = page.getSize();
    const textSize = Math.min(48, Math.max(18, Math.round(width / 14)));
    const textWidth = font.widthOfTextAtSize(text, textSize);
    const textHeight = font.heightOfTextAtSize(textSize);

    // Pusatkan watermark di tengah halaman dengan rotasi 45 derajat
    page.drawText(text, {
      x: (width - textWidth) / 2,
      y: (height - textHeight) / 2,
      size: textSize,
      font,
      color: rgb(0.7, 0.7, 0.7),
      opacity: 0.45,
      rotate: degrees(45)
    });
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

// 6. Tambahkan Nomor Halaman (Page Numbers)
export async function addPageNumbers(buffer, position = 'bottom-center') {
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const total = pages.length;

  for (let i = 0; i < total; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    const label = `Halaman ${i + 1} dari ${total}`;
    const fontSize = 10;
    const textWidth = font.widthOfTextAtSize(label, fontSize);

    let x = (width - textWidth) / 2;
    let y = 20;

    if (position === 'bottom-right') x = width - textWidth - 30;
    else if (position === 'bottom-left') x = 30;
    else if (position === 'top-center') y = height - 25;

    page.drawText(label, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(0.35, 0.35, 0.35)
    });
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

// 7. Gambar ke PDF (JPG/PNG to PDF)
export async function imagesToPdf(imageBuffers = []) {
  if (!imageBuffers.length) throw new Error('Tidak ada file gambar yang diberikan.');

  const doc = await PDFDocument.create();
  for (const imgBuf of imageBuffers) {
    const isPng = imgBuf[0] === 0x89 && imgBuf[1] === 0x50 && imgBuf[2] === 0x4E && imgBuf[3] === 0x47;
    let embedded;
    if (isPng) {
      try {
        embedded = await doc.embedPng(imgBuf);
      } catch {
        const jpegBuf = await sharp(imgBuf).jpeg({ quality: 90 }).toBuffer();
        embedded = await doc.embedJpg(jpegBuf);
      }
    } else {
      const jpegBuf = await sharp(imgBuf).jpeg({ quality: 90 }).toBuffer();
      embedded = await doc.embedJpg(jpegBuf);
    }

    const page = doc.addPage([embedded.width, embedded.height]);
    page.drawImage(embedded, {
      x: 0,
      y: 0,
      width: embedded.width,
      height: embedded.height
    });
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

// 8. Gabungkan Beberapa PDF (Merge PDF)
export async function mergePdfs(pdfBuffers = []) {
  if (pdfBuffers.length < 2) throw new Error('Minimal butuh 2 file PDF untuk digabungkan.');

  const mergedDoc = await PDFDocument.create();
  for (const pdfBuf of pdfBuffers) {
    const srcDoc = await PDFDocument.load(pdfBuf, { ignoreEncryption: true });
    const copiedPages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
    for (const page of copiedPages) {
      mergedDoc.addPage(page);
    }
  }

  const bytes = await mergedDoc.save();
  return {
    buffer: Buffer.from(bytes),
    totalPages: mergedDoc.getPageCount()
  };
}

// 9. Kompres PDF (Compress PDF)
export async function compressPdf(buffer) {
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const bytes = await doc.save({ useObjectStreams: true });
  return Buffer.from(bytes);
}

// 10. Word ke PDF (DOCX to PDF)
export async function wordToPdf(docxBuffer) {
  const mammoth = (await import('mammoth')).default;
  const PDFKit = (await import('pdfkit')).default;

  const result = await mammoth.extractRawText({ buffer: docxBuffer });
  const text = (result.value || '').trim();
  if (!text) throw new Error('Dokumen Word kosong atau tidak dapat diekstrak teksnya.');

  return new Promise((resolve, reject) => {
    const doc = new PDFKit({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header Dokumen
    doc.fontSize(16).font('Helvetica-Bold').text('DOKUMEN HASIL KONVERSI WORD', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica-Oblique').fillColor('#555555').text(`Dikonversi otomatis oleh iLovePDF Suite • ${new Date().toLocaleDateString('id-ID')}`, { align: 'center' });
    doc.moveDown(1);
    doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1.5);

    // Konten Teks
    doc.fontSize(11).font('Helvetica').fillColor('#111111').text(text, {
      align: 'justify',
      lineGap: 4
    });

    doc.end();
  });
}

// 11. Excel ke PDF (XLSX / XLS / CSV to PDF)
export async function excelToPdf(excelBuffer) {
  const xlsx = (await import('xlsx')).default;
  const PDFKit = (await import('pdfkit')).default;

  const workbook = xlsx.read(excelBuffer, { type: 'buffer' });
  const sheetNames = workbook.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    throw new Error('File Excel tidak memiliki lembar kerja (worksheet).');
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFKit({ size: 'A4', layout: 'landscape', margin: 40 });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    let isFirstSheet = true;

    for (const name of sheetNames) {
      if (!isFirstSheet) doc.addPage({ size: 'A4', layout: 'landscape', margin: 40 });
      isFirstSheet = false;

      const sheet = workbook.Sheets[name];
      const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

      // Judul Sheet
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1b5e20').text(`Lembar Kerja: ${name}`, { align: 'left' });
      doc.fontSize(8).font('Helvetica').fillColor('#666666').text(`Total Baris: ${rows.length} | Diekspor oleh iLovePDF Suite`, { align: 'left' });
      doc.moveDown(1);

      if (!rows || rows.length === 0) {
        doc.fontSize(10).font('Helvetica-Oblique').fillColor('#888888').text('(Lembar kerja kosong)');
        continue;
      }

      // Hitung kolom maksimum
      let maxCols = 0;
      rows.forEach(r => { if (Array.isArray(r) && r.length > maxCols) maxCols = r.length; });
      maxCols = Math.min(maxCols, 12); // Batasi maks 12 kolom agar muat di landscape A4

      const tableWidth = 760; // Lebar total area print landscape A4 (841 - 80)
      const colWidth = Math.floor(tableWidth / (maxCols || 1));
      const rowHeight = 22;

      let startY = doc.y;

      for (let rIdx = 0; rIdx < rows.length; rIdx++) {
        const row = rows[rIdx] || [];
        // Cek overflow halaman
        if (startY + rowHeight > 550) {
          doc.addPage({ size: 'A4', layout: 'landscape', margin: 40 });
          startY = 40;
        }

        const isHeader = rIdx === 0;

        // Background sel header
        if (isHeader) {
          doc.rect(40, startY, tableWidth, rowHeight).fill('#e8f5e9');
        } else if (rIdx % 2 === 1) {
          doc.rect(40, startY, tableWidth, rowHeight).fill('#f9f9f9');
        }

        // Garis tepi baris
        doc.rect(40, startY, tableWidth, rowHeight).strokeColor('#e0e0e0').lineWidth(0.5).stroke();

        // Teks sel
        for (let cIdx = 0; cIdx < maxCols; cIdx++) {
          const val = row[cIdx] !== undefined && row[cIdx] !== null ? String(row[cIdx]).trim() : '';
          const cellX = 40 + cIdx * colWidth;

          doc.fontSize(isHeader ? 9 : 8)
            .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
            .fillColor(isHeader ? '#1b5e20' : '#222222')
            .text(val.slice(0, 30), cellX + 4, startY + 6, {
              width: colWidth - 8,
              height: rowHeight - 6,
              ellipsis: true,
              align: 'left'
            });
        }

        startY += rowHeight;
        doc.y = startY;
      }
    }

    doc.end();
  });
}

// 12. Ekstraksi Teks PDF ke Markdown (PDF to Markdown)
export function extractTextFromPdf(buf) {
  const str = buf.toString('latin1');
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;
  const textPieces = [];
  const zlib = require('zlib');

  while ((match = streamRegex.exec(str)) !== null) {
    let data;
    try {
      data = zlib.inflateSync(Buffer.from(match[1], 'latin1')).toString('utf-8');
    } catch {
      try {
        data = zlib.unzipSync(Buffer.from(match[1], 'latin1')).toString('utf-8');
      } catch {
        data = match[1];
      }
    }

    const hexTj = /<([0-9a-fA-F]+)>\s*Tj/g;
    let h;
    while ((h = hexTj.exec(data)) !== null) {
      try {
        textPieces.push(Buffer.from(h[1], 'hex').toString('utf-8'));
      } catch {}
    }

    const regTj = /\(([^)]+)\)\s*Tj/g;
    let r;
    while ((r = regTj.exec(data)) !== null) {
      textPieces.push(r[1]);
    }

    const arrTj = /\[([^\]]+)\]\s*TJ/g;
    let a;
    while ((a = arrTj.exec(data)) !== null) {
      const parts = a[1].match(/\(([^)]+)\)|<([0-9a-fA-F]+)>/g);
      if (parts) {
        parts.forEach(p => {
          if (p.startsWith('(')) textPieces.push(p.slice(1, -1));
          else if (p.startsWith('<')) textPieces.push(Buffer.from(p.slice(1, -1), 'hex').toString('utf-8'));
        });
      }
    }
  }

  return textPieces.join(' ').replace(/\s+/g, ' ').trim();
}

export async function pdfToMarkdown(buffer) {
  const text = extractTextFromPdf(buffer);
  if (!text) throw new Error('Tidak ada teks yang dapat diekstrak dari PDF ini.');

  const paragraphs = text.split(/(?<=[.?!])\s+/);
  let md = `# Dokumen Markdown\n*Diekstrak otomatis oleh iLovePDF Suite*\n\n---\n\n`;
  paragraphs.forEach(p => {
    if (p.trim()) md += `${p.trim()}\n\n`;
  });

  return md.trim();
}

// 13. HTML ke PDF (HTML to PDF)
export async function htmlToPdf(rawHtml) {
  const TurndownService = (await import('turndown')).default;
  const PDFKit = (await import('pdfkit')).default;

  const turndown = new TurndownService();
  const md = turndown.turndown(rawHtml || '');
  const cleanLines = md.split('\n');

  return new Promise((resolve, reject) => {
    const doc = new PDFKit({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header PDF
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#0d47a1').text('DOKUMEN DARI HTML', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(8).font('Helvetica-Oblique').fillColor('#666666').text(`Dikonversi oleh iLovePDF Suite • ${new Date().toLocaleDateString('id-ID')}`, { align: 'center' });
    doc.moveDown(1);
    doc.strokeColor('#b0bec5').lineWidth(0.8).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1.5);

    for (const line of cleanLines) {
      const trimmed = line.trim();
      if (!trimmed) {
        doc.moveDown(0.5);
        continue;
      }

      if (trimmed.startsWith('# ')) {
        doc.fontSize(16).font('Helvetica-Bold').fillColor('#1565c0').text(trimmed.slice(2));
        doc.moveDown(0.4);
      } else if (trimmed.startsWith('## ')) {
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e88e5').text(trimmed.slice(3));
        doc.moveDown(0.3);
      } else if (trimmed.startsWith('### ')) {
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#2196f3').text(trimmed.slice(4));
        doc.moveDown(0.2);
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        doc.fontSize(10).font('Helvetica').fillColor('#212121').text(`  •  ${trimmed.slice(2)}`, { indent: 10 });
      } else {
        doc.fontSize(10).font('Helvetica').fillColor('#212121').text(trimmed, { align: 'justify', lineGap: 3 });
      }
    }

    doc.end();
  });
}



