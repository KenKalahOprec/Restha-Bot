import config from '../../config.js';
import { getMenuGif, getNsfwMenuImage } from '../libs/media.js';

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
    1: 'download', dl: 'download', down: 'download', downloader: 'download', download: 'download',
    2: 'ai', ai: 'ai', gpt: 'ai',
    3: 'game', gm: 'game', game: 'game', games: 'game', arcade: 'game',
    4: 'tools', tl: 'tools', tool: 'tools', tools: 'tools', util: 'tools',
    5: 'search', src: 'search', search: 'search', cari: 'search', anime: 'search',
    6: 'group', gc: 'group', grup: 'group', group: 'group',
    7: 'shield', shield: 'shield', guard: 'shield', antilink: 'shield',
    8: 'media', media: 'media', stiker: 'media', sticker: 'media', conv: 'media', converter: 'media', magick: 'media',
    9: 'agama', rel: 'agama', religion: 'agama', agama: 'agama', islami: 'agama',
    10: 'audio', dsp: 'audio', audio: 'audio', audioeffect: 'audio', efek: 'audio',
    11: 'fun', fn: 'fun', fun: 'fun', hiburan: 'fun', react: 'fun', extra: 'fun', extras: 'fun', ex: 'fun',
    12: 'stalk', st: 'stalk', stalk: 'stalk', stalker: 'stalk', osint: 'stalk',
    13: 'gallery', gal: 'gallery', galeri: 'gallery', gallery: 'gallery', pack: 'gallery',
    14: 'nsfw', nsfw: 'nsfw', 18: 'nsfw', dewasa: 'nsfw', bokep: 'nsfw',
    15: 'owner', own: 'owner', owner: 'owner', sys: 'owner', system: 'owner'
  };

  const sub = subMap[rawSub] || null;

  const sections = {
    download: `┌── [ 01. DOWNLOADER ]
│ • ${p}play <judul/url>
│ • ${p}ytmp3 | ${p}yta | ${p}ytaudio <url>
│ • ${p}ytmp4 | ${p}ytv | ${p}ytvideo <url>
│ • ${p}tiktok | ${p}tt | ${p}ttdl <url>
│ • ${p}tiktokmp3 | ${p}ttmp3 | ${p}ttaudio <url>
│ • ${p}ig | ${p}reel | ${p}igdl <url>
│ • ${p}igstory | ${p}igs | ${p}story <user/url>
│ • ${p}fb | ${p}facebook | ${p}fbdl <url>
│ • ${p}spotify | ${p}sp <judul/url>
│ • ${p}soundcloud | ${p}sc <judul/url>
│ • ${p}mediafire | ${p}mf <url>
│ • ${p}sfile | ${p}sf <query/url>
│ • ${p}snackvideo | ${p}sv | ${p}snack <url>
│ • ${p}terabox | ${p}tb <url>
│ • ${p}mangadl | ${p}mdl <judul> [ch]
│ • ${p}animedl | ${p}adl <judul/link>
└──`,

    ai: `┌── [ 02. COGNITIVE AI ]
│ • ${p}ai | ${p}chatgpt <prompt>
│ • ${p}restha <prompt>
│ • ${p}ddg <prompt>
│ • ${p}perplexity | ${p}perp <prompt>
└──`,

    game: `┌── [ 03. INTERACTIVE GAMES ]
│ • ${p}c4 | ${p}connect4 @lawan
│ • ${p}ttt | ${p}tictactoe @lawan
│ • ${p}suit | ${p}suitpvp @lawan
│ • ${p}blackjack | ${p}bj [taruhan]
│ • ${p}slot | ${p}slots
│ • ${p}coinflip | ${p}cf [head/tail]
│ • ${p}dadu | ${p}dice | ${p}rolldice
│ • ${p}tebakangka | ${p}tangka [angka]
│ • ${p}sambungkata | ${p}skata [kata]
│ • ${p}tebakkartu | ${p}tkartu [1-5]
│ • ${p}tebaktokoh | ${p}ttokoh
│ • ${p}tebakibukota | ${p}tkota
│ • ${p}susunkata | ${p}tebakkata
│ • ${p}trivia | ${p}quiz
│ • ${p}math | ${p}matematika [easy/medium/hard]
│ • ${p}hint | ${p}clue
└──`,

    tools: `┌── [ 04. TOOLS & COMPILER ]
│ • ${p}draw | ${p}genimg | ${p}aiimg <deskripsi>
│ • ${p}c | ${p}cpp | ${p}c++ <kode c/c++ / reply>
│ • ${p}run | ${p}code <bahasa> <kode / reply>
│ • ${p}py | ${p}js | ${p}ts | ${p}go | ${p}rs | ${p}java <kode>
│ • ${p}php | ${p}rb | ${p}cs | ${p}kt | ${p}sh | ${p}lua | ${p}dart | ${p}swift <kode>
│ • ${p}iqc | ${p}quotely | ${p}iphonequote <pesan | bat | kartu | jam>
│ • ${p}remini | ${p}hd | ${p}upscale (reply foto)
│ • ${p}removebg | ${p}nobg | ${p}rmbg [fuzz%] (reply foto)
│ • ${p}emojimix | ${p}mix <emot1> <emot2>
│ • ${p}tourl | ${p}url (reply media)
│ • ${p}nulis | ${p}nulis2 | ${p}folio | ${p}magernulis <teks>
│ • ${p}nulisai <topik tugas>
│ • ${p}kalender | ${p}calendar | ${p}tgl
│ • ${p}qr | ${p}qrcode <teks/link>
│ • ${p}tr | ${p}translate <kode_bahasa> <teks>
│ • ${p}tts | ${p}speak [kode_bahasa] <teks>
│ • ${p}diary | ${p}catatan <teks>
│ • ${p}del | ${p}delete (reply pesan bot)
│ • ${p}text3d | ${p}neon | ${p}glitch | ${p}gold <teks>
│ • ${p}fire | ${p}graffiti | ${p}blood | ${p}matrix <teks>
│ • ${p}ice | ${p}retro <teks>
│ • ${p}ilovepdf | ${p}pdf (panduan ilovepdf)
│ • ${p}pdfinfo (reply pdf)
│ • ${p}pdfrotate [derajat] (reply pdf)
│ • ${p}pdfsplit <rentang> (reply pdf)
│ • ${p}pdfdel | ${p}pdfremove <halaman> (reply pdf)
│ • ${p}pdfwm | ${p}pdfwatermark <watermark> (reply pdf)
│ • ${p}pdfpage | ${p}pdfnumber (reply pdf)
│ • ${p}pdfcompress (reply pdf)
│ • ${p}topdf | ${p}jpg2pdf | ${p}img2pdf (reply foto)
│ • ${p}word2pdf | ${p}doc2pdf | ${p}wordtopdf (reply word .docx)
│ • ${p}excel2pdf | ${p}xls2pdf | ${p}exceltopdf (reply excel .xlsx)
│ • ${p}html2pdf | ${p}htmltopdf <html/url> (konversi html ke pdf)
│ • ${p}pdf2md | ${p}pdfmarkdown (reply pdf ke markdown)
└──`,

    search: `┌── [ 05. SEARCH & ANIME INFO ]
│ • ${p}google | ${p}gg <query>
│ • ${p}pinterest | ${p}pin | ${p}pt <query>
│ • ${p}pixiv | ${p}px <query>
│ • ${p}berita | ${p}news | ${p}br [topik]
│ • ${p}film | ${p}movie | ${p}fm <judul>
│ • ${p}drakor | ${p}kdrama <judul>
│ • ${p}apk | ${p}apksearch | ${p}apks <nama app>
│ • ${p}wiki | ${p}wikipedia | ${p}wk <query>
│ • ${p}shazam | ${p}sz (reply audio/video)
│ • ${p}budayabali | ${p}budaya | ${p}bbali <query>
│ • ${p}yts | ${p}ytsearch | ${p}vsearch <query>
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
│ • ${p}kick | ${p}tendang @tag
│ • ${p}add <nomor>
│ • ${p}kickall
│ • ${p}promote | ${p}admin @tag | ${p}promoteall
│ • ${p}demote | ${p}unadmin @tag | ${p}demoteall
│ • ${p}open | ${p}close | ${p}mute | ${p}unmute
│ • ${p}opentime | ${p}closetime <waktu: 10m/1h>
│ • ${p}vote <topik> | ${p}upvote | ${p}downvote
│ • ${p}checkvote | ${p}delvote
│ • ${p}getbio @tag (cek status/bio wa)
│ • ${p}getjoinrequest (daftar permintaan masuk)
│ • ${p}setname <nama baru>
│ • ${p}setdesc <deskripsi baru>
│ • ${p}setpp (reply foto profil grup)
│ • ${p}delppgc
│ • ${p}editinfo <open/close>
│ • ${p}ephemeral <on/off/24h/7d/90d>
│ • ${p}listgroup | ${p}listadmin
│ • ${p}invite <nomor>
│ • ${p}getcontact @tag
│ • ${p}sendcontact | ${p}savecontact <nomor> [nama]
│ • ${p}contactag
│ • ${p}react <emoji> (reply pesan)
│ • ${p}vv (reply pesan view-once)
└──`,

    shield: `┌── [ 07. GROUP SECURITY SHIELDS ]
│ • ${p}welcome on/off
│ • ${p}antilink | ${p}antilinkgc on/off
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
│ • ${p}brat | ${p}btext | ${p}brattext <teks>
│ • ${p}bratg | ${p}btextg | ${p}bratgreen <teks>
│ • ${p}bratb | ${p}btextb | ${p}bratblack <teks>
│ • ${p}bratvid | ${p}bvid <teks>
│ • ${p}toimg (reply stiker)
│ • ${p}togif | ${p}tovideo (reply stiker bergerak)
│ • ${p}tomp3 | ${p}getaudio (reply video/vn)
│ • ${p}tovn | ${p}vn (reply audio/video)
│ • ${p}rvo | ${p}readviewonce (reply view-once)
│ • ${p}emojimix | ${p}mix | ${p}emomix <emot1> <emot2>
│ • ${p}blur | ${p}charcoal | ${p}paint | ${p}sketch
│ • ${p}emboss | ${p}edge | ${p}invert | ${p}sepia
│ • ${p}swirl | ${p}implode | ${p}solarize | ${p}polaroid
│ • ${p}oilpaint | ${p}vignette | ${p}wave | ${p}sharpen
│ • ${p}rotate | ${p}flip | ${p}flop | ${p}mirror
│ • ${p}grayscale | ${p}bw | ${p}negate | ${p}blackwhite
│ • ${p}magick | ${p}im <opsi imagemagick>
└──`,

    agama: `┌── [ 09. RELIGION & SPIRITUALITY ]
│ • ${p}quran | ${p}alquran | ${p}qrn <surah:ayat>
│ • ${p}sholat | ${p}jadwalsholat | ${p}js [kota]
│ • ${p}kisahnabi | ${p}kn [nama nabi 1-25]
│ • ${p}alkitab | ${p}bible | ${p}injil | ${p}ktb <kitab pasal:ayat>
│ • ${p}gita | ${p}bhagavadgita | ${p}hindu <bab:sloka>
│ • ${p}doahindu [gayatri/trisandya/dll]
│ • ${p}dhammapada | ${p}buddha | ${p}dh [nomor syair]
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
│ • ${p}menfess | ${p}confess | ${p}menfes <nomor | pesan>
│ • ${p}fact
│ • ${p}pick <opsi 1 | opsi 2 | opsi 3>
│ • ${p}pickupline | ${p}gombal
│ • ${p}quotes
│ • ${p}animequote | ${p}quoteanime | ${p}qa
│ • ${p}couple | ${p}jodoh | ${p}soulmate
│ • ${p}can | ${p}is | ${p}when | ${p}where | ${p}what | ${p}how | ${p}rate <tanya>
│ • ${p}checkme
│ • ${p}stupidcheck | ${p}handsomecheck | ${p}hotcheck | ${p}smartcheck
│ • ${p}evilcheck | ${p}coolcheck | ${p}waifucheck | ${p}gaycheck
│ • ${p}cutecheck | ${p}lesbiancheck | ${p}hornycheck | ${p}prettycheck
│ • ${p}uncleancheck | ${p}greatcheck | ${p}dogcheck | ${p}uglycheck
│ • ${p}awesomecheck | ${p}lovelycheck
│ • ${p}hug | ${p}kiss | ${p}slap | ${p}pat | ${p}lick | ${p}bite | ${p}yeet @tag
│ • ${p}bonk | ${p}wink | ${p}poke | ${p}nom | ${p}cry | ${p}kill | ${p}bully @tag
│ • ${p}smile | ${p}wave | ${p}blush | ${p}dance | ${p}cuddle | ${p}highfive @tag
│ • ${p}handhold | ${p}spank | ${p}tickle | ${p}feed | ${p}smug | ${p}cringe @tag
│ • ${p}glomp | ${p}happy | ${p}awoo @tag
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
│ • TT Pics : ${p}ttkr, ${p}ttjp, ${p}ttid, ${p}tthijab, ${p}ttcn, ${p}ttth, ${p}ttvn, ${p}ttmy, ${p}ttrandom
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
│ • ${p}javsearch | ${p}jav | ${p}javdb <ID/Query>
│ • ${p}watchhentai | ${p}whentai | ${p}hentaisearch <query>
│ • ${p}lustpress | ${p}lp | ${p}r18 [provider] <query>
│ • ${p}xnxx | ${p}pornhub | ${p}eporner | ${p}ph <query>
│ • ${p}lpdl | ${p}xnxxdl | ${p}phdl | ${p}pornhubdl | ${p}epornerdl <url/query> (Video 360p)
│ • ${p}tomoe | ${p}doujin | ${p}doujinshi [provider] <query/code>
│ • ${p}nhentai | ${p}nh <code/query>
│ • ${p}nhpdf | ${p}tomoepdf | ${p}doujinpdf <kode>
│ • ${p}pururin | ${p}hentaifox | ${p}hfox <code/query>
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
│ • ${p}bc | ${p}broadcast | ${p}bcgc <pesan>
│ • ${p}signallog on/off
│ • ${p}autoreply | ${p}ar | ${p}argemini on/off
│ • ${p}addl | ${p}addlist <nomor / @tag / reply>
│ • ${p}dell | ${p}dellist <nomor / @tag / reply>
│ • ${p}listu | ${p}listuser | ${p}whitelist
│ • ${p}cmdstats | ${p}commandstats
│ • ${p}pm2 | ${p}pm2status
│ • ${p}pm2logs
│ • ${p}restart | ${p}reboot
│ • ${p}shutdown | ${p}stop | ${p}matikan
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

  // Jika user meminta sub-kategori spesifik (misal: .menudl, .menugc, .menu ai, .menu 18)
  if (sub && sections[sub]) {
    const captionText = `${header}\n${sections[sub]}\n\nKetik ${p}menu untuk melihat seluruh daftar menu.`;
    if (sub === 'nsfw') {
      const imgBuf = await getNsfwMenuImage();
      if (imgBuf) {
        return await sock.sendMessage(jid, { image: imgBuf, caption: captionText, mentions: [senderJid] }, { quoted: m });
      }
    }
    return sendMenuReply(captionText);
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
