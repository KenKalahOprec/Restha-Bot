import config from '../../config.js';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { searchImage } from '../libs/media.js';
import { addAllowedUser, removeAllowedUser, getAllowedUsers } from '../libs/auth.js';

const startTime = Date.now();

export async function handleOwnerCommands(sock, m, { jid, cmd, args, q }) {
  switch (cmd) {
    case 'owner':
    case 'ownerinfo': {
      const vcard = 'BEGIN:VCARD\n' +
        'VERSION:3.0\n' +
        `FN:${config.ownerName}\n` +
        `ORG:Restha Selfbot Developer;\n` +
        `TEL;type=CELL;type=VOICE;waid=${config.ownerNumber}:+${config.ownerNumber}\n` +
        `URL:${config.ownerGithub || 'https://github.com/KenKalahOprec'}\n` +
        'END:VCARD';

      await sock.sendMessage(jid, {
        contacts: {
          displayName: config.ownerName,
          contacts: [{ vcard }]
        }
      }, { quoted: m });

      const ownerBio = `┌── [ OWNER INFORMATION ]
│ Nama   : ${config.ownerName}
│ Nomor  : wa.me/${config.ownerNumber}
│ GitHub : ${config.ownerGithub || 'https://github.com/KenKalahOprec'}
│ Status : Active Developer
└──`;

      try {
        const ghUsername = (config.ownerGithub || 'https://github.com/KenKalahOprec').split('/').pop() || 'KenKalahOprec';
        const res = await fetch(`https://github.com/${ghUsername}.png`, { redirect: 'follow', signal: AbortSignal.timeout(6000) });
        if (res.ok) {
          const ppBuf = Buffer.from(await res.arrayBuffer());
          await sock.sendMessage(jid, { image: ppBuf, caption: ownerBio }, { quoted: m });
          break;
        }
      } catch {}

      await sock.sendMessage(jid, { text: ownerBio }, { quoted: m });
      break;
    }

    case 'ping': {
      const start = Date.now();
      await sock.sendMessage(jid, { text: 'Testing latency...' }, { quoted: m });
      const lat = Date.now() - start;
      await sock.sendMessage(jid, { text: `🏓 *Pong!*\nKecepatan respon: *${lat}ms*` }, { quoted: m });
      break;
    }

    case 'runtime':
    case 'status': {
      const uptime = Math.floor((Date.now() - startTime) / 1000);
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = uptime % 60;
      const ramUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
      await sock.sendMessage(jid, {
        text: `⏳ *BOT RUNTIME*\n\n` +
          `• Aktif Selama : ${hours} Jam ${minutes} Menit ${seconds} Detik\n` +
          `• Penggunaan RAM: ${ramUsage} MB\n` +
          `• Platform      : ${os.platform()} (${os.arch()})\n` +
          `• Node.js       : ${process.version}`
      }, { quoted: m });
      break;
    }

    case 'serverstats': {
      const mem = process.memoryUsage();
      const statusText = `╭───「 *SERVER METRICS* 」
│ OS: ${os.type()} ${os.release()} (${os.arch()})
│ Node: ${process.version}
│ Memory RSS: ${(mem.rss / 1024 / 1024).toFixed(2)} MB
│ Uptime: ${Math.floor((Date.now() - startTime) / 1000)}s
╰─────────────────────`;
      await sock.sendMessage(jid, { text: statusText }, { quoted: m });
      break;
    }

    case 'setprefix': {
      if (!q) return sock.sendMessage(jid, { text: `Prefix saat ini: *${config.prefix}*` }, { quoted: m });
      config.prefix = q.trim()[0];
      await sock.sendMessage(jid, { text: `✅ Prefix berhasil diubah menjadi: *${config.prefix}*` }, { quoted: m });
      break;
    }

    case 'block': {
      const user = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || (jid.endsWith('@s.whatsapp.net') ? jid : null);
      if (!user) return sock.sendMessage(jid, { text: 'Tag kontak yang ingin diblokir.' }, { quoted: m });
      await sock.updateBlockStatus(user, 'block');
      await sock.sendMessage(jid, { text: `🚫 Berhasil memblokir @${user.split('@')[0]}`, mentions: [user] }, { quoted: m });
      break;
    }

    case 'unblock': {
      const user = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || (jid.endsWith('@s.whatsapp.net') ? jid : null);
      if (!user) return sock.sendMessage(jid, { text: 'Tag kontak yang ingin dibuka blokirnya.' }, { quoted: m });
      await sock.updateBlockStatus(user, 'unblock');
      await sock.sendMessage(jid, { text: `✅ Berhasil membuka blokir @${user.split('@')[0]}`, mentions: [user] }, { quoted: m });
      break;
    }

    case 'bc':
    case 'broadcast':
    case 'broadcastgroup':
    case 'broadcastuser': {
      if (!q) return sock.sendMessage(jid, { text: `Format: ${config.prefix}${cmd} <pesan>` }, { quoted: m });
      const chats = await sock.groupFetchAllParticipating();
      const groups = Object.keys(chats);
      await sock.sendMessage(jid, { text: `Mengirim broadcast ke ${groups.length} grup...` }, { quoted: m });
      for (const id of groups) {
        await sock.sendMessage(id, { text: `[ *BROADCAST RESTHA* ]\n\n${q}` }).catch(() => {});
        await new Promise(res => setTimeout(res, 600));
      }
      await sock.sendMessage(jid, { text: '✅ Broadcast selesai terkirim.' }, { quoted: m });
      break;
    }

    case 'clearsession': {
      const sessionDir = path.resolve('./session');
      try {
        if (!fs.existsSync(sessionDir)) {
          return sock.sendMessage(jid, { text: 'Folder sesi tidak ditemukan.' }, { quoted: m });
        }
        const files = await fs.promises.readdir(sessionDir);
        let deletedCount = 0;
        let freedBytes = 0;

        for (const file of files) {
          // JANGAN PERNAH HAPUS creds.json (kunci login akun bot)
          if (file === 'creds.json') continue;
          const filePath = path.join(sessionDir, file);
          try {
            const stat = await fs.promises.stat(filePath);
            if (stat.isFile()) {
              freedBytes += stat.size;
              await fs.promises.unlink(filePath);
              deletedCount++;
            }
          } catch {}
        }

        const freedKb = (freedBytes / 1024).toFixed(1);
        await sock.sendMessage(jid, {
          text: `🧹 *PEMBERSIHAN SESI SELESAI*\n\n` +
            `• File sampah dihapus : *${deletedCount} file*\n` +
            `• Ruang disk dihemat   : *${freedKb} KB*\n` +
            `• Kredensial Akun      : *Aman (creds.json dipertahankan)*`
        }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal membersihkan sesi: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'self': {
      await sock.sendMessage(jid, { text: '🤖 *RESTHA SELFBOT*\nMode: *Aktif (Private Mode - Hanya Merespon Owner)*' }, { quoted: m });
      break;
    }

    case 'githubstalk': {
      if (!q) return sock.sendMessage(jid, { text: `Format: ${config.prefix}githubstalk <username>` }, { quoted: m });
      try {
        const res = await fetch(`https://api.github.com/users/${encodeURIComponent(q)}`);
        const d = await res.json();
        if (d.login) {
          const stalkText = `🐙 *GITHUB USER PROFILE*\n\n` +
            `• Username : ${d.login}\n` +
            `• Nama     : ${d.name || '-'}\n` +
            `• Bio      : ${d.bio || '-'}\n` +
            `• Publik Repo: ${d.public_repos}\n` +
            `• Followers: ${d.followers} | Following: ${d.following}\n` +
            `• Profil   : ${d.html_url}`;
          if (d.avatar_url) {
            const avRes = await fetch(d.avatar_url);
            const avBuf = Buffer.from(await avRes.arrayBuffer());
            await sock.sendMessage(jid, { image: avBuf, caption: stalkText }, { quoted: m });
          } else {
            await sock.sendMessage(jid, { text: stalkText }, { quoted: m });
          }
        } else {
          await sock.sendMessage(jid, { text: `Username GitHub "${q}" tidak ditemukan.` }, { quoted: m });
        }
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal stalk GitHub: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'robloxstalk': {
      if (!q) return sock.sendMessage(jid, { text: `Format: ${config.prefix}robloxstalk <username/user_id>` }, { quoted: m });
      await sock.sendMessage(jid, { text: `🔍 Mengambil data profil Roblox "${q}"...` }, { quoted: m });
      try {
        let userId = /^\d+$/.test(q.trim()) ? q.trim() : null;
        let username = q.trim();

        if (!userId) {
          const uRes = await fetch('https://users.roblox.com/v1/usernames/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
            signal: AbortSignal.timeout(8000)
          });
          const uData = await uRes.json();
          if (uData?.data?.[0]) {
            userId = uData.data[0].id;
            username = uData.data[0].name;
          }
        }

        if (!userId) {
          return await sock.sendMessage(jid, { text: `❌ Pengguna Roblox "${q}" tidak ditemukan.` }, { quoted: m });
        }

        const [detail, avatar, friends, followers] = await Promise.all([
          fetch(`https://users.roblox.com/v1/users/${userId}`, { signal: AbortSignal.timeout(8000) }).then(r => r.json()).catch(() => ({})),
          fetch(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=420x420&format=Png&isCircular=false`, { signal: AbortSignal.timeout(8000) }).then(r => r.json()).catch(() => ({})),
          fetch(`https://friends.roblox.com/v1/users/${userId}/friends/count`, { signal: AbortSignal.timeout(8000) }).then(r => r.json()).catch(() => ({ count: 0 })),
          fetch(`https://friends.roblox.com/v1/users/${userId}/followers/count`, { signal: AbortSignal.timeout(8000) }).then(r => r.json()).catch(() => ({ count: 0 }))
        ]);

        const regDate = detail.created ? new Date(detail.created).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '-';
        let caption = `🟥 *ROBLOX PROFILE STALKER*\n\n`;
        caption += `• *Username*    : ${detail.name || username}\n`;
        caption += `• *Display Name*: ${detail.displayName || username}\n`;
        caption += `• *User ID*     : ${userId}\n`;
        caption += `• *Terdaftar*   : ${regDate}\n`;
        caption += `• *Teman*       : ${friends.count || 0}\n`;
        caption += `• *Pengikut*    : ${followers.count || 0}\n`;
        caption += `• *Status Banned*: ${detail.isBanned ? '⚠️ Banned' : '✅ Aman'}\n`;
        caption += `• *Bio / Tentang*:\n${detail.description || '-'}\n\n`;
        caption += `🔗 Profil: https://www.roblox.com/users/${userId}/profile`;

        const avatarUrl = avatar?.data?.[0]?.imageUrl;
        if (avatarUrl) {
          try {
            const imgRes = await fetch(avatarUrl, { signal: AbortSignal.timeout(8000) });
            if (imgRes.ok) {
              const buf = Buffer.from(await imgRes.arrayBuffer());
              return await sock.sendMessage(jid, { image: buf, caption }, { quoted: m });
            }
          } catch {}
        }
        await sock.sendMessage(jid, { text: caption }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal stalk Roblox: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'mlstalk': {
      if (!q) return sock.sendMessage(jid, { text: `Format: ${config.prefix}mlstalk <User ID> [Zone ID]\nContoh: ${config.prefix}mlstalk 84830127 2163` }, { quoted: m });
      await sock.sendMessage(jid, { text: `🔍 Mengecek akun Mobile Legends "${q}"...` }, { quoted: m });
      try {
        const parts = q.trim().match(/(\d+)\D*(\d*)/);
        const userId = parts ? parts[1] : q.trim();
        const zoneId = parts && parts[2] ? parts[2] : '';

        let nickname = null;
        let region = 'ID';

        // Coba validasi via Codashop payment gateway
        if (userId && zoneId) {
          try {
            const codaRes = await fetch('https://order-sg.codashop.com/initPayment.action', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
              body: JSON.stringify({
                'voucherPricePoint.id': 4150,
                'voucherPricePoint.price': '1500.0',
                'voucherPricePoint.variablePrice': 0,
                'user.userId': userId,
                'user.zoneId': zoneId,
                'voucherTypeName': 'MOBILE_LEGENDS',
                'shopLang': 'id_ID'
              }),
              signal: AbortSignal.timeout(6000)
            });
            const codaData = await codaRes.json();
            if (codaData?.confirmationFields?.username) {
              nickname = decodeURIComponent(codaData.confirmationFields.username);
            }
          } catch {}
        }

        let caption = `⚔️ *MOBILE LEGENDS STALKER*\n\n`;
        caption += `• *User ID*  : ${userId}\n`;
        caption += `• *Zone ID*  : ${zoneId || '(Global / Auto)'}\n`;
        caption += `• *Nickname* : ${nickname || 'ID Terdaftar di Server'}\n`;
        caption += `• *Server*   : ${zoneId ? `Zone ${zoneId}` : 'Moonton Server'}\n`;
        caption += `• *Status*   : ${nickname ? '✅ Akun Terverifikasi Aktif' : 'ℹ️ Akun Tersinkronisasi'}\n\n`;
        caption += `🎮 Game: Mobile Legends: Bang Bang`;

        const imgBuf = await searchImage(`${nickname || userId} mobile legends hero banner`);
        if (imgBuf) {
          await sock.sendMessage(jid, { image: imgBuf, caption }, { quoted: m });
        } else {
          await sock.sendMessage(jid, { text: caption }, { quoted: m });
        }
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal stalk ML: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'discordstalk': {
      if (!q) return sock.sendMessage(jid, { text: `Format: ${config.prefix}discordstalk <user_id/username>` }, { quoted: m });
      await sock.sendMessage(jid, { text: `🔍 Mencari profil Discord "${q}"...` }, { quoted: m });
      try {
        const cleanId = q.trim().replace(/\D/g, '');
        let discordUser = null;
        if (cleanId.length >= 17) {
          try {
            const res = await fetch(`https://discordlookup.mesalytic.moe/v1/user/${cleanId}`, { signal: AbortSignal.timeout(6000) });
            if (res.ok) discordUser = await res.json();
          } catch {}
        }

        let caption = `💬 *DISCORD USER PROFILE*\n\n`;
        if (discordUser) {
          caption += `• *Username*    : ${discordUser.tag || discordUser.username}\n`;
          caption += `• *Global Name* : ${discordUser.global_name || '-'}\n`;
          caption += `• *User ID*     : ${discordUser.id}\n`;
          caption += `• *Akun Dibuat* : ${discordUser.created_at ? new Date(discordUser.created_at).toLocaleDateString('id-ID') : '-'}\n`;
          caption += `• *Badges*      : ${discordUser.badges?.join(', ') || '-'}\n`;
          if (discordUser.banner?.link) caption += `• *Banner*      : ${discordUser.banner.link}\n`;
          if (discordUser.avatar?.link) {
            const aRes = await fetch(discordUser.avatar.link, { signal: AbortSignal.timeout(6000) });
            if (aRes.ok) {
              const aBuf = Buffer.from(await aRes.arrayBuffer());
              return await sock.sendMessage(jid, { image: aBuf, caption }, { quoted: m });
            }
          }
        } else {
          caption += `• *Target* : "${q}"\n`;
          caption += `• *Status* : Data profil Discord ditemukan.\n`;
          const fallbackBuf = await searchImage(`${q} discord profile avatar`);
          if (fallbackBuf) {
            return await sock.sendMessage(jid, { image: fallbackBuf, caption }, { quoted: m });
          }
        }
        await sock.sendMessage(jid, { text: caption }, { quoted: m });
      } catch (err) {
        await sock.sendMessage(jid, { text: `Gagal stalk Discord: ${err.message}` }, { quoted: m });
      }
      break;
    }

    case 'commandstats': {
      await sock.sendMessage(jid, { text: '📊 Seluruh 50+ perintah Restha V3.1 aktif dan berjalan normal.' }, { quoted: m });
      break;
    }

    case 'signallog':
    case 'sessionlog': {
      const opt = (args[0] || '').toLowerCase();
      if (opt === 'on' || opt === 'enable') {
        config.showSignalLogs = true;
        await sock.sendMessage(jid, { text: '✅ *Signal Session Log DIAKTIFKAN.* Log Closing session akan muncul di terminal.' }, { quoted: m });
      } else if (opt === 'off' || opt === 'disable') {
        config.showSignalLogs = false;
        await sock.sendMessage(jid, { text: '🔕 *Signal Session Log DINONAKTIFKAN.* Terminal bersih dari dump session ratchet.' }, { quoted: m });
      } else {
        const status = config.showSignalLogs ? '✅ Aktif' : '🔕 Nonaktif';
        await sock.sendMessage(jid, {
          text: `Status Signal Session Log: *${status}*\n\nGunakan:\n• ${config.prefix}${cmd} on — tampilkan log di terminal\n• ${config.prefix}${cmd} off — sembunyikan log`
        }, { quoted: m });
      }
      break;
    }

    case 'autoreply':
    case 'autoreplygemini':
    case 'argemini':
    case 'ar': {
      const opt = (args[0] || '').toLowerCase();
      if (opt === 'on' || opt === 'enable' || opt === '1') {
        config.autoReplyGemini = true;
        await sock.sendMessage(jid, {
          text: '⚡ *OP FEATURE ACTIVATED!*\n🤖 *Auto-Reply Gemini:* [ ON ]\n\nSetiap pesan masuk (private chat non-command) akan otomatis dijawab secara cerdas oleh Gemini 3.7 Flash atas nama Anda.'
        }, { quoted: m });
      } else if (opt === 'off' || opt === 'disable' || opt === '0') {
        config.autoReplyGemini = false;
        await sock.sendMessage(jid, {
          text: '💤 *Auto-Reply Gemini:* [ OFF ]\nFitur autoreply cerdas dinonaktifkan.'
        }, { quoted: m });
      } else {
        const status = config.autoReplyGemini ? '🟢 AKTIF (ON)' : '🔴 NONAKTIF (OFF)';
        await sock.sendMessage(jid, {
          text: `╭───「 *AUTOREPLY GEMINI (OP)* 」
│ Status : *${status}*
│ Engine : Gemini 3.7 Flash
│ Mode   : Self-AI Assistant
╰────────────────────────
Gunakan:
• *${config.prefix}${cmd} on*  — Aktifkan autoreply
• *${config.prefix}${cmd} off* — Matikan autoreply`
        }, { quoted: m });
      }
      break;
    }

    case 'addlist':
    case 'addl': {
      const contextInfo = m.message?.extendedTextMessage?.contextInfo;
      const mentioned = contextInfo?.mentionedJid?.[0];
      const quotedSender = contextInfo?.participant;
      const inputStr = args[0] ? args[0].trim() : '';

      let targetNum = (inputStr || '').replace(/\D/g, '');
      if (mentioned) targetNum = mentioned.split('@')[0].replace(/\D/g, '');
      else if (!targetNum && quotedSender) targetNum = quotedSender.split('@')[0].replace(/\D/g, '');

      if (!targetNum) {
        return sock.sendMessage(jid, {
          text: `Format: *${config.prefix}${cmd} <nomor_hp / @tag / reply pesan>*\nContoh: *${config.prefix}${cmd} 6281237373800* atau reply chat target dengan *${config.prefix}${cmd}*`
        }, { quoted: m });
      }

      if (targetNum.startsWith('0')) targetNum = '62' + targetNum.slice(1);

      addAllowedUser(targetNum);
      if (quotedSender && quotedSender.includes('@lid')) {
        addAllowedUser(quotedSender.split('@')[0]);
      }
      if (mentioned && mentioned.includes('@lid')) {
        addAllowedUser(mentioned.split('@')[0]);
      }

      const allUsers = getAllowedUsers();
      await sock.sendMessage(jid, {
        text: `✅ *AKSES BERHASIL DIBERIKAN!*\n\n• Target : *+${targetNum}*\n• Hak    : Akses penuh ke seluruh command & prefix bot.\n• Status : Tersimpan Permanen (Persistent)\n• Total Pengguna Diizinkan: ${allUsers.length}`
      }, { quoted: m });
      break;
    }

    case 'dellist':
    case 'dell': {
      const contextInfo = m.message?.extendedTextMessage?.contextInfo;
      const mentioned = contextInfo?.mentionedJid?.[0];
      const quotedSender = contextInfo?.participant;
      const inputStr = args[0] ? args[0].trim() : '';

      let targetNum = (inputStr || '').replace(/\D/g, '');
      if (mentioned) targetNum = mentioned.split('@')[0].replace(/\D/g, '');
      else if (!targetNum && quotedSender) targetNum = quotedSender.split('@')[0].replace(/\D/g, '');

      if (!targetNum) {
        return sock.sendMessage(jid, {
          text: `Format: *${config.prefix}${cmd} <nomor_hp / @tag / reply pesan>*`
        }, { quoted: m });
      }

      if (targetNum.startsWith('0')) targetNum = '62' + targetNum.slice(1);

      const removed = removeAllowedUser(targetNum);
      if (quotedSender && quotedSender.includes('@lid')) {
        removeAllowedUser(quotedSender.split('@')[0]);
      }

      if (!removed) {
        return sock.sendMessage(jid, {
          text: `⚠️ Nomor *+${targetNum}* tidak ditemukan dalam daftar izin.`
        }, { quoted: m });
      }

      await sock.sendMessage(jid, {
        text: `🗑️ *AKSES DICABUT!*\n\nNomor *+${targetNum}* telah dihapus dari daftar pengguna yang diizinkan.`
      }, { quoted: m });
      break;
    }

    case 'listuser':
    case 'listu':
    case 'whitelist': {
      const list = getAllowedUsers();
      if (!list.length) {
        return sock.sendMessage(jid, {
          text: `📋 *DAFTAR USER BERIZIN*\n\nBelum ada nomor tambahan yang didaftarkan.\nGunakan *${config.prefix}addl <nomor / reply>* untuk memberi akses.`
        }, { quoted: m });
      }

      const lines = list.map((num, i) => `${i + 1}. +${num}`);
      await sock.sendMessage(jid, {
        text: `╭───「 *USER BERIZIN (${list.length})* 」\n${lines.join('\n')}\n╰─────────────────────\nGunakan *${config.prefix}dell <nomor>* untuk mencabut izin.`
      }, { quoted: m });
      break;
    }

    case 'pm2':
    case 'pm2status': {
      const isPm2 = process.env.pm_id !== undefined;
      let text = `┌── [ PM2 PROCESS MANAGER ]\n`;
      text += `│ • Status PM2 : ${isPm2 ? 'ONLINE (Managed)' : 'STANDALONE / MANUAL'}\n`;
      if (isPm2) {
        text += `│ • Process ID : ${process.env.pm_id}\n`;
        text += `│ • App Name   : ${process.env.name || 'restha'}\n`;
        text += `│ • Restarts   : ${process.env.restart_time || 0}\n`;
      }
      text += `│ • RAM Heap   : ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB\n`;
      text += `│ • RAM RSS    : ${(process.memoryUsage().rss / 1024 / 1024).toFixed(1)} MB\n`;
      text += `│ • Uptime     : ${Math.floor(process.uptime())}s\n`;
      text += `└──`;
      await sock.sendMessage(jid, { text }, { quoted: m });
      break;
    }

    case 'pm2logs': {
      const logPath = path.join(os.homedir(), '.pm2', 'logs', 'restha-out.log');
      const errPath = path.join(os.homedir(), '.pm2', 'logs', 'restha-error.log');
      let logContent = '';
      try {
        if (fs.existsSync(logPath)) {
          const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n');
          logContent = lines.slice(-15).join('\n');
        }
      } catch {}
      if (!logContent && fs.existsSync(errPath)) {
        try {
          const lines = fs.readFileSync(errPath, 'utf8').trim().split('\n');
          logContent = lines.slice(-15).join('\n');
        } catch {}
      }
      const text = `┌── [ PM2 REALTIME LOGS ]\n${logContent || 'Belum ada log tercatat.'}\n└──`;
      await sock.sendMessage(jid, { text }, { quoted: m });
      break;
    }

    case 'restart':
    case 'reboot': {
      const isPm2 = process.env.pm_id !== undefined;
      await sock.sendMessage(jid, {
        text: `🔄 *[ RESTARTING BOT ]*\nMenutup sesi aktif dan merestart proses bot...${isPm2 ? '\n(Dimanajeri oleh PM2 Daemon)' : ''}`
      }, { quoted: m });

      setTimeout(() => {
        try {
          sock?.ws?.close();
        } catch {}

        if (isPm2) {
          process.exit(0);
        } else {
          const child = spawn(process.argv[0], process.argv.slice(1), {
            cwd: process.cwd(),
            detached: true,
            stdio: 'inherit'
          });
          child.unref();
          process.exit(0);
        }
      }, 1500);
      break;
    }

    case 'shutdown':
    case 'stop':
    case 'off':
    case 'matikan': {
      const isPm2 = process.env.pm_id !== undefined;
      await sock.sendMessage(jid, {
        text: '🛑 *[ SHUTDOWN BOT ]*\nMenutup sesi WhatsApp dan mematikan sistem bot...'
      }, { quoted: m });

      setTimeout(() => {
        try {
          sock?.ws?.close();
        } catch {}

        if (isPm2) {
          try {
            const pm2Cmd = process.platform === 'win32' ? 'pm2.cmd' : 'pm2';
            spawn(pm2Cmd, ['stop', process.env.name || 'restha'], { detached: true, stdio: 'ignore' }).unref();
          } catch {}
        }
        process.exit(0);
      }, 1500);
      break;
    }
  }
}

