import { isWelcomeEnabled } from '../libs/groupSettings.js';

export default async function handleGroupParticipantsUpdate(sock, { id, participants, action }) {
  try {
    if (action !== 'add' && action !== 'remove') return;
    if (!isWelcomeEnabled(id)) return; // disabled for this group

    let groupMeta = null;
    try { groupMeta = await sock.groupMetadata(id); } catch {}
    const groupName = groupMeta?.subject || 'Grup';

    for (const participant of participants) {
      const num = participant.split('@')[0];
      let ppBuf = null;
      try {
        const ppUrl = await sock.profilePictureUrl(participant, 'image');
        if (ppUrl) {
          const res = await fetch(ppUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) });
          if (res.ok) ppBuf = Buffer.from(await res.arrayBuffer());
        }
      } catch {}

      if (action === 'add') {
        const text = `👋 *WELCOME TO ${groupName.toUpperCase()}*\n\nHalo @${num}! Selamat datang di grup *${groupName}*.\nSemoga betah, nyaman, dan patuhi rules grup ya! ✨`;
        if (ppBuf) await sock.sendMessage(id, { image: ppBuf, caption: text, mentions: [participant] });
        else await sock.sendMessage(id, { text, mentions: [participant] });
      } else {
        const text = `🚪 *GOODBYE MEMBER*\n\nSelamat tinggal @${num} dari grup *${groupName}*.\nTerima kasih atas kebersamaannya selama ini! 👋`;
        if (ppBuf) await sock.sendMessage(id, { image: ppBuf, caption: text, mentions: [participant] });
        else await sock.sendMessage(id, { text, mentions: [participant] });
      }
    }
  } catch (err) {
    console.error('[Group Update Error]:', err.message);
  }
}
