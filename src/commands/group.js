import config from '../../config.js';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import {
  enableWelcome,
  disableWelcome,
  isWelcomeEnabled,
  isGroupFeatureEnabled,
  setGroupFeature,
  getGroupVote,
  setGroupVote
} from '../libs/groupSettings.js';

export async function handleGroup(sock, m, { jid, isGroup, cmd, args, q, msgType, quoted }) {
  if (!isGroup) return sock.sendMessage(jid, { text: 'Perintah ini hanya dapat digunakan di dalam grup.' }, { quoted: m });

  switch (cmd) {
    case 'kick': {
      const user = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || (quoted ? (quoted.sender || m.message?.extendedTextMessage?.contextInfo?.participant) : null);
      if (!user) return sock.sendMessage(jid, { text: `Tag atau balas pesan anggota yang ingin dikeluarkan.\nContoh: ${config.prefix}kick @user` }, { quoted: m });
      try {
        await sock.groupParticipantsUpdate(jid, [user], 'remove');
        await sock.sendMessage(jid, { text: `✅ Berhasil mengeluarkan @${user.split('@')[0]} dari grup.`, mentions: [user] }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal mengeluarkan anggota: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'promote': {
      const user = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || (quoted ? (quoted.sender || m.message?.extendedTextMessage?.contextInfo?.participant) : null);
      if (!user) return sock.sendMessage(jid, { text: `Tag atau balas pesan anggota yang ingin dijadikan admin.\nContoh: ${config.prefix}promote @user` }, { quoted: m });
      try {
        await sock.groupParticipantsUpdate(jid, [user], 'promote');
        await sock.sendMessage(jid, { text: `✅ Berhasil menaikkan jabatan @${user.split('@')[0]} menjadi admin grup.`, mentions: [user] }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal promote: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'demote': {
      const user = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || (quoted ? (quoted.sender || m.message?.extendedTextMessage?.contextInfo?.participant) : null);
      if (!user) return sock.sendMessage(jid, { text: `Tag atau balas pesan admin yang ingin diturunkan jabatannya.\nContoh: ${config.prefix}demote @user` }, { quoted: m });
      try {
        await sock.groupParticipantsUpdate(jid, [user], 'demote');
        await sock.sendMessage(jid, { text: `✅ Berhasil menurunkan jabatan @${user.split('@')[0]} menjadi anggota biasa.`, mentions: [user] }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal demote: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'mute':
    case 'close':
    case 'groupclose':
    case 'tutupgrup': {
      try {
        await sock.groupSettingUpdate(jid, 'announcement');
        await sock.sendMessage(jid, { text: '🔒 *GRUP DITUTUP:* Hanya admin yang dapat mengirim pesan.' }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal menutup grup: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'unmute':
    case 'open':
    case 'groupopen':
    case 'bukagrup': {
      try {
        await sock.groupSettingUpdate(jid, 'not_announcement');
        await sock.sendMessage(jid, { text: '🔓 *GRUP DIBUKA:* Seluruh anggota sekarang dapat mengirim pesan.' }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal membuka grup: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'hidetag':
    case 'ht':
    case 'tagall': {
      try {
        const metadata = await sock.groupMetadata(jid);
        const participants = metadata.participants.map(p => p.id);
        const messageText = q ? q : (cmd === 'tagall' ? '📢 *PANGGILAN UNTUK SEMUA ANGGOTA GRUP*' : '📢 *PEMBERITAHUAN*');
        let fullText = messageText;
        if (cmd === 'tagall') {
          fullText += '\n\n';
          participants.forEach((p, idx) => {
            fullText += `${idx + 1}. @${p.split('@')[0]}\n`;
          });
        }
        await sock.sendMessage(jid, { text: fullText, mentions: participants });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal melakukan tag: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'setpp':
    case 'setppgc':
    case 'setppgroup': {
      const isImg = msgType === 'imageMessage';
      const isQuotedImg = quoted?.type === 'imageMessage';
      if (!isImg && !isQuotedImg) {
        return sock.sendMessage(jid, { text: `Kirim atau balas gambar dengan caption \`${config.prefix}setpp\`.` }, { quoted: m });
      }
      try {
        const mediaMsg = isImg ? m : { message: quoted.raw, key: m.key };
        const rawBuf = await downloadMediaMessage(mediaMsg, 'buffer', {});
        await sock.updateProfilePicture(jid, rawBuf);
        await sock.sendMessage(jid, { text: '✅ Foto profil grup berhasil diperbarui!' }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal memperbarui foto grup: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'setname':
    case 'setnamegc':
    case 'setnamegroup':
    case 'setsubject': {
      if (!q) return sock.sendMessage(jid, { text: `Format: ${config.prefix}${cmd} <nama baru>` }, { quoted: m });
      try {
        await sock.groupUpdateSubject(jid, q);
        await sock.sendMessage(jid, { text: `✅ Nama grup berhasil diubah menjadi: *${q}*` }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal mengubah nama grup: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'setdesc':
    case 'setdescgc':
    case 'setdescgroup': {
      if (!q) return sock.sendMessage(jid, { text: `Format: ${config.prefix}${cmd} <deskripsi baru>` }, { quoted: m });
      try {
        await sock.groupUpdateDescription(jid, q);
        await sock.sendMessage(jid, { text: '✅ Deskripsi grup berhasil diperbarui!' }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal mengubah deskripsi: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'link':
    case 'linkgc':
    case 'grouplink': {
      try {
        const code = await sock.groupInviteCode(jid);
        await sock.sendMessage(jid, { text: `🔗 *LINK UNDANGAN GRUP:*\nhttps://chat.whatsapp.com/${code}` }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal mengambil link grup: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'revoke':
    case 'resetlink': {
      try {
        const newCode = await sock.groupRevokeInvite(jid);
        await sock.sendMessage(jid, { text: `🔄 *LINK GRUP TELAH DIRESET:*\nhttps://chat.whatsapp.com/${newCode}` }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal mereset link grup: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'listgroup':
    case 'listgc': {
      try {
        const chats = await sock.groupFetchAllParticipating();
        const groups = Object.values(chats);
        let listText = `📋 *DAFTAR GRUP TERHUBUNG (${groups.length})*\n\n`;
        groups.forEach((g, idx) => {
          listText += `${idx + 1}. *${g.subject}*\n   ID: ${g.id}\n   Total Member: ${g.participants?.length || 0}\n\n`;
        });
        await sock.sendMessage(jid, { text: listText.trim() }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal mengambil daftar grup: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'welcome':
    case 'setwelcome': {
      const flag = (args[0] || '').toLowerCase();
      if (flag === 'on') {
        enableWelcome(jid);
        await sock.sendMessage(jid, { text: '✅ *Welcome/Goodbye aktif* di grup ini.' }, { quoted: m });
      } else if (flag === 'off') {
        disableWelcome(jid);
        await sock.sendMessage(jid, { text: '🔕 *Welcome/Goodbye dinonaktifkan* di grup ini.' }, { quoted: m });
      } else {
        const status = isWelcomeEnabled(jid) ? '✅ Aktif' : '🔕 Nonaktif';
        await sock.sendMessage(jid, { text: `Status welcome/goodbye: *${status}*\n\nGunakan:\n• ${config.prefix}welcome on — aktifkan\n• ${config.prefix}welcome off — nonaktifkan` }, { quoted: m });
      }
      break;
    }

    // Toggleable group features
    case 'antibot':
    case 'antivv':
    case 'adminevent':
    case 'groupevent':
    case 'antiforeign':
    case 'antimedia':
    case 'antiaudio':
    case 'antivideo':
    case 'antiimage':
    case 'antidocument':
    case 'antilocation':
    case 'anticontact':
    case 'antisticker':
    case 'antipoll':
    case 'antilink':
    case 'antilinkgc':
    case 'antipromotion':
    case 'antivirtex':
    case 'antivirus':
    case 'antitoxic':
    case 'nsfw': {
      const flag = (args[0] || '').toLowerCase();
      if (flag === 'on') {
        setGroupFeature(jid, cmd, true);
        await sock.sendMessage(jid, { text: `✅ *${cmd.toUpperCase()} AKTIF* di grup ini.` }, { quoted: m });
      } else if (flag === 'off') {
        setGroupFeature(jid, cmd, false);
        await sock.sendMessage(jid, { text: `🔕 *${cmd.toUpperCase()} DINONAKTIFKAN* di grup ini.` }, { quoted: m });
      } else {
        const status = isGroupFeatureEnabled(jid, cmd) ? '✅ Aktif' : '🔕 Nonaktif';
        await sock.sendMessage(jid, {
          text: `Status *${cmd}*: *${status}*\n\nGunakan:\n• ${config.prefix}${cmd} on — aktifkan\n• ${config.prefix}${cmd} off — nonaktifkan`
        }, { quoted: m });
      }
      break;
    }

    case 'listadmin': {
      try {
        const metadata = await sock.groupMetadata(jid);
        const admins = metadata.participants.filter(p => p.admin !== null && p.admin !== undefined);
        let text = `👑 *ADMIN GRUP (${admins.length})*\n\n`;
        admins.forEach((a, i) => {
          text += `${i + 1}. @${a.id.split('@')[0]} [${a.admin}]\n`;
        });
        await sock.sendMessage(jid, { text: text.trim(), mentions: admins.map(a => a.id) }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal mengambil list admin: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'invite': {
      let target = args[0] || (quoted ? (quoted.sender || m.message?.extendedTextMessage?.contextInfo?.participant) : null);
      if (!target) return sock.sendMessage(jid, { text: `Format: ${config.prefix}invite <nomor>` }, { quoted: m });
      target = target.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
      try {
        const code = await sock.groupInviteCode(jid);
        const metadata = await sock.groupMetadata(jid);
        await sock.sendMessage(target, { text: `📩 Undangan bergabung ke grup *${metadata.subject}*:\nhttps://chat.whatsapp.com/${code}` });
        await sock.sendMessage(jid, { text: `✅ Undangan berhasil dikirim ke @${target.split('@')[0]}.`, mentions: [target] }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal mengirim undangan: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'ephemeral': {
      const opt = (args[0] || '').toLowerCase();
      let duration = 0;
      if (opt === 'on' || opt === '24' || opt === '24h' || opt === '1d') duration = 86400;
      else if (opt === '7d' || opt === '7') duration = 604800;
      else if (opt === '90d' || opt === '90') duration = 7776000;
      else if (opt === 'off' || opt === '0') duration = 0;
      else return sock.sendMessage(jid, { text: `Format: ${config.prefix}ephemeral <on / off / 24h / 7d / 90d>` }, { quoted: m });
      try {
        await sock.groupToggleEphemeral(jid, duration);
        await sock.sendMessage(jid, { text: duration ? `⏳ Pesan sementara diatur ke ${args[0]}.` : `❌ Pesan sementara dinonaktifkan.` }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal mengubah ephemeral: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'delete': {
      if (!quoted) return sock.sendMessage(jid, { text: 'Reply pesan yang ingin dihapus.' }, { quoted: m });
      try {
        await sock.sendMessage(jid, { delete: quoted.key });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal menghapus pesan: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'delppgroup':
    case 'delppgc': {
      try {
        await sock.removeProfilePicture(jid);
        await sock.sendMessage(jid, { text: '✅ Foto profil grup berhasil dihapus.' }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal menghapus foto grup: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'add': {
      let target = (args[0] || '').replace(/[^0-9]/g, '');
      if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
        target = m.message.extendedTextMessage.contextInfo.mentionedJid[0].split('@')[0];
      }
      if (!target) return sock.sendMessage(jid, { text: `Format: ${config.prefix}add 628xxx` }, { quoted: m });
      try {
        const userJid = `${target}@s.whatsapp.net`;
        await sock.groupParticipantsUpdate(jid, [userJid], 'add');
        await sock.sendMessage(jid, { text: `✅ Menambahkan @${target} ke grup.`, mentions: [userJid] }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal menambahkan anggota: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'kickall': {
      try {
        const metadata = await sock.groupMetadata(jid);
        const botId = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
        const nonAdmins = metadata.participants
          .filter(p => !p.admin && p.id !== botId)
          .map(p => p.id);
        if (nonAdmins.length === 0) return sock.sendMessage(jid, { text: 'Tidak ada member non-admin untuk dikeluarkan.' }, { quoted: m });
        await sock.groupParticipantsUpdate(jid, nonAdmins, 'remove');
        await sock.sendMessage(jid, { text: `✅ Berhasil mengeluarkan ${nonAdmins.length} anggota non-admin.` }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal kickall: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'promoteall': {
      try {
        const metadata = await sock.groupMetadata(jid);
        const nonAdmins = metadata.participants.filter(p => !p.admin).map(p => p.id);
        if (nonAdmins.length === 0) return sock.sendMessage(jid, { text: 'Semua anggota sudah menjadi admin.' }, { quoted: m });
        await sock.groupParticipantsUpdate(jid, nonAdmins, 'promote');
        await sock.sendMessage(jid, { text: `✅ Berhasil menjadikan ${nonAdmins.length} anggota sebagai admin.` }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal promoteall: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'demoteall': {
      try {
        const metadata = await sock.groupMetadata(jid);
        const botId = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
        const admins = metadata.participants
          .filter(p => p.admin && p.id !== botId && !p.id.includes(config.ownerNumber))
          .map(p => p.id);
        if (admins.length === 0) return sock.sendMessage(jid, { text: 'Tidak ada admin lain untuk diturunkan.' }, { quoted: m });
        await sock.groupParticipantsUpdate(jid, admins, 'demote');
        await sock.sendMessage(jid, { text: `✅ Berhasil menurunkan ${admins.length} admin menjadi anggota biasa.` }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal demoteall: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'getcontact':
    case 'savecontact': {
      let targetUser = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
        || (quoted ? (quoted.sender || m.message?.extendedTextMessage?.contextInfo?.participant) : null);

      if (!targetUser && args?.[0]) {
        let raw = args[0].replace(/[^0-9]/g, '');
        if (raw.startsWith('0')) raw = '62' + raw.slice(1);
        else if (raw.startsWith('8')) raw = '62' + raw;
        if (raw) targetUser = `${raw}@s.whatsapp.net`;
      }
      if (!targetUser) return sock.sendMessage(jid, { text: 'Tag atau reply pesan anggota yang ingin diambil kontaknya.' }, { quoted: m });

      let resolvedJid = targetUser;
      if (targetUser.endsWith('@lid') && isGroup) {
        try {
          const groupMeta = await sock.groupMetadata(jid);
          const member = groupMeta.participants?.find(p => p.lid === targetUser || p.id === targetUser);
          if (member?.id) resolvedJid = member.id;
        } catch {}
      }

      let phoneNum = resolvedJid.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
      if (phoneNum.startsWith('0')) {
        phoneNum = '62' + phoneNum.slice(1);
      } else if (phoneNum.startsWith('8')) {
        phoneNum = '62' + phoneNum;
      }

      const vcard = 'BEGIN:VCARD\n'
        + 'VERSION:3.0\n'
        + `FN:+${phoneNum}\n`
        + `TEL;type=CELL;type=VOICE;waid=${phoneNum}:+${phoneNum}\n`
        + 'END:VCARD';

      await sock.sendMessage(jid, {
        contacts: {
          displayName: `+${phoneNum}`,
          contacts: [{ vcard }]
        }
      }, { quoted: m });
      break;
    }

    case 'sendcontact': {
      let num = (args[0] || '').replace(/[^0-9]/g, '');
      if (num.startsWith('0')) num = '62' + num.slice(1);
      else if (num.startsWith('8')) num = '62' + num;
      const name = args.slice(1).join(' ') || `+${num}`;
      if (!num) return sock.sendMessage(jid, { text: `Format: ${config.prefix}sendcontact <nomor> [nama]` }, { quoted: m });
      const vcard = 'BEGIN:VCARD\n'
        + 'VERSION:3.0\n'
        + `FN:${name}\n`
        + `TEL;type=CELL;type=VOICE;waid=${num}:+${num}\n`
        + 'END:VCARD';
      await sock.sendMessage(jid, {
        contacts: {
          displayName: name,
          contacts: [{ vcard }]
        }
      }, { quoted: m });
      break;
    }

    case 'contactag': {
      try {
        const metadata = await sock.groupMetadata(jid);
        const contacts = metadata.participants.map(p => {
          const num = p.id.split('@')[0];
          return {
            vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${num}\nTEL;type=CELL;type=VOICE;waid=${num}:+${num}\nEND:VCARD`
          };
        });
        await sock.sendMessage(jid, {
          contacts: {
            displayName: `Kontak Grup (${contacts.length})`,
            contacts
          }
        }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal mengirim contactag: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'totag': {
      if (!quoted) return sock.sendMessage(jid, { text: 'Reply pesan yang ingin di-tag ke seluruh member.' }, { quoted: m });
      try {
        const metadata = await sock.groupMetadata(jid);
        const participants = metadata.participants.map(p => p.id);
        await sock.sendMessage(jid, { forward: quoted.raw, mentions: participants });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal totag: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'editinfo': {
      const opt = (args[0] || '').toLowerCase();
      if (opt !== 'open' && opt !== 'close' && opt !== 'buka' && opt !== 'tutup') {
        return sock.sendMessage(jid, { text: `Format: ${config.prefix}editinfo <open/close>\n• open: Semua member bisa ubah info grup\n• close: Hanya admin yang bisa ubah info grup` }, { quoted: m });
      }
      try {
        const isClose = opt === 'close' || opt === 'tutup';
        await sock.groupSettingUpdate(jid, isClose ? 'locked' : 'unlocked');
        await sock.sendMessage(jid, { text: isClose ? '🔒 Hanya admin yang dapat mengedit info grup.' : '🔓 Seluruh anggota dapat mengedit info grup.' }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal mengubah editinfo: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'opentime':
    case 'closetime': {
      const timeStr = args[0];
      if (!timeStr) return sock.sendMessage(jid, { text: `Format: ${config.prefix}${cmd} <angka><m/h>\nContoh: ${config.prefix}${cmd} 10m` }, { quoted: m });
      const unit = timeStr.slice(-1).toLowerCase();
      const val = parseInt(timeStr.slice(0, -1));
      if (isNaN(val) || (unit !== 'm' && unit !== 'h' && unit !== 's')) {
        return sock.sendMessage(jid, { text: `Format waktu tidak valid. Gunakan s (detik), m (menit), atau h (jam). Contoh: 30m` }, { quoted: m });
      }
      const ms = val * (unit === 'h' ? 3600000 : (unit === 'm' ? 60000 : 1000));
      const isClose = cmd === 'closetime';
      await sock.sendMessage(jid, { text: `⏱️ Grup akan di-${isClose ? 'tutup' : 'buka'} otomatis dalam ${val}${unit}.` }, { quoted: m });
      setTimeout(async () => {
        try {
          await sock.groupSettingUpdate(jid, isClose ? 'announcement' : 'not_announcement');
          await sock.sendMessage(jid, { text: isClose ? '🔒 *GRUP DITUTUP:* Waktu closetime telah tiba.' : '🔓 *GRUP DIBUKA:* Waktu opentime telah tiba.' });
        } catch {}
      }, ms);
      break;
    }

    case 'getbio': {
      const user = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || (quoted ? (quoted.sender || m.message?.extendedTextMessage?.contextInfo?.participant) : null) || (args[0] ? args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null);
      if (!user) return sock.sendMessage(jid, { text: `Tag atau balas orang yang ingin dicek bionya.\nContoh: ${config.prefix}getbio @user` }, { quoted: m });
      try {
        const statusObj = await sock.fetchStatus(user);
        await sock.sendMessage(jid, { text: `👤 *BIO / ABOUT @${user.split('@')[0]}*\n\n"${statusObj?.status || 'Tidak ada bio'}"\n\nDiperbarui: ${statusObj?.setAt ? new Date(statusObj.setAt).toLocaleString('id-ID') : '-'}` , mentions: [user] }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal mengambil bio: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'vote': {
      if (!q) return sock.sendMessage(jid, { text: `Format: ${config.prefix}vote <pertanyaan / topik>` }, { quoted: m });
      setGroupVote(jid, { question: q, upvotes: new Set(), downvotes: new Set(), creator: m.key.participant || jid });
      await sock.sendMessage(jid, {
        text: `📊 *SESI VOTING DIMULAI*\n\nTopik: *${q}*\n\nKetik:\n• ${config.prefix}upvote — untuk setuju (+1)\n• ${config.prefix}downvote — untuk tidak setuju (-1)\n• ${config.prefix}checkvote — cek hasil suara\n• ${config.prefix}delvote — tutup voting`
      }, { quoted: m });
      break;
    }

    case 'upvote': {
      const currentVote = getGroupVote(jid);
      if (!currentVote) return sock.sendMessage(jid, { text: 'Belum ada voting yang aktif di grup ini.' }, { quoted: m });
      const voter = m.key.participant || (sock.user?.id?.split(':')[0] + '@s.whatsapp.net');
      currentVote.downvotes.delete(voter);
      currentVote.upvotes.add(voter);
      await sock.sendMessage(jid, { text: `👍 Suara upvote tercatat! (Total: ${currentVote.upvotes.size})` }, { quoted: m });
      break;
    }

    case 'downvote': {
      const currentVote = getGroupVote(jid);
      if (!currentVote) return sock.sendMessage(jid, { text: 'Belum ada voting yang aktif di grup ini.' }, { quoted: m });
      const voter = m.key.participant || (sock.user?.id?.split(':')[0] + '@s.whatsapp.net');
      currentVote.upvotes.delete(voter);
      currentVote.downvotes.add(voter);
      await sock.sendMessage(jid, { text: `👎 Suara downvote tercatat! (Total: ${currentVote.downvotes.size})` }, { quoted: m });
      break;
    }

    case 'checkvote': {
      const currentVote = getGroupVote(jid);
      if (!currentVote) return sock.sendMessage(jid, { text: 'Belum ada voting yang aktif di grup ini.' }, { quoted: m });
      await sock.sendMessage(jid, {
        text: `📊 *HASIL VOTING SAAT INI*\n\nTopik: *${currentVote.question}*\n\n👍 Upvote   : ${currentVote.upvotes.size}\n👎 Downvote : ${currentVote.downvotes.size}`
      }, { quoted: m });
      break;
    }

    case 'delvote': {
      const currentVote = getGroupVote(jid);
      if (!currentVote) return sock.sendMessage(jid, { text: 'Tidak ada sesi voting aktif untuk dihapus.' }, { quoted: m });
      setGroupVote(jid, null);
      await sock.sendMessage(jid, { text: '🗑️ Sesi voting grup berhasil dihapus.' }, { quoted: m });
      break;
    }

    case 'react': {
      if (!quoted) return sock.sendMessage(jid, { text: 'Balas pesan yang ingin diberi reaksi emoji.' }, { quoted: m });
      const emoji = args[0] || '👍';
      try {
        await sock.sendMessage(jid, { react: { text: emoji, key: quoted.key } });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal memberi reaksi: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'getjoinrequest': {
      try {
        const requests = await sock.groupRequestParticipantsList(jid);
        if (!requests || requests.length === 0) {
          return sock.sendMessage(jid, { text: 'ℹ️ Tidak ada permintaan bergabung (join request) yang tertunda.' }, { quoted: m });
        }
        let listText = `📋 *PERMINTAAN BERGABUNG (${requests.length})*\n\n`;
        requests.forEach((r, i) => {
          listText += `${i + 1}. @${r.jid.split('@')[0]} (Metode: ${r.request_method || 'invite'})\n`;
        });
        await sock.sendMessage(jid, { text: listText.trim(), mentions: requests.map(r => r.jid) }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal mengambil join request: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'vv': {
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
  }
}

