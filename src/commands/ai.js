import config from '../../config.js';
import { askAI } from '../libs/ai.js';
import { searchImage } from '../libs/media.js';

export async function handleAI(sock, m, { jid, q, cmd }) {
  if (!q) return sock.sendMessage(jid, { text: `Format: ${config.prefix}${cmd} <pertanyaan/perintah>` }, { quoted: m });
  await sock.sendMessage(jid, { text: '🤖 Sedang memproses pemikiran AI...' }, { quoted: m });
  try {
    const response = await askAI(q);
    await sock.sendMessage(jid, { text: response }, { quoted: m });
  } catch (err) {
    await sock.sendMessage(jid, { text: `Gagal memproses AI: ${err.message}` }, { quoted: m });
  }
}

export async function handleDraw(sock, m, { jid, q, cmd }) {
  if (!q) return sock.sendMessage(jid, { text: `Format: ${config.prefix}${cmd} <deskripsi gambar>` }, { quoted: m });
  await sock.sendMessage(jid, { text: `🎨 Sedang menggambar AI untuk: "${q}"...` }, { quoted: m });
  try {
    const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(q)}?width=768&height=768&nologo=true`;
    const res = await fetch(imgUrl, { signal: AbortSignal.timeout(25000) });
    if (!res.ok) throw new Error('Server AI Image tidak merespon');
    const imgBuf = Buffer.from(await res.arrayBuffer());
    await sock.sendMessage(jid, { image: imgBuf, caption: `🎨 *AI Image Generator*\n"${q}"` }, { quoted: m });
  } catch {
    const backupBuf = await searchImage(q);
    if (backupBuf) {
      await sock.sendMessage(jid, { image: backupBuf, caption: `🎨 *Hasil Gambar:* "${q}"` }, { quoted: m });
    } else {
      await sock.sendMessage(jid, { text: 'Gagal membuat gambar AI. Coba beberapa saat lagi.' }, { quoted: m });
    }
  }
}

