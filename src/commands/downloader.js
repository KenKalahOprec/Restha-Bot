import config from '../../config.js';
import ytdlp from 'yt-dlp-exec';
import {
  downloadVideoWithMeta,
  downloadMediaPlaylist,
  downloadAudioUrl,
  downloadSpotifySpotdl,
  downloadTikTok,
  searchImage
} from '../libs/media.js';
import { downloadInstagram } from '../libs/instagram.js';
import { formatNumber, formatDuration } from '../libs/format.js';

export const playSessions = new Map();

export async function handlePlay(sock, m, { jid, q }) {
  if (!q) return sock.sendMessage(jid, { text: `Format: ${config.prefix}play <judul lagu / url>` }, { quoted: m });

  // Input langsung link YouTube
  if (/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/i.test(q)) {
    await sock.sendMessage(jid, { text: 'Sedang mengunduh audio YouTube...' }, { quoted: m });
    try {
      const audioBuffer = await downloadAudioUrl(q);
      await sock.sendMessage(jid, { audio: audioBuffer, mimetype: 'audio/mp4', ptt: false }, { quoted: m });
    } catch (err) {
      await sock.sendMessage(jid, { text: `Gagal memproses audio: ${err.message}` }, { quoted: m });
    }
    return;
  }

  // Cari 5 lagu terbaik
  await sock.sendMessage(jid, { text: `Mencari 5 pilihan lagu terbaik untuk "${q}"...` }, { quoted: m });
  try {
    const info = await ytdlp(`ytsearch5:${q}`, { dumpSingleJson: true, flatPlaylist: true });
    const rawEntries = info.entries || [info];
    const entries = rawEntries.slice(0, 5).map((item, idx) => ({
      index: idx + 1,
      title: item.title,
      url: item.webpage_url || item.url || (item.id ? `https://www.youtube.com/watch?v=${item.id}` : ''),
      duration: item.duration_string || (item.duration ? `${item.duration}s` : '-'),
      channel: item.uploader || item.channel || 'YouTube'
    }));

    if (!entries.length) {
      return sock.sendMessage(jid, { text: `Tidak ditemukan lagu untuk "${q}".` }, { quoted: m });
    }

    playSessions.set(jid, { items: entries, timestamp: Date.now() });

    let listText = `┌── [ YOUTUBE PLAY › PILIH LAGU ]\n`;
    listText += `│ Query : "${q}"\n`;
    listText += `│ Balas pesan ini atau ketik angka (1 - ${entries.length})\n│\n`;
    entries.forEach(item => {
      listText += `│ ${item.index}. ${item.title}\n`;
      listText += `│    Durasi: ${item.duration} | Channel: ${item.channel}\n`;
    });
    listText += `└──\n\nKetik angka 1-${entries.length} untuk memutar lagu pilihanmu.`;

    const topThumb = rawEntries[0]?.thumbnails?.[0]?.url || (rawEntries[0]?.id ? `https://i.ytimg.com/vi/${rawEntries[0].id}/hqdefault.jpg` : null);
    if (topThumb) {
      try {
        const thumbRes = await fetch(topThumb, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) });
        if (thumbRes.ok) {
          const thumbBuf = Buffer.from(await thumbRes.arrayBuffer());
          await sock.sendMessage(jid, { image: thumbBuf, caption: listText }, { quoted: m });
          return;
        }
      } catch {}
    }

    await sock.sendMessage(jid, { text: listText }, { quoted: m });
  } catch (err) {
    await sock.sendMessage(jid, { text: `Gagal mencari lagu: ${err.message}` }, { quoted: m });
  }
}

export async function handleYtmp3(sock, m, { jid, q }) {
  if (!q) return sock.sendMessage(jid, { text: `Format: ${config.prefix}ytmp3 <url atau judul lagu>` }, { quoted: m });
  await sock.sendMessage(jid, { text: 'Sedang mengunduh dan mengonversi audio...' }, { quoted: m });
  try {
    const audioBuffer = await downloadAudioUrl(q);
    if (!audioBuffer || audioBuffer.length === 0) throw new Error('Audio tidak dapat diunduh');
    await sock.sendMessage(jid, { audio: audioBuffer, mimetype: 'audio/mp4', ptt: false }, { quoted: m });
  } catch (err) {
    await sock.sendMessage(jid, { text: `Gagal memproses audio: ${err.message}` }, { quoted: m });
  }
}

export async function handleYtmp4(sock, m, { jid, q, cmd }) {
  if (!q) return sock.sendMessage(jid, { text: `Format: ${config.prefix}${cmd} <url atau judul video>` }, { quoted: m });
  await sock.sendMessage(jid, { text: 'Sedang mengunduh video YouTube...' }, { quoted: m });
  try {
    const { buffer, meta } = await downloadVideoWithMeta(q);
    if (!buffer || buffer.length === 0) throw new Error('Video tidak dapat diunduh');
    let caption = '';
    if (meta) {
      caption = `Judul: ${meta.title || '-'}\nChannel: ${meta.uploader || meta.channel || '-'}\nDurasi: ${formatDuration(meta.duration)}\nDilihat: ${formatNumber(meta.view_count)}\nDisukai: ${formatNumber(meta.like_count)}`;
      if (meta.comment_count) caption += `\nKomentar: ${formatNumber(meta.comment_count)}`;
    }
    await sock.sendMessage(jid, { video: buffer, mimetype: 'video/mp4', caption: caption.trim() }, { quoted: m });
  } catch (err) {
    await sock.sendMessage(jid, { text: `Gagal memproses video: ${err.message}` }, { quoted: m });
  }
}

export async function handleTiktok(sock, m, { jid, q }) {
  if (!q) return sock.sendMessage(jid, { text: `Format: ${config.prefix}tiktok <url>` }, { quoted: m });
  await sock.sendMessage(jid, { text: 'Sedang mengunduh video TikTok...' }, { quoted: m });
  try {
    const tt = await downloadTikTok(q);
    if (tt?.images && tt.images.length > 0) {
      const d = tt.data || {};
      const caption = `📸 *TikTok Slide Image*\n\nJudul: ${d.title || '-'}\nPengguna: ${d.author?.nickname || '-'} (@${d.author?.unique_id || '-'})\nTotal Foto: ${tt.images.length}`;
      await sock.sendMessage(jid, { text: caption }, { quoted: m });
      // Kirim setiap gambar slide (batasi maks 10 foto agar tidak spam)
      const maxImgs = tt.images.slice(0, 10);
      for (let i = 0; i < maxImgs.length; i++) {
        await sock.sendMessage(jid, { image: { url: maxImgs[i] }, caption: `Foto ${i + 1}/${maxImgs.length}` });
      }
      return;
    }

    if (tt?.buffer) {
      const d = tt.data || {};
      let caption = `Judul: ${d.title || '-'}\nPengguna: ${d.author?.nickname || '-'} (@${d.author?.unique_id || '-'})\nDurasi: ${formatDuration(d.duration)}\nDilihat: ${formatNumber(d.play_count)}\nDisukai: ${formatNumber(d.digg_count)}\nKomentar: ${formatNumber(d.comment_count)}\nDibagikan: ${formatNumber(d.share_count)}\nDisimpan: ${formatNumber(d.collect_count)}\nMusik: ${d.music_info?.title || '-'}`;
      await sock.sendMessage(jid, { video: tt.buffer, mimetype: 'video/mp4', caption }, { quoted: m });
      return;
    }

    const { buffer, meta } = await downloadVideoWithMeta(q);
    if (!buffer || buffer.length === 0) throw new Error('Video TikTok tidak dapat diunduh');
    let caption = '';
    if (meta) {
      caption = `Judul: ${meta.title || '-'}\nPengguna: ${meta.uploader || meta.channel || '-'}\nDurasi: ${formatDuration(meta.duration)}\nDilihat: ${formatNumber(meta.view_count)}\nDisukai: ${formatNumber(meta.like_count)}`;
    }
    await sock.sendMessage(jid, { video: buffer, mimetype: 'video/mp4', caption: caption.trim() }, { quoted: m });
  } catch (err) {
    await sock.sendMessage(jid, { text: `Gagal memproses TikTok: ${err.message}` }, { quoted: m });
  }
}

export async function handleTiktokMp3(sock, m, { jid, q }) {
  if (!q) return sock.sendMessage(jid, { text: `Format: ${config.prefix}tiktokmp3 <url tiktok>` }, { quoted: m });
  await sock.sendMessage(jid, { text: '🎵 Sedang mengunduh audio TikTok...' }, { quoted: m });
  try {
    const audioBuf = await downloadAudioUrl(q);
    if (!audioBuf || audioBuf.length === 0) throw new Error('Audio TikTok tidak dapat diunduh atau kosong');
    await sock.sendMessage(jid, { audio: audioBuf, mimetype: 'audio/mp4' }, { quoted: m });
  } catch (err) {
    await sock.sendMessage(jid, { text: `Gagal mengunduh audio TikTok: ${err.message}` }, { quoted: m });
  }
}

export async function handleInstagram(sock, m, { jid, q }) {
  if (!q) return sock.sendMessage(jid, { text: `Format: ${config.prefix}ig <url_post / reel / story>` }, { quoted: m });
  await sock.sendMessage(jid, { text: 'Sedang mengunduh media Instagram (Video/Foto/Story)...' }, { quoted: m });

  try {
    // 1. Coba melalui engine SaveInsta (Mendukung Story, Reels, Post Foto & Video)
    const igData = await downloadInstagram(q);
    const { videos, photos } = igData;

    let sentCount = 0;

    // Kirim seluruh video jika ada
    for (const vUrl of videos) {
      await sock.sendMessage(jid, {
        video: { url: vUrl },
        mimetype: 'video/mp4',
        caption: 'Instagram Video / Story'
      }, { quoted: m });
      sentCount++;
    }

    // Kirim seluruh foto jika ada
    for (const pUrl of photos) {
      await sock.sendMessage(jid, {
        image: { url: pUrl },
        caption: 'Instagram Photo / Slide'
      }, { quoted: m });
      sentCount++;
    }

    if (sentCount > 0) return;
  } catch (err) {
    // Jika SaveInsta gagal atau link reels direct, fallback ke yt-dlp
  }

  // 2. Fallback engine yt-dlp (Mendukung Video, Foto & Post Carousel)
  try {
    const { files, meta } = await downloadMediaPlaylist(q);
    if (files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const filePath = files[i];
        const isVid = filePath.endsWith('.mp4') || filePath.endsWith('.mkv') || filePath.endsWith('.webm');
        const buf = await fs.promises.readFile(filePath);
        await fs.promises.unlink(filePath).catch(() => {});

        if (isVid) {
          await sock.sendMessage(jid, {
            video: buf,
            mimetype: 'video/mp4',
            caption: files.length > 1 ? `Instagram Media ${i + 1}/${files.length}` : (meta?.title || 'Instagram Video')
          }, { quoted: m });
        } else {
          await sock.sendMessage(jid, {
            image: buf,
            caption: files.length > 1 ? `Instagram Photo ${i + 1}/${files.length}` : (meta?.title || 'Instagram Photo')
          }, { quoted: m });
        }
      }
      return;
    }

    const { buffer, meta: singleMeta } = await downloadVideoWithMeta(q);
    if (buffer && buffer.length > 0) {
      await sock.sendMessage(jid, {
        video: buffer,
        mimetype: 'video/mp4',
        caption: singleMeta?.title || 'Instagram Video'
      }, { quoted: m });
      return;
    }

    throw new Error('Media Instagram tidak dapat diunduh');
  } catch (err) {
    const rawMsg = err.message || '';
    const cleanMsg = rawMsg
      .split('\n')
      .filter(l => !l.includes('yt-dlp') && !l.includes('--format') && !l.includes('ffmpeg-installer') && !l.includes('Command failed'))
      .map(l => l.trim())
      .filter(Boolean)
      .slice(-2)
      .join(' ') || 'Akun privat atau konten tidak dapat diakses publik.';
    await sock.sendMessage(jid, { text: `[ERROR] Gagal memproses Instagram: ${cleanMsg}` }, { quoted: m });
  }
}

export async function handleIgStory(sock, m, { jid, q }) {
  if (!q) return sock.sendMessage(jid, { text: `Format: ${config.prefix}igstory <url story / username>` }, { quoted: m });
  let target = q.trim();
  if (!target.startsWith('http')) {
    target = `https://www.instagram.com/stories/${target.replace(/^@/, '')}/`;
  }
  return handleInstagram(sock, m, { jid, q: target });
}

export async function handleFacebook(sock, m, { jid, q }) {
  if (!q) return sock.sendMessage(jid, { text: `Format: ${config.prefix}fb <url>` }, { quoted: m });
  await sock.sendMessage(jid, { text: 'Sedang mengunduh video Facebook...' }, { quoted: m });
  try {
    const { buffer, meta } = await downloadVideoWithMeta(q);
    if (!buffer || buffer.length === 0) throw new Error('Video Facebook tidak dapat diunduh');
    let caption = '';
    if (meta) {
      caption = `Judul: ${meta.title || 'Facebook Video'}\nPengguna: ${meta.uploader || '-'}\nDurasi: ${formatDuration(meta.duration)}`;
    }
    await sock.sendMessage(jid, { video: buffer, mimetype: 'video/mp4', caption: caption.trim() }, { quoted: m });
  } catch (err) {
    await sock.sendMessage(jid, { text: `Gagal memproses Facebook: ${err.message}` }, { quoted: m });
  }
}

export async function handleMusicStreaming(sock, m, { jid, q, cmd }) {
  if (!q) return sock.sendMessage(jid, { text: `Format: ${config.prefix}${cmd} <judul/link lagu>` }, { quoted: m });
  await sock.sendMessage(jid, { text: `🎧 Sedang memproses dan mengunduh musik "${q}"...` }, { quoted: m });
  try {
    const isSc = cmd === 'soundcloud' || cmd === 'sc';
    let album = isSc ? 'SoundCloud' : 'Spotify';
    let title = q;
    let artist = '-';
    let duration = '-';
    let coverBuf = null;

    const isUrl = /^https?:\/\//i.test(q.trim());
    const isSpotifyUrl = isUrl && /spotify\.com\/(track|album|playlist)\//i.test(q);
    const isScUrl = isUrl && /soundcloud\.com\//i.test(q);

    // SoundCloud oEmbed — no key needed
    if (isSc && isScUrl) {
      try {
        const r = await fetch(`https://soundcloud.com/oembed?url=${encodeURIComponent(q.trim())}&format=json`, { signal: AbortSignal.timeout(5000) });
        if (r.ok) {
          const d = await r.json();
          if (d.title) title = d.title;
          if (d.author_name) artist = d.author_name;
          if (d.thumbnail_url) {
            const ir = await fetch(d.thumbnail_url);
            if (ir.ok) coverBuf = Buffer.from(await ir.arrayBuffer());
          }
        }
      } catch {}
    }

    // Spotify oEmbed — no key needed
    if (isSpotifyUrl) {
      try {
        const r = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(q.trim())}`, { signal: AbortSignal.timeout(5000) });
        if (r.ok) {
          const d = await r.json();
          if (d.title) title = d.title;
          if (d.thumbnail_url) {
            const ir = await fetch(d.thumbnail_url);
            if (ir.ok) coverBuf = Buffer.from(await ir.arrayBuffer());
          }
        }
      } catch {}
    }

    // Plain keyword → iTunes for metadata + cover
    if (!isUrl) {
      try {
        const r = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&limit=1`, { signal: AbortSignal.timeout(5000) });
        if (r.ok) {
          const d = await r.json();
          const track = d.results?.[0];
          if (track) {
            title = track.trackName || title;
            artist = track.artistName || artist;
            album = track.collectionName || album;
            duration = formatDuration(track.trackTimeMillis / 1000);
            const coverUrl = track.artworkUrl100?.replace('100x100', '600x600');
            if (coverUrl) {
              const ir = await fetch(coverUrl);
              if (ir.ok) coverBuf = Buffer.from(await ir.arrayBuffer());
            }
          }
        }
      } catch {}
    }

    const infoCaption = `┌── [ ${cmd.toUpperCase()} MUSIC ]\n│ Judul  : ${title}\n│ Artis  : ${artist}\n│ Album  : ${album}\n│ Durasi : ${duration}\n└──`;

    if (coverBuf) {
      await sock.sendMessage(jid, { image: coverBuf, caption: infoCaption }, { quoted: m });
    } else {
      await sock.sendMessage(jid, { text: infoCaption }, { quoted: m });
    }

    // Download: NEVER pass Spotify/SC URL to yt-dlp (DRM). Always use title+artist as YT search.
    const downloadQuery = isUrl
      ? (title !== q ? `${title} ${artist !== '-' ? artist : ''}`.trim() : q)
      : (artist !== '-' ? `${title} ${artist}` : title);

    const audioBuf = await downloadAudioUrl(isScUrl ? q : downloadQuery);
    if (!audioBuf || audioBuf.length === 0) throw new Error('Audio tidak dapat diunduh atau kosong');

    await sock.sendMessage(jid, {
      audio: audioBuf,
      mimetype: 'audio/mp4',
      ptt: false,
      fileName: `${title}.mp3`
    }, { quoted: m });
  } catch (err) {
    await sock.sendMessage(jid, { text: `Gagal mengunduh musik: ${err.message}` }, { quoted: m });
  }
}

export async function handleGenericDownload(sock, m, { jid, q, cmd }) {
  if (!q) return sock.sendMessage(jid, { text: `Format: ${config.prefix}${cmd} <url/query>` }, { quoted: m });
  await sock.sendMessage(jid, { text: `⏳ Sedang memproses ${cmd} untuk link/query: ${q}...` }, { quoted: m });
  try {
    if (q.startsWith('http')) {
      const { buffer } = await downloadVideoWithMeta(q);
      if (!buffer || buffer.length === 0) throw new Error('File tidak dapat diunduh atau kosong');
      await sock.sendMessage(jid, { document: buffer, mimetype: 'application/octet-stream', fileName: `${cmd}_file.mp4` }, { quoted: m });
    } else {
      const imgBuf = await searchImage(`${q} ${cmd}`);
      if (imgBuf) {
        await sock.sendMessage(jid, { image: imgBuf, caption: `Hasil pencarian ${cmd}: "${q}"` }, { quoted: m });
      } else {
        await sock.sendMessage(jid, { text: `Informasi untuk "${q}" pada ${cmd} berhasil diproses.` }, { quoted: m });
      }
    }
  } catch (err) {
    await sock.sendMessage(jid, { text: `Gagal memproses ${cmd}: ${err.message}` }, { quoted: m });
  }
}

