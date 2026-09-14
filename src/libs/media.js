import sharp from 'sharp';
import webpmux from 'node-webpmux';
import ytdlp from 'yt-dlp-exec';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ShazamAPI } from './shazam-api.js';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

let menuGifBuffer = null;
const MENU_GIF_URL = 'https://media.giphy.com/media/CchzkJJ6UrQmQ/giphy.mp4';

export async function getMenuGif() {
  if (menuGifBuffer) return menuGifBuffer;
  try {
    const res = await fetch(MENU_GIF_URL, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      menuGifBuffer = Buffer.from(await res.arrayBuffer());
      return menuGifBuffer;
    }
  } catch {}
  return null;
}

export async function webpToPng(buffer) {
  return await sharp(buffer).png().toBuffer();
}

export async function webpToGif(buffer) {
  return await sharp(buffer, { animated: true }).gif().toBuffer();
}

export async function webpToMp4(buffer) {
  const gifBuf = await webpToGif(buffer);
  const tmpIn = path.join(os.tmpdir(), `stk_${Date.now()}_${Math.random().toString(36).slice(2)}.gif`);
  const tmpOut = path.join(os.tmpdir(), `vid_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`);
  await fs.promises.writeFile(tmpIn, gifBuf);

  return new Promise((resolve, reject) => {
    ffmpeg(tmpIn)
      .outputOptions([
        '-pix_fmt', 'yuv420p',
        '-c:v', 'libx264',
        '-movflags', '+faststart',
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2'
      ])
      .save(tmpOut)
      .on('end', async () => {
        try {
          const out = await fs.promises.readFile(tmpOut);
          await Promise.allSettled([fs.promises.unlink(tmpIn), fs.promises.unlink(tmpOut)]);
          resolve(out);
        } catch (err) {
          reject(err);
        }
      })
      .on('error', async (err) => {
        await Promise.allSettled([fs.promises.unlink(tmpIn), fs.promises.unlink(tmpOut)]);
        reject(err);
      });
  });
}

export async function addStickerExif(webpBuffer, pack = 'Restha Bot', author = 'Jade') {
  const img = new webpmux.Image();
  await img.load(webpBuffer);
  const json = JSON.stringify({
    'sticker-pack-id': 'com.restha.sticker',
    'sticker-pack-name': pack,
    'sticker-pack-publisher': author,
    'emojis': ['🤩', '🎉']
  });
  const exif = Buffer.concat([
    Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]),
    Buffer.from(json, 'utf-8')
  ]);
  exif.writeUIntLE(Buffer.byteLength(json), 14, 4);
  img.exif = exif;
  return await img.save(null);
}

export async function createStickerImage(buffer, { pack = 'Restha Bot', author = 'Jade', quality = 80 } = {}) {
  const webpBuf = await sharp(buffer)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality })
    .toBuffer();
  return await addStickerExif(webpBuf, pack, author);
}

export async function videoToAnimatedWebp(buffer, pack = 'Restha Bot', author = 'Jade') {
  const tmpIn = path.join(os.tmpdir(), `vid_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`);
  const tmpOut = path.join(os.tmpdir(), `stk_${Date.now()}_${Math.random().toString(36).slice(2)}.webp`);
  await fs.promises.writeFile(tmpIn, buffer);

  return new Promise((resolve, reject) => {
    ffmpeg(tmpIn)
      .inputOptions(['-t', '8'])
      .addOutputOptions([
        '-vcodec', 'libwebp',
        '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,fps=12,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
        '-lossless', '0',
        '-compression_level', '4',
        '-q:v', '40',
        '-loop', '0',
        '-an',
        '-vsync', '0',
        '-s', '512:512'
      ])
      .save(tmpOut)
      .on('end', async () => {
        try {
          const out = await fs.promises.readFile(tmpOut);
          await Promise.allSettled([fs.promises.unlink(tmpIn), fs.promises.unlink(tmpOut)]);
          const withExif = await addStickerExif(out, pack, author).catch(() => out);
          resolve(withExif);
        } catch (err) {
          reject(err);
        }
      })
      .on('error', async (err) => {
        await Promise.allSettled([fs.promises.unlink(tmpIn), fs.promises.unlink(tmpOut)]);
        reject(err);
      });
  });
}

export async function convertToAudio(buffer, isVn = false) {
  const tmpIn = path.join(os.tmpdir(), `media_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const ext = isVn ? 'opus' : 'mp3';
  const tmpOut = path.join(os.tmpdir(), `audio_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`);
  await fs.promises.writeFile(tmpIn, buffer);

  return new Promise((resolve, reject) => {
    let proc = ffmpeg(tmpIn).noVideo();
    if (isVn) {
      proc.audioCodec('libopus').audioBitrate(64);
    } else {
      proc.audioCodec('libmp3lame').audioBitrate(128);
    }
    proc
      .save(tmpOut)
      .on('end', async () => {
        try {
          const out = await fs.promises.readFile(tmpOut);
          await Promise.allSettled([fs.promises.unlink(tmpIn), fs.promises.unlink(tmpOut)]);
          resolve(out);
        } catch (err) {
          reject(err);
        }
      })
      .on('error', async (err) => {
        await Promise.allSettled([fs.promises.unlink(tmpIn), fs.promises.unlink(tmpOut)]);
        reject(err);
      });
  });
}

export async function uploadToCatbox(buffer, filename = 'file.bin') {
  const fd = new FormData();
  fd.append('reqtype', 'fileupload');
  fd.append('fileToUpload', new Blob([buffer]), filename);
  const res = await fetch('https://catbox.moe/user/api.php', { method: 'POST', body: fd });
  if (!res.ok) throw new Error('Gagal mengunggah ke hosting server');
  return (await res.text()).trim();
}

// Brat Text Generator — styled after official Charli XCX Brat Generator (bratgenerator.com)
export async function getBratImage(text, theme = 'white') {
  let rawText = String(text || '').trim();
  let bg = '#ffffff';
  let fg = '#000000';

  if (theme === 'green' || rawText.includes('--green') || rawText.includes('--ijo')) {
    bg = '#8ace00';
    fg = '#000000';
    rawText = rawText.replace(/--(green|ijo)/g, '').trim();
  } else if (theme === 'black' || rawText.includes('--black') || rawText.includes('--hitam')) {
    bg = '#000000';
    fg = '#ffffff';
    rawText = rawText.replace(/--(black|hitam)/g, '').trim();
  } else if (theme === 'white' || rawText.includes('--white') || rawText.includes('--putih')) {
    bg = '#ffffff';
    fg = '#000000';
    rawText = rawText.replace(/--(white|putih)/g, '').trim();
  }

  const clean = (rawText || 'brat').slice(0, 180);
  const words = clean.split(/\s+/);
  const lines = [];
  let cur = '';

  const maxChars = clean.length > 60 ? 18 : (clean.length > 30 ? 14 : 10);
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars) {
      if (cur) lines.push(cur.trim());
      cur = w;
    } else {
      cur = (cur + ' ' + w).trim();
    }
  }
  if (cur) lines.push(cur.trim());

  let fontSize = 76;
  if (lines.length === 1) {
    fontSize = clean.length > 12 ? 64 : (clean.length > 8 ? 82 : 98);
  } else if (lines.length === 2) {
    fontSize = 62;
  } else if (lines.length === 3) {
    fontSize = 50;
  } else if (lines.length >= 4) {
    fontSize = Math.max(30, 44 - (lines.length - 4) * 4);
  }

  const lineHeight = fontSize * 1.15;
  const totalHeight = lines.length * lineHeight;
  const startY = (512 - totalHeight) / 2 + fontSize * 0.85;

  const tspans = lines.map((line, i) => {
    const esc = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<tspan x="256" y="${Math.round(startY + (i * lineHeight))}">${esc}</tspan>`;
  }).join('');

  const svg = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" fill="${bg}"/>
    <text text-anchor="middle" font-family="'Arial Narrow', 'Nimbus Sans L', Arial, sans-serif" font-weight="400" font-size="${fontSize}" fill="${fg}" letter-spacing="-1.5px">
      ${tspans}
    </text>
  </svg>`;

  return await sharp(Buffer.from(svg))
    .blur(2.8)
    .png({ quality: 100 })
    .toBuffer();
}

export async function searchImage(query) {
  try {
    const res = await fetch(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(6000)
    });
    const html = await res.text();
    const match = html.match(/murl&quot;:&quot;(http[^&]+)&quot;/);
    if (match && match[1]) {
      const imgRes = await fetch(match[1], { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(6000) });
      if (imgRes.ok) return Buffer.from(await imgRes.arrayBuffer());
    }
  } catch {}
  return null;
}

export async function downloadVideoWithMeta(url) {
  const query = url.startsWith('http') ? url : `ytsearch1:${url}`;
  const tmpOut = path.join(os.tmpdir(), `dl_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`);

  let meta = null;
  try {
    const raw = await ytdlp(query, { dumpSingleJson: true, noPlaylist: true });
    meta = raw?.entries ? raw.entries[0] : raw;
  } catch {}

  await ytdlp(query, {
    format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
    ffmpegLocation: ffmpegInstaller.path,
    output: tmpOut,
    noPlaylist: true
  });
  const buf = await fs.promises.readFile(tmpOut);
  await fs.promises.unlink(tmpOut).catch(() => {});
  return { buffer: buf, meta };
}

export async function downloadAnime360p(url) {
  const query = url.startsWith('http') ? url : `ytsearch1:${url} 360p`;
  const tmpOut = path.join(os.tmpdir(), `anime_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`);

  let meta = null;
  try {
    const raw = await ytdlp(query, { dumpSingleJson: true, noPlaylist: true });
    meta = raw?.entries ? raw.entries[0] : raw;
  } catch {}

  await ytdlp(query, {
    format: 'bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360][ext=mp4]/best[height<=360]/best',
    ffmpegLocation: ffmpegInstaller.path,
    output: tmpOut,
    noPlaylist: true
  });
  const buf = await fs.promises.readFile(tmpOut);
  await fs.promises.unlink(tmpOut).catch(() => {});
  return { buffer: buf, meta };
}

export async function downloadVideoUrl(url) {
  const { buffer } = await downloadVideoWithMeta(url);
  return buffer;
}

export async function downloadMediaPlaylist(url) {
  const prefix = `media_pl_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const outPattern = path.join(os.tmpdir(), `${prefix}_%(autonumber)02d.%(ext)s`);

  let meta = null;
  try {
    meta = await ytdlp(url, { dumpSingleJson: true });
  } catch {}

  try {
    await ytdlp(url, {
      ffmpegLocation: ffmpegInstaller.path,
      output: outPattern
    });
  } catch (err) {
    // yt-dlp returns non-zero status when downloading mixed media/partial items,
    // but the actual media files are written to disk.
  }

  const files = fs.readdirSync(os.tmpdir())
    .filter(f => f.startsWith(prefix))
    .sort()
    .map(f => path.join(os.tmpdir(), f));

  return { files, meta };
}

export async function downloadSpotifySpotdl(query) {
  const tmpDir = path.join(os.tmpdir(), `spotdl_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  const ffmpegPath = ffmpegInstaller.path;
  const spotdlCmd = `python -m spotdl "${query}" --output "{title}.{output-ext}" --ffmpeg "${ffmpegPath}"`;

  return new Promise((resolve, reject) => {
    const proc = spawn(spotdlCmd, { shell: true, cwd: tmpDir });
    const timer = setTimeout(() => {
      proc.kill();
      fs.rmSync(tmpDir, { recursive: true, force: true });
      reject(new Error('SpotDL download timeout'));
    }, 60000);

    proc.on('close', async (code) => {
      clearTimeout(timer);
      try {
        const files = fs.readdirSync(tmpDir).filter(f => !f.endsWith('.spotdl'));
        if (files.length > 0) {
          const filePath = path.join(tmpDir, files[0]);
          const buf = await fs.promises.readFile(filePath);
          fs.rmSync(tmpDir, { recursive: true, force: true });
          resolve(buf);
        } else {
          fs.rmSync(tmpDir, { recursive: true, force: true });
          resolve(null);
        }
      } catch (e) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        reject(e);
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      fs.rmSync(tmpDir, { recursive: true, force: true });
      reject(err);
    });
  });
}

export async function downloadAudioUrl(url) {
  const isUrl = url.startsWith('http');
  const query = isUrl ? url : `ytsearch1:${url}`;
  const tmpOut = path.join(os.tmpdir(), `audio_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`);
  try {
    await ytdlp(query, {
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: 0,
      ffmpegLocation: ffmpegInstaller.path,
      output: tmpOut,
      noPlaylist: true
    });
  } catch (err) {
    if (!isUrl) {
      await ytdlp(url, {
        extractAudio: true,
        audioFormat: 'mp3',
        audioQuality: 0,
        ffmpegLocation: ffmpegInstaller.path,
        output: tmpOut,
        noPlaylist: true
      });
    } else {
      throw err;
    }
  }

  if (!fs.existsSync(tmpOut)) {
    throw new Error('Gagal menemukan lagu di database audio, coba kata kunci judul lain');
  }

  const buf = await fs.promises.readFile(tmpOut);
  await fs.promises.unlink(tmpOut).catch(() => {});
  return buf;
}

export async function downloadTikTok(url) {
  try {
    const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000)
    });
    if (res.ok) {
      const json = await res.json();
      if (json.code === 0 && json.data) {
        const d = json.data;
        // Kasus 1: TikTok Slide Foto (Images)
        if (Array.isArray(d.images) && d.images.length > 0) {
          return { images: d.images, data: d };
        }
        // Kasus 2: TikTok Video
        if (d.play) {
          const vRes = await fetch(d.play, { headers: { 'User-Agent': 'Mozilla/5.0' } });
          if (vRes.ok) {
            const buf = Buffer.from(await vRes.arrayBuffer());
            return { buffer: buf, data: d };
          }
        }
      }
    }
  } catch {}
  return null;
}

export async function enhanceRemini(buffer) {
  const meta = await sharp(buffer).metadata();
  const targetWidth = Math.min(2500, Math.max(1200, (meta.width || 500) * 2));
  return await sharp(buffer)
    .resize({ width: targetWidth, kernel: 'lanczos3' })
    .sharpen({ sigma: 1.6, m1: 1.2, m2: 2.5 })
    .modulate({ saturation: 1.12, brightness: 1.02 })
    .png({ quality: 100 })
    .toBuffer();
}

export async function generateIqcImage(text, senderName = 'User', options = {}) {
  const now = new Date();
  const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const time = options.time || defaultTime;
  const battery = options.battery || '80';
  const carrier = options.carrier || 'Indosat';
  const message = text;

  try {
    const url = `https://brat.siputzx.my.id/iphone-quoted?time=${encodeURIComponent(time)}&batteryPercentage=${encodeURIComponent(battery)}&carrierName=${encodeURIComponent(carrier)}&messageText=${encodeURIComponent(message)}&emojiStyle=apple`;
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf && buf.length > 1000) {
        return buf;
      }
    }
  } catch (err) {
    console.error('Error fetching online IQC:', err.message);
  }

  const bgPath = path.resolve('./src/assets/iqc/background.png');
  const fontPath = path.resolve('./src/assets/iqc/SFPRODISPLAYREGULAR.otf');

  let fontBase64 = '';
  if (fs.existsSync(fontPath)) {
    try {
      fontBase64 = (await fs.promises.readFile(fontPath)).toString('base64');
    } catch {}
  }

  const words = text.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > 28) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = cur ? cur + ' ' + w : w;
    }
  }
  if (cur) lines.push(cur);

  const timeStr = time;

  const canvasWidth = 680;
  const canvasHeight = 1209;

  const bubbleX = 28;
  const bubbleY = 480;
  const lineHeight = 38;
  const textPaddingTop = 38;
  const textHeight = lines.length * lineHeight;
  const bubbleHeight = Math.max(90, textPaddingTop + textHeight + 24);
  const maxLineLen = Math.max(...lines.map(l => l.length));
  const bubbleWidth = Math.min(620, Math.max(260, maxLineLen * 18 + 90));

  const menuWidth = 400;
  const menuX = 28;
  const menuY = bubbleY + bubbleHeight + 24;
  const itemHeight = 64;
  const menuItems = [
    { title: 'Balas', iconB64: 'iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAADsElEQVRoQ+2YV6gUWRCGv6surmCGxYARVjHsGlERxXUxK4gPggF9cxeRXRFE8UkEHwwI+qCID/qgqLAgBkTRxRwQzIg5R8SAGVcFlZ9bc25v9/R090wPMxfme7lV1dye+ufUqVNnqqjlVNXy/CsCSk6lhEpNmitQD/gF+ARcA765J0UkLQFDgc1Aa/PPAhOBe+YXjTQEjAa2Az+6SDXngb7FXolCBfiTfwk0Bn4wv6uVU9EoRIA/+btWShuB3ywm/4jZRSFfAaOAHZ7k7wO/m4hDlrhQ7LDZRSEfAbmSF2UtICp5UbYCwmr+gfkZvAI2APuA0z6RqRG3hOImL5TwSOfVoDPhH2A9cMNFCySOgCTJiznASucF0blwDFhl7y2IKAFJk8+gA6w/0MPGi55AI/e0hgPAbOCKiyQkl4BhwO48ks+G3jEWmAKMAxq4J/AFWAosAr66aEzCBDS0Om1lfiHJ+2kBLAT+8JzYQis9HfjgIjEIEzAC2G/2I2BQSsl76QSstZXOoPlJrfq5i0QQJmA48K/ZD4HBRRAg6gKLgQWeXE6YKI3lkYQJ0ECmsmlufpollI1JNo5LkJCtcoqcZMMECJXRrpQ2cRz+BNY5D/4C1jgvhFwCRD5ttA7wK/DZxusXCbrLEisn8Q7oAjwxPytRAkRSETrEdJhlUJtUn79gfV+t+ZV7+n/qA5dsgwtt8llmZyWOAJFExEEb8MKQoG3Acus6frwd8D+gja1kVuIKEHFFeIe5j75Dy4s2qOaiecBrF63mHNDb7L+B1WYHSCJAxBHhH6cv29VStzSdxgN8n3sLGA9cdRGYC6wwW8OhPjcrSQWIKBF+Af4bmWaj+cA0z+fr4BriuT+39bzvvbX1rC01HwEil4goARlU6+r3P5l/G+gDvDX/qY0dooNdngLkK0CEiUhyqe9mAjMivF3njE21op/5AQoRIPwi/D+rdAZumh3GGGCP2epQ2i9ajeM2gwmNMhoxAhQqQPhFZDgFDHRebvT/E8xWZ5oBXLT7hNBfnQ8B0hAgVCqbrGcLfXuTgcfmRyGhJ81WS20JXAfaW6ydDZUB0hIgNIh1t02Yz2+id4COZqvdbgWamK+y1GgRIE0BhaINPNPsLcBUs/WFNE27jRYD7QHtBaHNnGkERz1dLUA5CdClX13Me80Umk6XOc9HOQkQe31jg+r+Z+CZi/goNwG9bJptZsnrVrbTZZuFchMg1HF0kVEbfWN5hlKOAhJREVBqKitQamr9CnwH0gXZMa3m8EwAAAAASUVORK5CYII=' },
    { title: 'Teruskan', iconB64: 'iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAADsklEQVRoQ+2Y2YsVRxjFf+OKggRMVBQhBhIVI4rJg6hRI6KERBEVMYjLiyiCLyaI+B+IWxBFfcmLC4qo8cEEIgm4gaB5cIu7EIgEQQQV3DAunJnTPXd6uvv2vd33XgfuD4aur4aZ/k5X1VenqoUuTksXz78poOE0p1CjqdcIdAc+B94A1/wshHoI+AI4CHzmd94EFgKXHOei1gL6AHeAIWFPG4+AGcBfYU+V1FrATOB3t5966vRzXIiIWgtYDOx1ez+wEfgT+Mh9uUXUWsASYI/bErIUGBMR8dgjdd5xRTRCgChMRKMEiEJE1ErAKGAcMB+Y675gCpUSFVHxmihSgBJe7oQHh73t/OzfRxkL/FGtiLwCugHLgNXQumEl8RZYABwJezpStYg8AiYA24Evw552lMBF4CpwBThrC5FGVSKqEdAb2AasiPz9E+AYcMCJ/B/+JjtxIqYClx13olIBA4CjwFdhDzwDfvImJRF5iYrQCKpP07ATlQj4FDgBfBL2wCFgDfBf2FMMSvgU8IHjkTaBncgqoD9wDhju+BWw1lOpFqi8ni4RMAK45XYHsgjoZUP2tWNNme+Ak46LJro3KHHtK68ddyCLgM3Aj25rYarOH3dcNNHktYinuaLFUk6ANqcL0HqiEquA3W6Xo4cT+dDx334mEZd87jL6K/Ct25qTmkax1QAYBMxx2ZNwrZdAuPjB1SqOqpIXaQI074KvpkWrpOK+4hRgHfCNd+YkZKu1a0epOnmRJmCLv5rQBhWYsgAdE3fE9Jfy3MdKUXczd8PlS8jHHHZbTAR+AQaGPW0L/Azwm62D6vasmANNQK4vH5A0AvqnD9xW2dRCfOFYu7DKal/HSnwXsBX4x30BcScyUUjyIkmA5rV2QqEDxni3h7qkBZXlLvB9yovjBBSWvEgSMK/E+mqqKBaq/9rExG1XpTQbUXqo3wdsKjJ5kSRAX1WuUui5CJjsUipeelTKXU5NtzETdb1W0VcOdls9ZzsRJSRUz4MKlYastxbzx2FPG7m/fEDSCExyJRGqLLoKvOc6L08yzHEWdCeqq8XRjnWw0YiWG71MJAnQy+TDhQ4TqjL6ETJx8ieVoPfoblT24nrKbl4xSQJknx+6rfKp2h4s5PXABrcbTpIAoZoezF1ZiZ5uy1IkusN6kyZgp91nKfdtIQqbAnlJE6DFp4VW6ihlpaOiGkqaALHSx0aVw3/tgbJWn7pQToDQTYTKpqy0fNF7RRYB7zVNAY2mOQKNpsuPwDtTxdoxFswl9AAAAABJRU5ErkJggg==' },
    { title: 'Salin', iconB64: 'iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAADiUlEQVRoQ+2YSagVRxSGPyfEgIhjiAO4cSOKSkI0qDjgrFHEhaLRBIniwkAIwQlFBcWFAwiKIM4bcRNBUUHECUyMsyK4EgUnnOcJR/73Tpfl9Xbd7ttP+wn327xzzutbXX/XqapTVYevnDpfef8rAnKnkkJ5UxmBAhoAg4GOFF8gbgDbgccukpFiLymXTsA/QAcXKc514GfglItkoKYENAXOA61dJMxdoK/9JhM1JWAWsMTsR8Bm4Jn5ERMLBCqdegMXXaQMakrADksL8Tuw3myf/4Aezqvmsom46iIpqSkBBywlRD/goNk+xQSIC0Af4LaLpCAvAfOAuUBD68c5+wD3zU9MWgH1gQnAMKCZi8L3NpHFUmA+8Nz8CH8EfgLaANuAehY7AgwqMneCpBHQGNgD9HSReE7YfnDPReBf67joZR3+Ddjg9WMvMBJ4aX5J0gjYaC9Myv/AAOCJ+dojRpt9GNht9jigq9lCz40FXrtIgKQClB63LIXE4iITtQuwzHnV7AeGAy+AoV6nS7EQWOC8AEkFaOiVAuIM0M1sH01CrUaF7ATGAK+gavJqfkR5H4dSqDnw1EViSCrA75y+vJbKQvxnNIEbmS22Ar8Ab63k0Pxo6f77gfFAO7O7A8fMjuVzCdAzGrE55otNwGTgnYt8SpL95CM+pwA9sxz4y2JiJfCn8z4lVwEqCbS6iJPAD0BdW70mWVxoHixy3sfkKuA74Jo3qspfFXZauVQq+KP9B7DKeR/IVYBYA0yzzoTQGv8jcNpFqsldwDfACmBqgvm1GpjuvGpyFxChul8nMx0xffzNbh8w0OyIWiMgjmIrlc8XF6AOKJdDaFddZzVRrRPwAGjiuhqP1n7tAaUEqExRmgmVL0fNjqXURIuIe/FMqzhDqL7XZqazr9/OWeBvs0V/YLbZqptaQdUHCpJVQFr8dkIo5aY4L0BtFHAIGOGdI4JkFbDLjpch1BHdWOh3fjs6/6rkiLhj7alyfeOiJcgq4BLQ3uwQvwJbAu2UTVYBLWzVCLXzEDhudlw7ZRN6sY9uHXRQF7qM0i6b6MxagCbmWrN1GTbK7LJJKkD3Nze9NV9ls24Q0oj41m7tdLshZtgVTCaSChBaszO/0LgCdLb0ykQaAXpWBxF9ueh2ohx0lahDvv5mJo2ACK06Q4C2KYXoa2v3TZt6QcoRUKuoCMibygjkTWUE8uY9E/3WMUTEZiUAAAAASUVORK5CYII=' },
    { title: 'Beri Bintang', iconB64: 'iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAETElEQVRoQ+2YR6gtRRCGv2fAZ/Yp5oCi+BRURFBQwYUJMSCmhagL0WfOLkxgBHVjzpjAgGIE0YVxIehCFFFRxICKEQVzznyc6nbO4c45Mz1zuF64H1xOVc+d8M9UV1X3AuY4C+b4888LmHXmQ2gMKwBXAP8AZwK/5CM9Ms0vcClwTsU+L+xemZaA5YGPgTXC/xrYEPg5/N6YloBjgFuyN2AJcFv2emJaAl4DtsnegDeBrWNO9MY0BOwGPBP2D/G7cvx67Lmwe2EaAh4D9gv7urjHSeF7bP+we6FvAZsA7wJLR6hsCfwNvA0sFfbmwPv5jI70LeBq4NSwnwD2rdh7h30VcEbYnelTgHFu6lw1/D2Bpyv2k2E7LzYAvg+/E30KOAW4Jux3gC0qGcf7mIUMKTkZuD7sTnQVsGK8zXUix28W4ycAN4WdOB64Mez3gKOBL4BPgJ9ivDXjBKwZE25dYH1gvYrtrw+e0mOVb6Lqjj6UYg2xRXnkPwwrhXwOfBq/n1Vsv+hX+b8r1Ak4Kiqp2aQtlwHnZm+Yan/Uhr+AY4Hb80hQJ+BB4ODs1fNrvKn0tqzAVwK/5f8YZrnoTK3S6av6tzD/Rz0PAYdkL6gTsENkkFXyCLwcE8+49WF9aJu0Plg9hCjK+XQisH0+OshYewAv5ZGgToBsFfl7ozwC1wKn9d3PjHBWhGF6Nl+U9eTV8IcYJ0CcrI8D2+URuCs6y9/zSD8sA9wQnWziDWCfmPwzMkmArATcHxdK2JAdBHybR7phNnsA2CuPDELYeTi24DURIGYjGzNzeeKtaA8+yiNlGPd+5W3zCNwBHAf8kUdqaCogYZ9jlrExEye08flK+G0xGznPrCni3LoYuDD8ibQVIIcCd0ZKlB+BnYHXw2+KD/9ChKiYeo8E7gu/ESUCZBfg0Uh/cj5wSdhN8ZyLwjYdHwA8H35jSgWIcZsm9uHAvWE3xXPuDttrpUVQK7oIMP7XDntx9Ctt8BwXOvJl5VqtKBVgcUvZ57sIJVdbbfDehs5q4XvN2nxfR6mAA4GHw7YmuFifiU3jt24J+Sywa9jWlUfCbkypgMuj5Cd7tMO0ZTYVupj3HvdEEzfaEk+6zkRKBYx7c3aMNn1r5ZEBrhPOBm6t9FKea5cpXnP3sBtTIqAudl2NueKyaxyHqdKKbiXvPJdKBIxmD1dfp0dOT8VNbLmt3K4Z/CIb5yODFsGKbph92CWblQg4LGJaPoiHcemZ0Hd7RUFpWely8oJoxZeNMfFh9d1Pktb1pESAOw/uQMyEPZFNmIufmXBv9GZgpzwyjNdWZGNKBLwI7Ji9AbbVhoOh4vp1HN7ziAihtP2e8Nr2VY0pEWA2SRNYbL7cabMyt8GloyJsDhNeO/VXjSgRkLYJLU7u/zyVj5Thrp3Zy6LXuicqEeDixh02M9GfebQbTmR38kytk0JwiBIB/yvmBcw2819gtpnzX+BfkCbQMXaLFi0AAAAASUVORK5CYII=' },
    { title: 'Info', iconB64: 'iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAEBUlEQVRoQ+2ZS8hVVRiGH4VSrIaKkxKjslIbpYGXGqZmpuagNCgaSGlEpKVGoRFeuhhEF20SkZSBlYiB1qy8YNQkCrSsIGtSDdVMCpOX867N4vfsvdfa++jhh/NM/m8tzjl7v2t9t7X+EQxzRgzz9x8I6DsDF+o3gx3owgRgCjARuMJzp4FfgO+BE57rCb3agcnAw8Aiv3gVEvIJ8A5wtJhtSFsBNwIvAnc3+K3/gT3AWuCHYjaT3IcGRgLPAM8BlxezHc4AXwO/AX96bhxwNTAdGO25wFngeS/EuWI2kSYC5Ne7gLnFTAet5nvAZ/b5bui7c4AHvWsxnwL3VXy3K7kC9AKfAzOKGTgCrAIOFzNpzAS2ArcVM3AIuDNHRI4AuY1WKV75N4EngP+KmTwuA14DHi1mOs+4J9WdcgQ8C7xQjDqr/moxasdq4OVi1ImvzcWoglQByjbfRgGrlX/MdhXX++9x/61iG/CIbQX2LcCPHpeSKkABusC2fH52gtu8FbmG7JW2y5A7KQameaxaca/tUlIEqEh9F31WwVcXsFr5oat3Q8JOaGG+tK0YUEWvLHYpAl6xvwvtxELbVTQVIPYC822/BKyx3ZUUASr9oT1YDOy2XYfiZEVkp8SMkNt8ZPunKI66UifgGuBX26qwY3NydGYQB64E/ooqtir477YvoE7AXc7LQr55h+2LjZ6leBDzgH22L6BOgLb9ddsfAMtsp6DCt9T2+27eUtGz7ret7KUs1pU6AeuATbZV9lVwUnkA2BHZEpFKnDgqi1qdAH15o+1cARuA9bbVbWqcip71pO1WArR9b9jOdaE2Ana6MxWtXKhNELcRcACYZbtVEMdp9B+n0VMe19FUwFVOo6M8bpVGxc/AtbZVZNSjpNBUwBIfmITqhyp4KSkC1OaG4FWZD01dHU0FyGXlukLHTJ2ZS0kRcLOvQ8JnVWAO2q6iiYDbgS9sq5lTI3nM466kCBDqf0IT95VF/OtxGXENqUyFRu20utxbPf7Y7lRJqoBJPtCEwNLhIzRqZVzn7KEKrGOoYqmKt4HltpUwprqZqyRVgIhXVDzlitkLnra/B9RCq5WuJUeAehudB0KvLrYDjye4UxlyGxXKsPJCz9ANX1LvlCNAjPG1ik5lAV1iqW9R8clBAauWIfi80G/o3ujvYqaGXAFCd0MfDtkJoRSri639FcVOvb5e8KEoVQa08upek19eNBEg5E7yU6XJENgBBeA3voX+w3PjXVF1YO/2ef2O6k2S28Q0FRBQldziiyiJykF5XulZhao225TRVkDgJruFzsxKn1WoPVA78m5dkUqhVwJi5CrhHxxqzMTJ6B8cpY1ZEy6GgEvKQEC/GexAvxnsQL85DwlLxzH/k/6QAAAAAElFTkSuQmCC' },
    { title: 'Laporkan', iconB64: 'iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAD10lEQVRoQ+2YXahUVRiGn+Mv/iCUQgopGtqvFhYK/nVhoiaYFUqZCipeSGJBYGYgpReKepGo5VUmWCkGat2kQV1oGhiakuYvIopoFyaooWZavPTuw2KY2bNmzx52B+a52e835+zZ69trrff71rTQxmlp4+NvJlA4zSVUNM0ZKJpGz0B7X+/5mjuNSuBRYB0w1vH3wFvAGce50YgEegNHgIdaP/mPK8BQX3OjEQlsAWZa3/e1na+fA7OscyHvBEYA+4PvneDrHl//AUYBPzmumzwT0FvWwIY73g68Fuhp1oeBYcHs1EWeCcwBNlnfAp4EzjvuC5wEujrW/262rou8EugOnAb6OF4OfGCdoM+WWv9up7ruODN5JbASeM/6EvAY8KfjhC6ehX6Odc/71pnJI4FHgN+Azo7lQF8AA4AVLmJLgIvADDuRuONlds5xJvJIYAfwirU2sVxGbrMt2MRfevB6nlxKbiV2Aq9aZ6LeBFRpVWWFXEUDO+hY1jneejfwovWzwM9BbZDVfmddM/UkoD7nF2CI48+AudbiG2Cy9a5gloT+d7a1lt8zwN+Oa6KeBBYAG6xveONediy+AqZaazlNtxZqM+RaPRzruz6xromsCTzgAfRyLAdaZZ2gjfyGtTxf3h+ie+RE4g/b6lXH0WRNQJ3mQmu5yFPAbccJKmrJoDcCb1ondAKOAYMc6zvfto4mSwJPAEeBjo61trXGS9Gg51t/BLxjHaJ75WJCe0Ab/FfHUWRJQI6SNGk/AC9Yl7I2eKNpRSt0KznaOOsoak1gSvC2VaDU31d6Y6uBRdYfAsusS1Ex04x2cKxnyMGiqCWB0jUr15B7VCLsfRY7oUp8HOwRndoGA385TqWWBPQ2k0HEuMbLrrRiYnAmKEdPu9qDjt8F1linEptAqW/rfLveOg0VKKElUg25mpxIqEvVC1LXmkpsAp8GVfaEB3bXcV5oD+iwk1R2PXOedUViEnjO/U2tvcvD3rh6hjbxhda/VEZulCw19VY63R1yXJZqCejve4HRjuUOcokYQrvVoLQPYvgaeMn6R+B5d7dlqZbA68BWa7mCKu5Zx9VQ2zzS+oDb7BgGAsftekI9lHqpsqQloCVzyl8o5Apyh1ie9qbUM1TQ9FtRLGENka2qUSw7C2kJ6CYdAcU1oH8eZ9hI5Hb6QUBNo5Ajlf1VLy0B3aQZEPJ9uVDpObdRdPOZoa4EtIRkmbq5SFR/Hs+yhMQY4Fu/kSK4CUwC9lV6eLUEhGZAPY/2RPJzeaNRo6j9px6p7NJJiEngf00zgaJpzkDRNGegaNr8DPwLCKqxMZFRjaYAAAAASUVORK5CYII=' },
    { title: 'Hapus', iconB64: 'iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAEdUlEQVRoQ+2YZcgtVRSGn2uhKIgFKoKIgdigKGJ3t1g/7BYDC/uHgd3YetUfdisGih2YYGCiIljYgt3ywDvD+HnmumfO4X5c/J5f71qz9zrzMnP2XnsmMY0zaRq//wkD487EK9RgOmAPYDNgljr7T34E7gGuAv6qs0Mwqifgzd8FbFpnpowmtgT+rDM9GZWBvYDL66iMPfMkhmJUBu7OqyNXADdHj2W7mBXnbBHdm1EZeBRYM3ot4LHosTjGseIYxw7F/8LAEsApwGy17X+zPDBH9EvAN9FjcYxjxTGObeN74BjgzTozgJIncDuwVR1NXfztbab0kyUGjgVOrqOpi0/g1Cn9ZIkBWQ6YGzgaWDu504CHo4dlHeCo6Edy018CLyfXSqmBisuAvaP3TTwKrHVJtDWNi+hq4Ezg8OgjE48Ca50ebU3jIroaOA44KdqVyVgWAXYGrgfeSs7a1dNqPilXtR2Aa4H3kvM/5n9Nju/yn+tq4CDg/OgLE8v9wIbA08Cqya3R2NDUT0Q/A6ycORsndwFwYPTBiYvoamA3YHL0NYnlydz4+8DCydms3RHtMnxntGMWypzVk7PWLtHWNC6iqwHX5Fujm2v0g8B6wKfA/Mm1GXDMvJmzQXLNvcaaxkV0NbAu8FC0S6ix2EpvDnzb2JHbDDhm9sxxjFirWp6tWbw8dzWwIvBc9AuJ5UZge+AXYObk2gw4ZqbM2TE5a60QbU3jIroaWLzRm7ydWK4Gdo2ePgeVQQY8+PyRnHN2j7bWYtHWNC6iqwHf74+jm+/7xcB+0bPm6DjIgNds0sQ5B0RX/wuxpnERXQ3YkX4X7U16Q3I2cGi0LcdXLQa89kVyzqk2RWtV52h/44fo/6SrAcf/CsyQeEbg9zEb0QJ5SoMMeO3D5JzjpmWt35Kzlv+P4gN/VwPydWOlmStxc4deFHi3xYDX3knOOe7m1rBxE2sZF9PHwAfAgtFuSMaHAWcltwzwWosBr72SnHPOSQ03N7GWcTF9DLwKLB29bOL9gYuSWwl4vsWA155Nzjl2oNao2mZrGRfTx8BTwCrRqyVuthge3B9vMdA81FctgzWqPslaxsX0MXAfsFG0H7LuTXd5Q3Jee6DFgNecL865KTX80CVe2yS6iD4GvFF/XHZK7Pcdb1C2zo0PMuC125Jzjt+GrHFdctYyLqaPgUGnMhs5mzOpTNkb2e9IdbO2Dp4ZZP30VfsAlybn1z3jYvoYGHQqmycrj32QPY3LqDvri1nTzX2WdsE+x43LhcDl8wjgjNRzJTMupo8BN58To6vNSNxJ7YOqVkHsfaT5Eded1n7op8TuH9XJ7oTGflJEHwOemM6Lbp7K+tI8jR3SOPEV0cfAtsAt0b42tr8/J+6Kr5yv1FKJrV39yYvoY2BO4KNG8/UJ8EZ0V5YE5ov2f2Gv1PZZciB9DIiP+tw6Gg2dDvMVfQ2I3/ltxlyBhuHzdLJX1pkODGNAbIV9f+3z++DZ4PW00b0Y1sC4M2FgvJl4AuPNNP8E/gYxlgJAIuFKTgAAAABJRU5ErkJggg==', red: true }
  ];
  const menuHeight = menuItems.length * itemHeight;

  const textTags = lines.map((l, idx) => {
    const esc = l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<text x="${bubbleX + 24}" y="${bubbleY + 44 + idx * lineHeight}" font-family="'SF Pro Display', -apple-system, sans-serif" font-size="28" fill="#ffffff">${esc}</text>`;
  }).join('\n');

  let menuRowsSvg = '';
  for (let i = 0; i < menuItems.length; i++) {
    const item = menuItems[i];
    const lineY = menuY + i * itemHeight;
    const textY = lineY + 41;
    const color = item.red ? '#ff3b30' : '#ffffff';
    const sep = i > 0 ? `<line x1="${menuX + 24}" y1="${lineY}" x2="${menuX + menuWidth - 24}" y2="${lineY}" stroke="#3a3a3a" stroke-width="1"/>\n` : '';
    menuRowsSvg += `${sep}
    <text x="${menuX + 30}" y="${textY}" font-family="'SF Pro Display', -apple-system, sans-serif" font-size="26" fill="${color}" font-weight="${item.red ? '600' : '400'}">${item.title}</text>
    <image x="${menuX + menuWidth - 62}" y="${lineY + 16}" width="32" height="32" href="data:image/png;base64,${item.iconB64}"/>\n`;
  }

  const svg = `<svg width="${canvasWidth}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg">
    <style>
      ${fontBase64 ? `@font-face { font-family: 'SF Pro Display'; src: url('data:font/otf;base64,${fontBase64}'); }` : ''}
    </style>
    <defs>
      <filter id="chatblur" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="20"/>
      </filter>
    </defs>
    
    <!-- Tint Layer -->
    <rect width="${canvasWidth}" height="${canvasHeight}" fill="rgba(13, 13, 13, 0.72)"/>

    <!-- Floating Reactions Pill -->
    <rect x="${bubbleX}" y="380" width="460" height="76" rx="38" fill="#272B2A" stroke="rgba(255,255,255,0.08)" stroke-width="1.5"/>
    <text x="${bubbleX + 230}" y="430" font-family="'SF Pro Display', -apple-system, 'Segoe UI Emoji', sans-serif" font-size="34" text-anchor="middle" letter-spacing="12">👍❤️😂😮😢🙏</text>

    <!-- Incoming Message Bubble -->
    <rect x="${bubbleX}" y="${bubbleY}" width="${bubbleWidth}" height="${bubbleHeight}" rx="22" fill="#202c33"/>
    ${textTags}
    <text x="${bubbleX + bubbleWidth - 16}" y="${bubbleY + bubbleHeight - 12}" font-family="'SF Pro Display', sans-serif" font-size="18" fill="#8696a0" text-anchor="end">${timeStr}</text>

    <!-- Context Menu Card -->
    <rect x="${menuX}" y="${menuY}" width="${menuWidth}" height="${menuHeight}" rx="20" fill="#2a2a2a" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
    ${menuRowsSvg}
  </svg>`;

  if (fs.existsSync(bgPath)) {
    const bgBuf = await fs.promises.readFile(bgPath);
    return await sharp(bgBuf)
      .resize(canvasWidth, canvasHeight, { fit: 'cover' })
      .blur(6)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .png()
      .toBuffer();
  }

  // Fallback if background image is missing
  return await sharp(Buffer.from(svg)).png().toBuffer();
}

export async function generateNulisImage(text, options = {}) {
  const width = 820;
  const lineSpacing = 30;
  const startY = 120;
  const marginX = 95;

  const paragraphs = text.split('\n');
  const renderedLines = [];
  for (const para of paragraphs) {
    if (!para.trim()) {
      renderedLines.push('');
      continue;
    }
    const words = para.split(/\s+/);
    let cur = '';
    for (const w of words) {
      if ((cur + ' ' + w).trim().length > 50) {
        if (cur) renderedLines.push(cur);
        cur = w;
      } else {
        cur = cur ? cur + ' ' + w : w;
      }
    }
    if (cur) renderedLines.push(cur);
  }

  const totalLines = Math.max(26, renderedLines.length + 3);
  const height = startY + totalLines * lineSpacing + 50;

  let linesSvg = '';
  for (let y = startY; y < height - 30; y += lineSpacing) {
    linesSvg += `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="#90a4ae" stroke-width="0.8" stroke-opacity="0.6"/>\n`;
  }

  const textSvg = renderedLines.map((l, idx) => {
    const lineY = startY + idx * lineSpacing - 6;
    const esc = l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<text x="${marginX + 15}" y="${lineY}" font-family="'Segoe Print', 'Comic Sans MS', 'Caveat', cursive, sans-serif" font-size="17" fill="#0d233a" font-weight="500">${esc}</text>`;
  }).join('\n');

  const now = new Date();
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const dayName = options.dayName || days[now.getDay()];
  const dateStr = options.dateStr || `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" fill="#fcfaf4"/>
    <line x1="${marginX}" y1="0" x2="${marginX}" y2="${height}" stroke="#e57373" stroke-width="1.8" stroke-opacity="0.85"/>
    <line x1="${marginX - 4}" y1="0" x2="${marginX - 4}" y2="${height}" stroke="#e57373" stroke-width="0.8" stroke-opacity="0.4"/>
    <line x1="0" y1="92" x2="${width}" y2="92" stroke="#90a4ae" stroke-width="1.2"/>
    <line x1="0" y1="96" x2="${width}" y2="96" stroke="#90a4ae" stroke-width="1.2"/>
    ${linesSvg}
    <text x="${width - 180}" y="52" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" fill="#546e7a" font-weight="600">Hari  : ${dayName}</text>
    <text x="${width - 180}" y="74" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" fill="#546e7a" font-weight="600">Tgl   : ${dateStr}</text>
    <text x="35" y="65" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" fill="#90a4ae" font-weight="bold">No. 1</text>
    <circle cx="45" cy="180" r="10" fill="#e0dbcd"/>
    <circle cx="45" cy="${height / 2}" r="10" fill="#e0dbcd"/>
    <circle cx="45" cy="${height - 180}" r="10" fill="#e0dbcd"/>
    ${textSvg}
  </svg>`;

  return await sharp(Buffer.from(svg)).png().toBuffer();
}

export async function generateNulisBookImage(text, mode = 'buku_kiri') {
  const configs = {
    buku_kiri: {
      file: 'buku_kiri.jpg',
      startX: 140,
      startY: 172,
      lineHeight: 35.7,
      maxLines: 31,
      maxChars: 44,
      fontSize: 27
    },
    buku_kanan: {
      file: 'buku_kanan.jpg',
      startX: 128,
      startY: 148,
      lineHeight: 37.5,
      maxLines: 31,
      maxChars: 44,
      fontSize: 27
    },
    folio_kiri: {
      file: 'folio_kiri.jpg',
      startX: 52,
      startY: 215,
      lineHeight: 39.2,
      maxLines: 37,
      maxChars: 68,
      fontSize: 28
    },
    folio_kanan: {
      file: 'folio_kanan.jpg',
      startX: 92,
      startY: 182,
      lineHeight: 38.5,
      maxLines: 37,
      maxChars: 68,
      fontSize: 28
    }
  };

  const cfg = configs[mode] || configs.buku_kiri;
  const assetPath = path.resolve('./src/assets/nulis', cfg.file);

  if (!fs.existsSync(assetPath)) {
    return await generateNulisImage(text);
  }

  const bgBuf = await fs.promises.readFile(assetPath);
  const meta = await sharp(bgBuf).metadata();

  let fontBase64 = '';
  const fontPath = path.resolve('./src/assets/nulis/Indie-Flower.ttf');
  if (fs.existsSync(fontPath)) {
    fontBase64 = (await fs.promises.readFile(fontPath)).toString('base64');
  }

  const paragraphs = text.split('\n');
  const lines = [];
  for (const p of paragraphs) {
    if (!p.trim()) {
      lines.push('');
      continue;
    }
    const words = p.split(/\s+/);
    let cur = '';
    for (const w of words) {
      if ((cur + ' ' + w).trim().length > cfg.maxChars) {
        if (cur) lines.push(cur);
        cur = w;
      } else {
        cur = cur ? cur + ' ' + w : w;
      }
    }
    if (cur) lines.push(cur);
  }

  const slicedLines = lines.slice(0, cfg.maxLines);

  const textSvgLines = slicedLines.map((line, idx) => {
    const y = cfg.startY + idx * cfg.lineHeight;
    const esc = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<text x="${cfg.startX}" y="${y}" class="text">${esc}</text>`;
  }).join('\n');

  const svg = `<svg width="${meta.width}" height="${meta.height}" xmlns="http://www.w3.org/2000/svg">
    <style>
      ${fontBase64 ? `@font-face { font-family: 'Handwriting'; src: url('data:font/ttf;base64,${fontBase64}'); }` : ''}
      .text {
        font-family: 'Handwriting', 'Segoe Print', 'Comic Sans MS', cursive;
        font-size: ${cfg.fontSize}px;
        fill: #1e1e1e;
        font-weight: 500;
      }
    </style>
    ${textSvgLines}
  </svg>`;

  return await sharp(bgBuf)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 92 })
    .toBuffer();
}

export async function generateBratVideo(text) {
  const words = text.trim().split(/\s+/);
  const slices = [];
  for (let i = 1; i <= words.length; i++) {
    slices.push(words.slice(0, i).join(' '));
  }

  const tmpDir = path.join(os.tmpdir(), `brat_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  await fs.promises.mkdir(tmpDir, { recursive: true });

  try {
    for (let i = 0; i < slices.length; i++) {
      const s = slices[i];
      const wList = s.split(/\s+/);
      const lines = [];
      let cur = '';
      for (const w of wList) {
        if ((cur + ' ' + w).trim().length > 14) {
          if (cur) lines.push(cur);
          cur = w;
        } else {
          cur = cur ? cur + ' ' + w : w;
        }
      }
      if (cur) lines.push(cur);

      const startY = 256 - (lines.length - 1) * 30;
      const textSvg = lines.map((l, idx) => {
        const esc = l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<text x="40" y="${startY + idx * 56}" font-family="Arial, Helvetica, sans-serif" font-size="44" fill="#000000" font-weight="bold">${esc}</text>`;
      }).join('\n');

      const svg = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
        <rect width="512" height="512" fill="#ffffff"/>
        ${textSvg}
      </svg>`;

      const fPath = path.join(tmpDir, `frame_${String(i).padStart(3, '0')}.png`);
      await sharp(Buffer.from(svg)).png().toFile(fPath);
    }

    const outMp4 = path.join(tmpDir, 'brat.mp4');
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(path.join(tmpDir, 'frame_%03d.png'))
        .inputOptions(['-framerate 2'])
        .outputOptions(['-c:v libx264', '-pix_fmt yuv420p', '-t 15', '-movflags +faststart'])
        .output(outMp4)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    const buf = await fs.promises.readFile(outMp4);
    await fs.promises.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    return buf;
  } catch (err) {
    await fs.promises.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    throw err;
  }
}

// Audio filters — apply ffmpeg audio effect and return mp3 buffer
const AUDIO_FILTERS = {
  bass:      'bass=g=20,dynaudnorm=f=200',
  earrape:   'acrusher=level_in=8:level_out=18:bits=8:mode=log:aa=1',
  nightcore: 'asetrate=44100*1.25,aresample=44100,atempo=1.06',
  robot:     'afftfilt=real=\'hypot(re,im)*sin(0)\':imag=\'hypot(re,im)*cos(0)\':win_size=512:overlap=0.75',
  reverse:   'areverse',
  slow:      'atempo=0.75',
  fast:      'atempo=1.5',
  deep:      'asetrate=44100*0.8,aresample=44100,atempo=1.0',
  smooth:    'lowpass=f=2000,acompressor',
  blown:     'acrusher=level_in=4:level_out=4:bits=8:mode=log',
  reverb:    'aecho=0.8:0.88:60:0.4',
  echo:      'aecho=0.8:0.9:1000:0.3',
  vaporwave: 'asetrate=44100*0.8,aresample=44100,aecho=0.8:0.88:60:0.4',
  chipmunk:  'asetrate=44100*1.6,aresample=44100',
  slowed:    'atempo=0.85,aecho=0.8:0.88:80:0.4',
  lofi:      'lowpass=f=3500,aecho=0.6:0.7:80:0.25,acompressor=threshold=0.1:ratio=4:attack=200:release=1000',
  // Shortcuts
  bs:        'bass=g=20,dynaudnorm=f=200',
  er:        'acrusher=level_in=8:level_out=18:bits=8:mode=log:aa=1',
  nc:        'asetrate=44100*1.25,aresample=44100,atempo=1.06',
  rb:        'afftfilt=real=\'hypot(re,im)*sin(0)\':imag=\'hypot(re,im)*cos(0)\':win_size=512:overlap=0.75',
  rev:       'areverse',
  slw:       'atempo=0.75',
  fst:       'atempo=1.5',
  dp:        'asetrate=44100*0.8,aresample=44100,atempo=1.0',
  smt:       'lowpass=f=2000,acompressor',
  bln:       'acrusher=level_in=4:level_out=4:bits=8:mode=log',
  rvb:       'aecho=0.8:0.88:60:0.4',
  ec:        'aecho=0.8:0.9:1000:0.3',
  vw:        'asetrate=44100*0.8,aresample=44100,aecho=0.8:0.88:60:0.4',
  cm:        'asetrate=44100*1.6,aresample=44100',
  slwd:      'atempo=0.85,aecho=0.8:0.88:80:0.4',
  lf:        'lowpass=f=3500,aecho=0.6:0.7:80:0.25,acompressor=threshold=0.1:ratio=4:attack=200:release=1000',
};

export const AUDIO_EFFECT_NAMES = Object.keys(AUDIO_FILTERS);

export async function applyAudioEffect(buffer, effect) {
  const filter = AUDIO_FILTERS[effect];
  if (!filter) throw new Error(`Efek "${effect}" tidak tersedia`);

  const tmpIn = path.join(os.tmpdir(), `fx_in_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const tmpOut = path.join(os.tmpdir(), `fx_out_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`);
  await fs.promises.writeFile(tmpIn, buffer);

  return new Promise((resolve, reject) => {
    ffmpeg(tmpIn)
      .noVideo()
      .audioFilter(filter)
      .audioCodec('libmp3lame')
      .audioBitrate(128)
      .save(tmpOut)
      .on('end', async () => {
        try {
          const out = await fs.promises.readFile(tmpOut);
          await Promise.allSettled([fs.promises.unlink(tmpIn), fs.promises.unlink(tmpOut)]);
          resolve(out);
        } catch (err) { reject(err); }
      })
      .on('error', async (err) => {
        await Promise.allSettled([fs.promises.unlink(tmpIn), fs.promises.unlink(tmpOut)]);
        reject(err);
      });
  });
}

// ─── Shazam Recognition ──────────────────────────────────────────────────────
export async function shazamRecognize(audioBuffer) {
  const tmpIn = path.join(os.tmpdir(), `shzm_in_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const tmpPcm = path.join(os.tmpdir(), `shzm_pcm_${Date.now()}_${Math.random().toString(36).slice(2)}.raw`);
  await fs.promises.writeFile(tmpIn, audioBuffer);

  try {
    // Cut to max 8-9 seconds for instant fingerprinting (<200ms)
    await new Promise((resolve, reject) => {
      ffmpeg(tmpIn)
        .inputOptions(['-t', '9'])
        .noVideo()
        .audioFrequency(16000)
        .audioChannels(1)
        .audioCodec('pcm_s16le')
        .format('s16le')
        .save(tmpPcm)
        .on('end', resolve)
        .on('error', reject);
    });

    const pcm = await fs.promises.readFile(tmpPcm);
    const samples = ShazamAPI.s16LEToSamplesArray(pcm);
    const shazam = new ShazamAPI.Shazam({ language: 'id' });
    const res = await shazam.fullRecognizeSong(samples);
    if (!res || !res.track) return null;

    const track = res.track;
    return {
      title: track.title || '',
      artist: track.subtitle || '',
      album: track.sections?.[0]?.metadata?.find(m => m.title === 'Album')?.text || '',
      label: track.sections?.[0]?.metadata?.find(m => m.title === 'Label')?.text || '',
      released: track.sections?.[0]?.metadata?.find(m => m.title === 'Released')?.text || '',
      coverUrl: track.images?.coverarthq || track.images?.coverart || track.share?.image || '',
      shazamUrl: track.share?.href || '',
      spotifyUrl: track.hub?.options?.find(o => o.actions?.some(a => a.uri?.includes('spotify')))?.actions?.find(a => a.uri?.includes('spotify'))?.uri || '',
    };
  } finally {
    await Promise.allSettled([fs.promises.unlink(tmpIn), fs.promises.unlink(tmpPcm)]);
  }
}

// ─── IMAGEMAGICK CORE ENGINE ────────────────────────────────────────────────
const localMagick = path.resolve(process.cwd(), 'bin', 'imagemagick', process.platform === 'win32' ? 'magick.exe' : 'magick');
export const MAGICK_BIN = fs.existsSync(localMagick) ? localMagick : 'magick';

export async function applyImageMagick(buffer, magickArgs = [], outFormat = 'png') {
  return new Promise((resolve, reject) => {
    const args = ['-', ...magickArgs, `${outFormat}:-`];
    const proc = spawn(MAGICK_BIN, args);
    const stdoutChunks = [];
    const stderrChunks = [];

    const timeout = setTimeout(() => {
      try { proc.kill('SIGKILL'); } catch {}
      reject(new Error('ImageMagick processing timed out (15s limit)'));
    }, 15000);

    proc.stdout.on('data', chunk => stdoutChunks.push(chunk));
    proc.stderr.on('data', chunk => stderrChunks.push(chunk));

    proc.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0 && stdoutChunks.length > 0) {
        resolve(Buffer.concat(stdoutChunks));
      } else {
        const errText = Buffer.concat(stderrChunks).toString().trim();
        reject(new Error(errText || `ImageMagick process exited with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    proc.stdin.write(buffer);
    proc.stdin.end();
  });
}

export const IMAGEMAGICK_EFFECTS = {
  blur: (buf, val = '0x8') => applyImageMagick(buf, ['-blur', String(val).includes('x') ? val : `0x${val}`]),
  charcoal: (buf, val = '2') => applyImageMagick(buf, ['-charcoal', String(val)]),
  paint: (buf, val = '6') => applyImageMagick(buf, ['-paint', String(val)]),
  sketch: (buf, val = '0x2+120') => applyImageMagick(buf, ['-sketch', String(val)]),
  emboss: (buf, val = '0x2') => applyImageMagick(buf, ['-emboss', String(val).includes('x') ? val : `0x${val}`]),
  edge: (buf, val = '2') => applyImageMagick(buf, ['-edge', String(val)]),
  negate: (buf) => applyImageMagick(buf, ['-negate']),
  sepia: (buf, val = '80%') => applyImageMagick(buf, ['-sepia-tone', String(val).includes('%') ? val : `${val}%`]),
  swirl: (buf, val = '180') => applyImageMagick(buf, ['-swirl', String(val)]),
  implode: (buf, val = '0.5') => applyImageMagick(buf, ['-implode', String(val)]),
  solarize: (buf, val = '50%') => applyImageMagick(buf, ['-solarize', String(val).includes('%') ? val : `${val}%`]),
  polaroid: (buf, val = '0') => applyImageMagick(buf, ['-polaroid', String(val)]),
  rotate: (buf, val = '90') => applyImageMagick(buf, ['-rotate', String(val)]),
  flip: (buf) => applyImageMagick(buf, ['-flip']),
  flop: (buf) => applyImageMagick(buf, ['-flop']),
  grayscale: (buf) => applyImageMagick(buf, ['-colorspace', 'Gray']),
  sharpen: (buf, val = '0x3') => applyImageMagick(buf, ['-sharpen', String(val).includes('x') ? val : `0x${val}`]),
  wave: (buf, val = '10x100') => applyImageMagick(buf, ['-wave', String(val)]),
  vignette: (buf, val = '0x20') => applyImageMagick(buf, ['-vignette', String(val).includes('x') ? val : `0x${val}`])
};
