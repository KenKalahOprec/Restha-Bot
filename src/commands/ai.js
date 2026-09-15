import config from '../../config.js';
import { askAI } from '../libs/ai.js';

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

