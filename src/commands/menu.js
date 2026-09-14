import config from '../../config.js';
import { getMenuGif } from '../libs/media.js';

export async function handleMenu(sock, m, { jid, cmd, args, userName }) {
  const senderJid = m.key.participant || (m.key.fromMe ? (sock.user?.id ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : jid) : jid);
  const p = config.prefix;

  let rawSub = (args[0] || '').toLowerCase();
  if (cmd.startsWith('menu') && cmd.length > 4) {
    rawSub = cmd.slice(4);
  } else if (cmd.endsWith('menu') && cmd.length > 4) {
    rawSub = cmd.replace('menu', '');
  } else if (!rawSub && cmd !== 'menu' && cmd !== 'help' && cmd !== 'm') {
    rawSub = cmd;
  }

  const subMap = {
    dl: 'download', down: 'download', downloader: 'download', download: 'download',
    ai: 'ai', gpt: 'ai',
    gm: 'game', game: 'game', games: 'game', arcade: 'game',
    tl: 'tools', tool: 'tools', tools: 'tools', util: 'tools',
    src: 'search', search: 'search', cari: 'search', anime: 'search',
    gc: 'group', grup: 'group', group: 'group',
    shield: 'shield', guard: 'shield', antilink: 'shield',
    media: 'media', stiker: 'media', sticker: 'media', conv: 'media', converter: 'media', magick: 'media',
    rel: 'agama', religion: 'agama', agama: 'agama', islami: 'agama',
    dsp: 'audio', audio: 'audio', audioeffect: 'audio', efek: 'audio',
    fn: 'fun', fun: 'fun', hiburan: 'fun', react: 'fun',
    st: 'stalk', stalk: 'stalk', stalker: 'stalk', osint: 'stalk',
    gal: 'gallery', galeri: 'gallery', gallery: 'gallery', pack: 'gallery',
    nsfw: 'nsfw', 18: 'nsfw', dewasa: 'nsfw',
    own: 'owner', owner: 'owner', sys: 'owner', system: 'owner'
  };

  const sub = subMap[rawSub] || null;

  const sections = {
    download: `┌── [ 01. DOWNLOADER ]
│ • ${p}play <judul/url>
│ • ${p}ytmp3 | ${p}yta <url>
│ • ${p}ytmp4 | ${p}ytv <url>
│ • ${p}tiktok | ${p}tt <url>
│ • ${p}tiktokmp3 | ${p}ttmp3 <url>
│ • ${p}ig | ${p}reel <url>
│ • ${p}igstory | ${p}igs <user/url>
│ • ${p}fb | ${p}facebook <url>
│ • ${p}spotify | ${p}sp <judul/url>
│ • ${p}soundcloud | ${p}sc <judul/url>
│ • ${p}mediafire | ${p}mf <url>
│ • ${p}sfile | ${p}sf <query/url>
│ • ${p}snackvideo | ${p}sv <url>
│ • ${p}terabox | ${p}tb <url>
│ • ${p}mangadl | ${p}mdl <judul> [ch]
│ • ${p}animedl | ${p}adl <judul/link>
└──`,

    ai: `┌── [ 02. COGNITIVE AI ]
│ • ${p}ai | ${p}chatgpt <prompt>
│ • ${p}restha <prompt>
│ • ${p}ddg <prompt>
│ • ${p}perplexity | ${p}perp <prompt>
│ • ${p}draw | ${p}genimg <deskripsi>
└──`,

    game: `┌── [ 03. INTERACTIVE GAMES ]
│ • ${p}c4 | ${p}connect4 @lawan
│ • ${p}ttt | ${p}tictactoe @lawan
│ • ${p}suit | ${p}suitpvp @lawan
│ • ${p}blackjack | ${p}bj [taruhan]
│ • ${p}slot | ${p}slots
│ • ${p}coinflip | ${p}cf [head/tail]
│ • ${p}dadu | ${p}dice
│ • ${p}tebakangka [angka]
│ • ${p}sambungkata [kata]
│ • ${p}tebakkartu [1-5]
│ • ${p}tebaktokoh
│ • ${p}tebakibukota
│ • ${p}susunkata | ${p}tebakkata
│ • ${p}trivia | ${p}quiz
│ • ${p}math [easy/medium/hard]
│ • ${p}hint | ${p}clue
└──`,

    tools: `┌── [ 04. TOOLS & COMPILER ]
│ • ${p}c | ${p}cpp | ${p}c++ <kode c/c++ / reply>
│ • ${p}run | ${p}code <bahasa> <kode / reply>
│ • ${p}py | ${p}js | ${p}ts | ${p}go | ${p}rs | ${p}java <kode>
│ • ${p}iqc <pesan | bat | kartu | jam>
│ • ${p}remini | ${p}hd (reply foto)
│ • ${p}tourl | ${p}url (reply media)
│ • ${p}nulis | ${p}nulis2 | ${p}folio <teks>
│ • ${p}nulisai <topik tugas>
│ • ${p}kalender
│ • ${p}qr | ${p}qrcode <teks/link>
│ • ${p}tr <kode_bahasa> <teks>
│ • ${p}tts [kode_bahasa] <teks>
│ • ${p}diary | ${p}catatan <teks>
│ • ${p}del (reply pesan bot)
│ • ${p}text3d | ${p}neon | ${p}glitch | ${p}gold <teks>
│ • ${p}fire | ${p}graffiti | ${p}blood | ${p}matrix <teks>
│ • ${p}ice | ${p}retro <teks>
└──`,

    search: `┌── [ 05. SEARCH & ANIME INFO ]
│ • ${p}google | ${p}gg <query>
│ • ${p}pinterest | ${p}pin | ${p}pt <query>
│ • ${p}pixiv | ${p}px <query>
│ • ${p}berita | ${p}news | ${p}br [topik]
│ • ${p}film | ${p}movie | ${p}fm <judul>
│ • ${p}drakor <judul>
│ • ${p}apk | ${p}apksearch | ${p}apks <nama app>
│ • ${p}wiki | ${p}wikipedia | ${p}wk <query>
│ • ${p}shazam | ${p}sz (reply audio/video)
│ • ${p}budayabali | ${p}bbali <query>
│ • ${p}yts | ${p}ytsearch <query>
│ • ${p}lirik | ${p}lyrics <judul>
│ • ${p}chord | ${p}kunci <judul>
│ • ${p}tiktoksearch | ${p}ttsearch <query>
│ • ${p}anime | ${p}ani <judul>
│ • ${p}manga | ${p}mnk <judul>
│ • ${p}manhwa | ${p}mhw <judul>
└──`,

    group: `┌── [ 06. GROUP GOVERNANCE ]
│ • ${p}hidetag | ${p}ht <pesan>
│ • ${p}tagall [pesan]
│ • ${p}totag (reply pesan)
│ • ${p}linkgc | ${p}link
│ • ${p}revoke | ${p}resetlink
│ • ${p}kick @tag
│ • ${p}add <nomor>
│ • ${p}kickall
│ • ${p}promote @tag | ${p}promoteall
│ • ${p}demote @tag | ${p}demoteall
│ • ${p}open | ${p}close
│ • ${p}setname <nama baru>
│ • ${p}setdesc <deskripsi baru>
│ • ${p}setpp (reply foto profil grup)
│ • ${p}delppgc
│ • ${p}editinfo <open/close>
│ • ${p}ephemeral <on/off/24h/7d/90d>
│ • ${p}listgroup | ${p}listadmin
│ • ${p}invite <nomor>
│ • ${p}getcontact @tag
│ • ${p}sendcontact <nomor> [nama]
│ • ${p}contactag
└──`,

    shield: `┌── [ 07. GROUP SECURITY SHIELDS ]
│ • ${p}welcome on/off
│ • ${p}antilink on/off
│ • ${p}antitoxic on/off
│ • ${p}antibot on/off
│ • ${p}antivv on/off
│ • ${p}antivirus | ${p}antivirtex on/off
│ • ${p}antiforeign on/off
│ • ${p}antimedia on/off
│ • ${p}antiaudio | ${p}antivideo on/off
│ • ${p}antiimage | ${p}antidocument on/off
│ • ${p}antisticker | ${p}anticontact on/off
│ • ${p}antilocation | ${p}antipoll on/off
│ • ${p}adminevent | ${p}groupevent on/off
└──`,

    media: `┌── [ 08. MEDIA, STICKER & IMAGEMAGICK ]
│ • ${p}s | ${p}sticker [pack | author]
│ • ${p}sgif [pack | author]
│ • ${p}brat | ${p}btext <teks>
│ • ${p}bratg | ${p}btextg <teks>
│ • ${p}bratb | ${p}btextb <teks>
│ • ${p}bratvid | ${p}bvid <teks>
│ • ${p}toimg (reply stiker)
│ • ${p}togif | ${p}tovideo (reply stiker bergerak)
│ • ${p}tomp3 | ${p}getaudio (reply video/vn)
│ • ${p}tovn | ${p}vn (reply audio/video)
│ • ${p}rvo | ${p}readviewonce (reply view-once)
│ • ${p}blur | ${p}charcoal | ${p}paint | ${p}sketch
│ • ${p}emboss | ${p}edge | ${p}invert | ${p}sepia
│ • ${p}swirl | ${p}implode | ${p}solarize | ${p}polaroid
│ • ${p}oilpaint | ${p}vignette | ${p}wave | ${p}sharpen
│ • ${p}rotate | ${p}flip | ${p}flop | ${p}mirror
│ • ${p}grayscale | ${p}bw
│ • ${p}magick <opsi imagemagick>
└──`,

    agama: `┌── [ 09. RELIGION & SPIRITUALITY ]
│ • ${p}quran | ${p}qrn <surah:ayat>
│ • ${p}sholat | ${p}js [kota]
│ • ${p}kisahnabi | ${p}kn [nama nabi 1-25]
│ • ${p}alkitab | ${p}bible | ${p}ktb <kitab pasal:ayat>
│ • ${p}gita | ${p}bhagavadgita <bab:sloka>
│ • ${p}doahindu [gayatri/trisandya/dll]
│ • ${p}dhammapada | ${p}dh [nomor syair]
└──`,

    audio: `┌── [ 10. AUDIO DSP FILTERS (Reply Audio) ]
│ • ${p}bass | ${p}bs
│ • ${p}earrape | ${p}er
│ • ${p}nightcore | ${p}nc
│ • ${p}robot | ${p}rb
│ • ${p}reverse | ${p}rev
│ • ${p}slow | ${p}slw
│ • ${p}fast | ${p}fst
│ • ${p}deep | ${p}dp
│ • ${p}smooth | ${p}smt
│ • ${p}blown | ${p}bln
│ • ${p}reverb | ${p}rvb
│ • ${p}echo | ${p}ec
│ • ${p}vaporwave | ${p}vw
│ • ${p}chipmunk | ${p}cm
│ • ${p}slowed | ${p}slwd
│ • ${p}lofi | ${p}lf
└──`,

    fun: `┌── [ 11. FUN, CHECKERS & REACTION GIF ]
│ • ${p}define <kata/istilah>
│ • ${p}readmore <depan | rahasia>
│ • ${p}menfess | ${p}confess <nomor | pesan>
│ • ${p}fact
│ • ${p}pick <opsi 1 | opsi 2 | opsi 3>
│ • ${p}pickupline | ${p}gombal
│ • ${p}quotes
│ • ${p}animequote | ${p}qanime
│ • ${p}couple | ${p}soulmate
│ • ${p}can | ${p}is | ${p}when | ${p}where | ${p}what | ${p}how | ${p}rate <tanya>
│ • ${p}checkme
│ • ${p}stupidcheck | ${p}handsomecheck | ${p}hotcheck | ${p}smartcheck
│ • ${p}evilcheck | ${p}coolcheck | ${p}waifucheck | ${p}gaycheck
│ • ${p}cutecheck | ${p}lesbiancheck | ${p}hornycheck | ${p}prettycheck
│ • ${p}hug | ${p}kiss | ${p}slap | ${p}pat | ${p}lick | ${p}bite | ${p}yeet @tag
│ • ${p}bonk | ${p}wink | ${p}poke | ${p}nom | ${p}cry | ${p}kill | ${p}bully @tag
│ • ${p}smile | ${p}wave | ${p}blush | ${p}dance | ${p}cuddle | ${p}highfive @tag
│ • ${p}handhold | ${p}spank | ${p}tickle | ${p}feed | ${p}smug | ${p}cringe
└──`,

    stalk: `┌── [ 12. OSINT STALKER ]
│ • ${p}ghstalk | ${p}githubstalk <username>
│ • ${p}mlstalk <id user>
│ • ${p}robloxstalk <username>
│ • ${p}discordstalk | ${p}dcstalk <id user>
└──`,

    gallery: `┌── [ 13. CURATED GALLERY & TIKTOK PACKS ]
│ • Anime   : ${p}waifu, ${p}neko, ${p}loli, ${p}husbu, ${p}shota, ${p}animerandom
│ • Pics    : ${p}aesthetic, ${p}cat, ${p}dog, ${p}car, ${p}kpop, ${p}cosplay, ${p}rose
│ • Wall    : ${p}wallhp, ${p}wallml, ${p}ppcouple, ${p}ulzzangboy, ${p}ulzzanggirl
│ • TT Pics : ${p}ttkr, ${p}ttjp, ${p}ttid, ${p}tthijab, ${p}ttcn, ${p}ttth, ${p}ttvn, ${p}ttmy
│ • TT Vids : ${p}ttvgirl, ${p}ttvukhty, ${p}ttvsantuy
└──`,

    nsfw: `┌── [ 14. RESTRICTED GALLERY (18+) ]
│ • ${p}nsfwmilf
│ • ${p}nsfwyuri
│ • ${p}nsfwzettai
│ • ${p}nsfwfoot
│ • ${p}nsfweba
│ • ${p}nsfwblowjob
│ • ${p}nsfwcuckold
│ • ${p}nsfwpussy
│ • ${p}hentai
│ • ${p}paizuri
│ • ${p}nsfwass
│ • ${p}nsfwboobs
│ • ${p}nsfwneko
│ • ${p}nsfwanal
│ • ${p}javsearch | ${p}jav <ID/Query>
│ • ${p}watchhentai | ${p}whentai <query>
└──`,

    owner: `┌── [ 15. OWNER & SYSTEM MANAGEMENT ]
│ • ${p}ping
│ • ${p}info
│ • ${p}owner | ${p}ownerinfo
│ • ${p}runtime | ${p}uptime | ${p}status
│ • ${p}serverstats | ${p}stats
│ • ${p}setprefix <prefix>
│ • ${p}self
│ • ${p}clearsession
│ • ${p}block | ${p}unblock @tag
│ • ${p}bc | ${p}broadcast <pesan>
│ • ${p}signallog on/off
│ • ${p}autoreply | ${p}ar on/off
│ • ${p}addl | ${p}addlist <nomor / @tag / reply>
│ • ${p}dell | ${p}dellist <nomor / @tag / reply>
│ • ${p}listu | ${p}listuser | ${p}whitelist
│ • ${p}cmdstats | ${p}commandstats
│ • ${p}restart | ${p}reboot
│ • ${p}shutdown | ${p}stop
└──`
  };

  const sendMenuReply = async (captionText) => {
    const gif = await getMenuGif();
    if (gif) {
      await sock.sendMessage(jid, { video: gif, gifPlayback: true, caption: captionText, mentions: [senderJid] }, { quoted: m });
    } else {
      await sock.sendMessage(jid, { text: captionText, mentions: [senderJid] }, { quoted: m });
    }
  };

  const uptime = process.uptime();
  const h = Math.floor(uptime / 3600);
  const min = Math.floor((uptime % 3600) / 60);
  const s = Math.floor(uptime % 60);
  const memory = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);

  const header = `[ 𝕽𝕰𝕾𝕿𝕳𝕬 // 𝕮𝕺𝕽𝕰 ]
OPERATOR : @${userName}
PREFIX   : ${p}
SYSTEM   : ARMED // ONLINE
AUTOREP  : ${config.autoReplyGemini ? '🟢 GEMINI 3.7 FLASH [ON]' : '🔴 DISABLED [OFF]'}
RUNTIME  : ${h}h ${min}m ${s}s
MEMORY   : ${memory} MB RSS
ENGINE   : Node.js ${process.version} // ESM
CREATOR  : ${config.ownerName} (wa.me/${config.ownerNumber})
`;

  // Jika user meminta sub-kategori spesifik (misal: .menudl, .menugc, .menu ai)
  if (sub && sections[sub]) {
    return sendMenuReply(`${header}\n${sections[sub]}\n\nKetik ${p}menu untuk melihat seluruh daftar menu.`);
  }

  // Tampilkan seluruh menu lengkap 100% tanpa sub-bab berbelit
  const fullBody = Object.values(sections).join('\n\n');
  return sendMenuReply(`${header}\n${fullBody}`);
}

export async function handleInfo(sock, m, { jid }) {
  const uptime = process.uptime();
  const h = Math.floor(uptime / 3600);
  const min = Math.floor((uptime % 3600) / 60);
  const s = Math.floor(uptime % 60);
  const memory = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);

  const infoText = `┌─[ RESTHA // CORE TELEMETRY ]
│ CREATOR : ${config.ownerName}
│ CONTACT : wa.me/${config.ownerNumber}
│ REPO    : ${config.ownerGithub || 'https://github.com/KenKalahOprec'}
│ RUNTIME : ${h}h ${min}m ${s}s
│ MEMORY  : ${memory} MB RSS
│ ENGINE  : Node.js ${process.version} // ESM
│ PROTO   : Baileys v6.7.13 (MultiFileAuth)
│ STATUS  : ENCRYPTED // ACTIVE
└───────────────────────────`;
  await sock.sendMessage(jid, { text: infoText }, { quoted: m });
}
