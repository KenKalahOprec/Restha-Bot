import config from '../../config.js';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import {
  webpToPng,
  webpToGif,
  webpToMp4,
  createStickerImage,
  videoToAnimatedWebp,
  convertToAudio,
  getBratImage,
  searchImage,
  IMAGEMAGICK_EFFECTS,
  applyImageMagick
} from '../libs/media.js';

export async function handleMedia(sock, m, { jid, cmd, args, q, msgType, quoted }) {
  switch (cmd) {
    case 's':
    case 'sgif':
    case 'sticker': {
      const isMedia = msgType === 'imageMessage' || msgType === 'videoMessage';
      const isQuotedMedia = quoted?.type === 'imageMessage' || quoted?.type === 'videoMessage';

      if (!isMedia && !isQuotedMedia) {
        return sock.sendMessage(jid, { text: 'Kirim gambar/video (maks 10 detik) atau reply media dengan caption `.s` atau `.sticker`.' }, { quoted: m });
      }

      await sock.sendMessage(jid, { text: 'Sedang memproses stiker...' }, { quoted: m });
      try {
        const mediaMsg = isMedia ? m : { message: quoted.raw, key: m.key };
        const rawBuffer = await downloadMediaMessage(mediaMsg, 'buffer', {});
        const targetType = (isMedia ? msgType : quoted.type);
        const isVideo = targetType === 'videoMessage';

        const pack = args[0] || config.stickerPack || 'Restha Bot';
        const author = args.slice(1).join(' ') || config.stickerAuthor || 'Jade';

        let stickerBuffer;
        if (isVideo) {
          stickerBuffer = await videoToAnimatedWebp(rawBuffer, pack, author);
        } else {
          stickerBuffer = await createStickerImage(rawBuffer, { pack, author, quality: 75 });
        }

        await sock.sendMessage(jid, { sticker: stickerBuffer }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal membuat stiker: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'brat':
    case 'brattext':
    case 'btext':
    case 'bratg':
    case 'bratgreen':
    case 'bratijo':
    case 'btextg':
    case 'bratb':
    case 'bratblack':
    case 'brathitam':
    case 'btextb': {
      if (!q) {
        return sock.sendMessage(jid, {
          text: `Format: ${config.prefix}${cmd} <teks>\n\nContoh:\n• ${config.prefix}brat halo (putih)\n• ${config.prefix}bratg halo (ijo)\n• ${config.prefix}bratb halo (hitam)`
        }, { quoted: m });
      }

      const isGreen = cmd === 'bratg' || cmd === 'bratgreen' || cmd === 'bratijo' || cmd === 'btextg';
      const isBlack = cmd === 'bratb' || cmd === 'bratblack' || cmd === 'brathitam' || cmd === 'btextb';
      const theme = isGreen ? 'green' : (isBlack ? 'black' : 'white');
      const themeName = isGreen ? 'Ijo' : (isBlack ? 'Hitam' : 'Putih');

      await sock.sendMessage(jid, { text: `Sedang merender stiker Brat (${themeName})...` }, { quoted: m });
      try {
        const imgBuffer = await getBratImage(q, theme);
        const pack = config.stickerPack || 'Brat Generator';
        const author = config.stickerAuthor || 'Restha';
        const stickerBuffer = await createStickerImage(imgBuffer, { pack, author, quality: 80 });
        await sock.sendMessage(jid, { sticker: stickerBuffer }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal membuat Brat: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'toimg': {
      const isSticker = msgType === 'stickerMessage';
      const isQuotedSticker = quoted?.type === 'stickerMessage';
      if (!isSticker && !isQuotedSticker) {
        return sock.sendMessage(jid, { text: 'Reply stiker yang ingin diubah menjadi gambar dengan `.toimg`.' }, { quoted: m });
      }
      await sock.sendMessage(jid, { text: 'Sedang mengonversi stiker ke gambar...' }, { quoted: m });
      try {
        const mediaMsg = isSticker ? m : { message: quoted.raw, key: m.key };
        const rawBuffer = await downloadMediaMessage(mediaMsg, 'buffer', {});
        const pngBuffer = await webpToPng(rawBuffer);
        await sock.sendMessage(jid, { image: pngBuffer, caption: '✅ Konversi stiker selesai.' }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal konversi ke gambar: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'togif':
    case 'tovideo': {
      const isSticker = msgType === 'stickerMessage';
      const isQuotedSticker = quoted?.type === 'stickerMessage';
      if (!isSticker && !isQuotedSticker) {
        return sock.sendMessage(jid, { text: `Reply stiker animasi dengan *${config.prefix}${cmd}*.` }, { quoted: m });
      }
      await sock.sendMessage(jid, { text: 'Sedang mengonversi stiker animasi ke MP4 video...' }, { quoted: m });
      try {
        const mediaMsg = isSticker ? m : { message: quoted.raw, key: m.key };
        const rawBuffer = await downloadMediaMessage(mediaMsg, 'buffer', {});
        const mp4Buffer = await webpToMp4(rawBuffer);
        await sock.sendMessage(jid, { video: mp4Buffer, caption: '✅ Konversi stiker animasi ke video selesai.' }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal konversi video: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'tomp3':
    case 'getaudio': {
      const isVideo = msgType === 'videoMessage';
      const isQuotedVideo = quoted?.type === 'videoMessage' || quoted?.type === 'audioMessage';
      if (!isVideo && !isQuotedVideo) {
        return sock.sendMessage(jid, { text: 'Kirim atau reply video/audio yang ingin diubah menjadi MP3.' }, { quoted: m });
      }
      await sock.sendMessage(jid, { text: '🎵 Sedang mengonversi media ke MP3...' }, { quoted: m });
      try {
        const mediaMsg = isVideo ? m : { message: quoted.raw, key: m.key };
        const rawBuf = await downloadMediaMessage(mediaMsg, 'buffer', {});
        const audioBuf = await convertToAudio(rawBuf, false);
        await sock.sendMessage(jid, { audio: audioBuf, mimetype: 'audio/mp4', ptt: false, fileName: `audio_${Date.now()}.mp3` }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal mengonversi MP3: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'tovn': {
      const isMedia = msgType === 'videoMessage' || msgType === 'audioMessage';
      const isQuotedMedia = quoted?.type === 'videoMessage' || quoted?.type === 'audioMessage';
      if (!isMedia && !isQuotedMedia) {
        return sock.sendMessage(jid, { text: 'Kirim atau reply video/audio yang ingin diubah menjadi VN.' }, { quoted: m });
      }
      await sock.sendMessage(jid, { text: '🎙️ Sedang mengonversi ke Voice Note...' }, { quoted: m });
      try {
        const mediaMsg = isMedia ? m : { message: quoted.raw, key: m.key };
        const rawBuf = await downloadMediaMessage(mediaMsg, 'buffer', {});
        const vnBuf = await convertToAudio(rawBuf, true);
        await sock.sendMessage(jid, { audio: vnBuf, mimetype: 'audio/mp4', ptt: true }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal mengonversi VN: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'rvo':
    case 'readviewonce': {
      if (!quoted || !quoted.raw) {
        return sock.sendMessage(jid, { text: 'Reply pesan View-Once (Sekali Lihat) yang ingin dibuka.' }, { quoted: m });
      }
      try {
        const targetRaw = quoted.raw;
        let innerMsg = targetRaw.viewOnceMessage?.message || targetRaw.viewOnceMessageV2?.message || targetRaw;
        const mediaType = innerMsg.imageMessage ? 'image' : (innerMsg.videoMessage ? 'video' : (innerMsg.audioMessage ? 'audio' : null));
        if (!mediaType) {
          return sock.sendMessage(jid, { text: 'Pesan yang direply bukan pesan View-Once bergambar/video.' }, { quoted: m });
        }
        const buffer = await downloadMediaMessage({ message: innerMsg, key: quoted.key || m.key }, 'buffer', {});
        const caption = innerMsg[`${mediaType}Message`]?.caption || '🔓 *Pesan View-Once Berhasil Dibuka*';
        if (mediaType === 'image') {
          await sock.sendMessage(jid, { image: buffer, caption }, { quoted: m });
        } else if (mediaType === 'video') {
          await sock.sendMessage(jid, { video: buffer, caption }, { quoted: m });
        } else if (mediaType === 'audio') {
          await sock.sendMessage(jid, { audio: buffer, mimetype: 'audio/mp4' }, { quoted: m });
        }
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal membuka View-Once: ${err.message}` }, { quoted: m });
      }
      break;
    }

    // ─── IMAGEMAGICK FILTERS & IMAGE PROCESSING ─────────────────────────────
    case 'blur':
    case 'charcoal':
    case 'paint':
    case 'oilpaint':
    case 'sketch':
    case 'emboss':
    case 'edge':
    case 'negate':
    case 'invert':
    case 'sepia':
    case 'swirl':
    case 'implode':
    case 'solarize':
    case 'polaroid':
    case 'rotate':
    case 'flip':
    case 'flop':
    case 'mirror':
    case 'grayscale':
    case 'blackwhite':
    case 'bw':
    case 'sharpen':
    case 'wave':
    case 'vignette': {
      const isImg = msgType === 'imageMessage' || msgType === 'stickerMessage';
      const isQuotedImg = quoted?.type === 'imageMessage' || quoted?.type === 'stickerMessage';
      if (!isImg && !isQuotedImg) {
        return sock.sendMessage(jid, { text: `Kirim atau reply gambar/stiker dengan *${config.prefix}${cmd}* [opsi].` }, { quoted: m });
      }

      await sock.sendMessage(jid, { text: `🎨 Menerapkan efek ImageMagick: *${cmd.toUpperCase()}*...` }, { quoted: m });
      try {
        const mediaMsg = isImg ? m : { message: quoted.raw, key: m.key };
        let rawBuf = await downloadMediaMessage(mediaMsg, 'buffer', {});
        if ((isImg ? msgType : quoted.type) === 'stickerMessage') {
          rawBuf = await webpToPng(rawBuf);
        }

        const effectMap = {
          paint: 'paint',
          oilpaint: 'paint',
          negate: 'negate',
          invert: 'negate',
          flop: 'flop',
          mirror: 'flop',
          grayscale: 'grayscale',
          blackwhite: 'grayscale',
          bw: 'grayscale'
        };

        const targetEffect = effectMap[cmd] || cmd;
        const effectFn = IMAGEMAGICK_EFFECTS[targetEffect];
        if (!effectFn) throw new Error(`Efek "${cmd}" tidak terdaftar`);

        const outBuf = await effectFn(rawBuf, q || undefined);
        await sock.sendMessage(jid, {
          image: outBuf,
          caption: `✨ *ImageMagick Filter:* [${cmd.toUpperCase()}]\n⚙️ Engine: ImageMagick 7 Q8`
        }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal memproses gambar: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'magick':
    case 'im': {
      const isImg = msgType === 'imageMessage' || msgType === 'stickerMessage';
      const isQuotedImg = quoted?.type === 'imageMessage' || quoted?.type === 'stickerMessage';
      if (!isImg && !isQuotedImg) {
        return sock.sendMessage(jid, { text: `Kirim atau reply gambar dengan *${config.prefix}magick <flags>*\nContoh: *${config.prefix}magick -rotate 90 -sepia-tone 80%*` }, { quoted: m });
      }
      if (!args.length) {
        return sock.sendMessage(jid, { text: `Masukkan parameter ImageMagick.\nContoh: *${config.prefix}magick -blur 0x8* atau *${config.prefix}magick -negate*` }, { quoted: m });
      }

      await sock.sendMessage(jid, { text: `⚙️ Menjalankan ImageMagick CLI [${args.join(' ')}]...` }, { quoted: m });
      try {
        const mediaMsg = isImg ? m : { message: quoted.raw, key: m.key };
        let rawBuf = await downloadMediaMessage(mediaMsg, 'buffer', {});
        if ((isImg ? msgType : quoted.type) === 'stickerMessage') {
          rawBuf = await webpToPng(rawBuf);
        }

        const outBuf = await applyImageMagick(rawBuf, args);
        await sock.sendMessage(jid, {
          image: outBuf,
          caption: `✨ *ImageMagick Custom Pipeline:*\n\`magick - ${args.join(' ')} out.png\``
        }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal menjalankan ImageMagick: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'emojimix':
    case 'emomix':
    case 'mixemo':
    case 'mix': {
      const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
      const segments = [...segmenter.segment(q || '')].map(s => s.segment);
      const emojis = segments.filter(char => /\p{Extended_Pictographic}/u.test(char));

      if (emojis.length < 2) {
        return sock.sendMessage(jid, {
          text: `┌── [ EMOJI MIX STICKER ]\n` +
            `│ • Gabungkan 2 emoji menjadi stiker unik\n` +
            `│ • Format : ${config.prefix}${cmd} <emot1> <emot2>\n` +
            `│\n` +
            `│ • Contoh :\n` +
            `│   ${config.prefix}${cmd} 😂 😡\n` +
            `│   ${config.prefix}${cmd} 🐱 🔥\n` +
            `│   ${config.prefix}${cmd} 💀 ❤️\n` +
            `└──`
        }, { quoted: m });
      }

      const e1 = emojis[0];
      const e2 = emojis[1];

      await sock.sendMessage(jid, {
        text: `┌── [ MIXING EMOJI ]\n│ • Komposisi : ${e1} + ${e2}\n│ • Status    : Menggabungkan & merender stiker...\n└──`
      }, { quoted: m });

      try {
        const mixUrl = `https://emojik.vercel.app/s/${encodeURIComponent(e1)}_${encodeURIComponent(e2)}?size=512`;
        const res = await fetch(mixUrl, { signal: AbortSignal.timeout(10000) });

        if (!res.ok) {
          throw new Error(`Kombinasi emoji ${e1} dan ${e2} tidak didukung.`);
        }

        const pngBuf = Buffer.from(await res.arrayBuffer());
        const pack = config.stickerPack || 'Emoji Kitchen';
        const author = config.stickerAuthor || 'Restha';
        const stickerBuffer = await createStickerImage(pngBuf, { pack, author, quality: 90 });

        await sock.sendMessage(jid, { sticker: stickerBuffer }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(jid, {
          text: `┌── [ EMOJI MIX ERROR ]\n│ • ${err.message}\n└──`
        }, { quoted: m });
      }
      break;
    }
    }
}

