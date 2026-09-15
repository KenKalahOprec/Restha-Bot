import { handleMenu, handleInfo } from './menu.js';
import {
  handlePlay,
  handleYtmp3,
  handleYtmp4,
  handleTiktok,
  handleTiktokMp3,
  handleInstagram,
  handleIgStory,
  handleFacebook,
  handleMusicStreaming,
  playSessions
} from './downloader.js';
import { handleAI } from './ai.js';
import {
  handleC4,
  handleTTT,
  handleTebakAngka,
  handleSambungKata,
  handleTebakKartu,
  handleDadu,
  handleTebakTokoh,
  handleTebakIbukota,
  handleBlackjack,
  handleSlot,
  handleCoinflip,
  handleSuit,
  handleMath,
  handleSusunKata,
  handleTrivia,
  handleHint,
  mathGames,
  tttGames,
  susunGames,
  c4Games,
  guessNumberGames,
  wordChainGames,
  charGuessGames,
  capitalGuessGames
} from './games.js';
import {
  handleRemini,
  handleBratvid,
  handleIqc,
  handleNulis,
  handleToUrl,
  handleKalender,
  handleQr,
  handleTranslate,
  handleTTS,
  handleDelete,
  handleDiary,
  handleCpp,
  handleCodeRunner,
  handleTextEffect,
  handleDraw,
  handleLaserMeme
} from './tools.js';
import {
  handleGoogle,
  handleWiki,
  handleYts,
  handleLyrics,
  handleChord,
  handlePixiv,
  handlePinterest,
  handleTiktokSearch,
  handleJavSearch,
  handleBudayaBali,
  handleWatchHentai
} from './search.js';
import { handleGroup } from './group.js';
import { handleReligion } from './religion.js';
import { handleMedia } from './media.js';
import { handleOwnerCommands } from './owner.js';
import {
  handleAnime,
  handleManga,
  handleManhwa,
  handleMangaDownload,
  handleAnimeDownload
} from './anime.js';
import { handleGallery, GALLERY_PACKS } from './gallery.js';
import {
  handleAudioEffect,
  handleShazam,
  handleAnimeQuote,
  handleBerita,
  handleFilm,
  handleApkSearch,
  handleMenfess,
  menfessSessions
} from './extras.js';
import { handleFun, REACTION_COMMANDS } from './fun.js';
import { AUDIO_EFFECT_NAMES } from '../libs/media.js';

export {
  playSessions,
  mathGames,
  tttGames,
  susunGames,
  c4Games,
  guessNumberGames,
  wordChainGames,
  charGuessGames,
  capitalGuessGames,
  menfessSessions
};

export async function dispatchCommand(sock, m, context) {
  const { cmd } = context;

  switch (cmd) {
    // 1. Menu & Help (Comprehensive Shorthands)
    case 'help':
    case 'menu':
    case 'm':
    case 'menudownload':
    case 'downloadmenu':
    case 'menudl':
    case 'dlmenu':
    case 'dl':
    case 'menuai':
    case 'aimenu':
    case 'ai':
    case 'menuconverter':
    case 'menuconv':
    case 'convmenu':
    case 'conv':
    case 'menugame':
    case 'gamemenu':
    case 'menugm':
    case 'gmmenu':
    case 'gm':
    case 'menusearch':
    case 'searchmenu':
    case 'menusrc':
    case 'srcmenu':
    case 'src':
    case 'menutools':
    case 'toolsmenu':
    case 'menutl':
    case 'tlmenu':
    case 'tl':
    case 'menugroup':
    case 'groupmenu':
    case 'menugc':
    case 'gcmenu':
    case 'gc':
    case 'menustalk':
    case 'stalkmenu':
    case 'menust':
    case 'stmenu':
    case 'st':
    case 'menuagama':
    case 'agamamenu':
    case 'agama':
    case 'menuislami':
    case 'menureligion':
    case 'religion':
    case 'menurel':
    case 'relmenu':
    case 'rel':
    case 'menuinfo':
    case 'infomenu':
    case 'menumedia':
    case 'mediamenu':
    case 'menugaleri':
    case 'galeri':
    case 'menumd':
    case 'mdmenu':
    case 'menunsfw':
    case 'nsfwmenu':
      return handleMenu(sock, m, context);

    case 'nsfw': {
      const sub = context.args?.[0]?.toLowerCase();
      if (sub === 'on' || sub === 'off') {
        return handleGroup(sock, m, context);
      }
      if (sub) {
        const resolvedCmd = GALLERY_PACKS[sub] ? sub : (GALLERY_PACKS['nsfw' + sub] ? 'nsfw' + sub : null);
        if (resolvedCmd) {
          return handleGallery(sock, m, { ...context, cmd: resolvedCmd });
        }
      }
      return handleMenu(sock, m, { ...context, cmd: 'menunsfw' });
    }
    case 'menuextras':
    case 'menuextra':
    case 'extrasmenu':
    case 'menuex':
    case 'exmenu':
    case 'ex':
    case 'menufun':
    case 'funmenu':
    case 'fun':
      return handleMenu(sock, m, context);

    case 'info':
      return handleInfo(sock, m, context);

    // 2. Downloader
    case 'play':
    case 'p':
      return handlePlay(sock, m, context);
    case 'ytmp3':
    case 'yta':
    case 'ytaudio':
      return handleYtmp3(sock, m, context);
    case 'ytmp4':
    case 'ytv':
    case 'ytvideo':
    case 'yt':
      return handleYtmp4(sock, m, context);
    case 'tiktok':
    case 'tt':
    case 'ttdl':
      return handleTiktok(sock, m, context);
    case 'tiktokmp3':
    case 'tiktok-mp3':
    case 'ttmp3':
    case 'ttaudio':
      return handleTiktokMp3(sock, m, context);
    case 'ig':
    case 'instagram':
    case 'igdl':
    case 'reel':
      return handleInstagram(sock, m, context);
    case 'igstory':
    case 'igs':
    case 'story':
      return handleIgStory(sock, m, context);
    case 'fb':
    case 'facebook':
    case 'fbdl':
      return handleFacebook(sock, m, context);
    case 'spotify':
    case 'sp':
    case 'spotify-play':
    case 'soundcloud':
    case 'sc':
      return handleMusicStreaming(sock, m, context);
    case 'mediafire':
    case 'mf':
    case 'sfile':
    case 'sf':
    case 'snackvideo':
    case 'sv':
    case 'snack':
    case 'terabox':
    case 'tb':
      return handleGenericDownload(sock, m, context);
    case 'mangadl':
    case 'dlmanga':
    case 'manga-pdf':
    case 'mdl':
      return handleMangaDownload(sock, m, context);
    case 'animedl':
    case 'dlanime':
    case 'anime360':
    case 'adl':
      return handleAnimeDownload(sock, m, context);

    // 3. AI Assistant
    case 'restha':
    case 'ai':
    case 'chatgpt':
    case 'gpt':
    case 'ddg':
    case 'perplexity':
    case 'perp':
      return handleAI(sock, m, context);

    // 4. Games
    case 'c4':
    case 'connect4':
    case 'connectfour':
      return handleC4(sock, m, context);
    case 'ttt':
    case 'tictactoe':
      return handleTTT(sock, m, context);
    case 'tebakangka':
    case 'tangka':
    case 'guessnumber':
      return handleTebakAngka(sock, m, context);
    case 'sambungkata':
    case 'skata':
    case 'wordchain':
      return handleSambungKata(sock, m, context);
    case 'tebakkartu':
    case 'tkartu':
    case 'hiddencard':
      return handleTebakKartu(sock, m, context);
    case 'dadu':
    case 'dice':
    case 'rolldice':
      return handleDadu(sock, m, context);
    case 'tebaktokoh':
    case 'ttokoh':
    case 'guesscharacter':
    case 'tebakkarakter':
      return handleTebakTokoh(sock, m, context);
    case 'tebakibukota':
    case 'tkota':
    case 'ibukota':
    case 'capitalcity':
      return handleTebakIbukota(sock, m, context);
    case 'blackjack':
    case 'bj':
      return handleBlackjack(sock, m, context);
    case 'slot':
    case 'slots':
      return handleSlot(sock, m, context);
    case 'coinflip':
    case 'coin':
    case 'cf':
      return handleCoinflip(sock, m, context);
    case 'suitpvp':
    case 'suit':
      return handleSuit(sock, m, context);
    case 'math':
    case 'matematika':
      return handleMath(sock, m, context);
    case 'susunkata':
    case 'tebakkata':
      return handleSusunKata(sock, m, context);
    case 'trivia':
    case 'quiz':
      return handleTrivia(sock, m, context);
    case 'hint':
    case 'clue':
    case 'bantuan':
      return handleHint(sock, m, context);

    // 5. Tools & Utilities
    case 'remini':
    case 'hd':
    case 'upscale':
      return handleRemini(sock, m, context);
    case 'bratvid':
    case 'bratvideo':
    case 'bvid':
      return handleBratvid(sock, m, context);
    case 'iqc':
    case 'lqc':
    case 'quotely':
    case 'iphonequote':
      return handleIqc(sock, m, context);
    case 'nulis':
    case 'nulis1':
    case 'nulis2':
    case 'nulis3':
    case 'tulis':
    case 'magernulis':
    case 'nulisai':
    case 'nuliskiri':
    case 'nuliskanan':
    case 'folio':
    case 'foliokiri':
    case 'foliokanan':
      return handleNulis(sock, m, context);
    case 'tourl':
    case 'url':
      return handleToUrl(sock, m, context);
    case 'kalender':
    case 'calendar':
    case 'tgl':
      return handleKalender(sock, m, context);
    case 'qr':
    case 'qrcode':
      return handleQr(sock, m, context);
    case 'tr':
    case 'translate':
      return handleTranslate(sock, m, context);
    case 'tts':
    case 'speak':
      return handleTTS(sock, m, context);
    case 'del':
    case 'delete':
      return handleDelete(sock, m, context);
    case 'diary':
    case 'catatan':
      return handleDiary(sock, m, context);
    case 'cpp':
    case 'c++':
    case 'runcpp':
    case 'c':
    case 'runc':
      return handleCpp(sock, m, context);
    case 'run':
    case 'code':
    case 'exec':
    case 'py':
    case 'python':
    case 'js':
    case 'node':
    case 'javascript':
    case 'ts':
    case 'typescript':
    case 'go':
    case 'golang':
    case 'rs':
    case 'rust':
    case 'java':
    case 'php':
    case 'rb':
    case 'ruby':
    case 'cs':
    case 'csharp':
    case 'kt':
    case 'kotlin':
    case 'bash':
    case 'sh':
    case 'lua':
    case 'dart':
    case 'swift':
      return handleCodeRunner(sock, m, context);

    // Text Effect Generators (10 styles)
    case 'text3d':
    case '3dtext':
    case 'neon':
    case 'glitch':
    case 'gold':
    case 'fire':
    case 'graffiti':
    case 'blood':
    case 'matrix':
    case 'ice':
    case 'retro':
      return handleTextEffect(sock, m, context);

    // AI Image Drawing & Prompt Crafting (GPT-Image 2.5 Skill)
    case 'draw':
    case 'aiimg':
    case 'genimg':
    case 'gptimage':
      return handleDraw(sock, m, context);

    // Laser Eyes Meme Generator (Meme Compositor)
    case 'lasermeme':
    case 'meme':
    case 'lasereyes':
    case 'apimeme':
      return handleLaserMeme(sock, m, context);

    // 6. Search
    case 'google':
    case 'gg':
      return handleGoogle(sock, m, context);
    case 'wiki':
    case 'wikipedia':
    case 'wk':
      return handleWiki(sock, m, context);
    case 'yts':
    case 'youtube-search':
    case 'ytsearch':
      return handleYts(sock, m, context);
    case 'lyrics':
    case 'lirik':
      return handleLyrics(sock, m, context);
    case 'chord':
    case 'kunci':
      return handleChord(sock, m, context);
    case 'pixiv':
    case 'px':
      return handlePixiv(sock, m, context);
    case 'pinterest':
    case 'pin':
    case 'pt':
      return handlePinterest(sock, m, context);
    case 'tiktoksearch':
    case 'ttsearch':
    case 'vsearch':
      return handleTiktokSearch(sock, m, context);
    case 'javsearch':
    case 'jav':
    case 'javdb':
      return handleJavSearch(sock, m, context);
    case 'budayabali':
    case 'bbali':
    case 'budaya':
      return handleBudayaBali(sock, m, context);
    case 'watchhentai':
    case 'whentai':
    case 'hentaisearch':
      return handleWatchHentai(sock, m, context);

    // 7. Group Administration
    case 'kick':
    case 'tendang':
    case 'promote':
    case 'admin':
    case 'demote':
    case 'unadmin':
    case 'mute':
    case 'close':
    case 'groupclose':
    case 'tutupgrup':
    case 'unmute':
    case 'open':
    case 'groupopen':
    case 'bukagrup':
    case 'hidetag':
    case 'ht':
    case 'tagall':
    case 'setpp':
    case 'setppgc':
    case 'setppgroup':
    case 'delppgroup':
    case 'delppgc':
    case 'setname':
    case 'setnamegc':
    case 'setnamegroup':
    case 'setsubject':
    case 'setdesc':
    case 'setdescgc':
    case 'setdescgroup':
    case 'link':
    case 'linkgc':
    case 'grouplink':
    case 'revoke':
    case 'resetlink':
    case 'listgroup':
    case 'listgc':
    case 'welcome':
    case 'setwelcome':
    case 'antibot':
    case 'antivv':
    case 'vv':
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
    case 'listadmin':
    case 'invite':
    case 'ephemeral':
    case 'delete':
    case 'add':
    case 'kickall':
    case 'promoteall':
    case 'demoteall':
    case 'getcontact':
    case 'savecontact':
    case 'sendcontact':
    case 'contactag':
    case 'totag':
    case 'editinfo':
    case 'opentime':
    case 'closetime':
    case 'getbio':
    case 'vote':
    case 'upvote':
    case 'downvote':
    case 'checkvote':
    case 'delvote':
    case 'antivirus':
    case 'antitoxic':
    case 'react':
    case 'getjoinrequest':
      return handleGroup(sock, m, context);

    // 8. Religion & Spirituality
    case 'kisahnabi':
    case 'nabi':
    case 'kn':
      return handleReligion(sock, m, context);
    case 'quran':
    case 'alquran':
    case 'qrn':
      return handleReligion(sock, m, context);
    case 'jadwalsholat':
    case 'sholat':
    case 'jsholat':
    case 'js':
      return handleReligion(sock, m, context);
    case 'alkitab':
    case 'bible':
    case 'injil':
    case 'ktb':
      return handleReligion(sock, m, context);
    case 'gita':
    case 'bhagavadgita':
    case 'doahindu':
    case 'hindu':
    case 'dhammapada':
    case 'buddha':
    case 'dh':
      return handleReligion(sock, m, context);

    // 9. Media & Stickers
    case 's':
    case 'sgif':
    case 'sticker':
    case 'stiker':
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
    case 'btextb':
    case 'toimg':
    case 'togif':
    case 'tovideo':
    case 'tomp3':
    case 'getaudio':
    case 'tovn':
    case 'vn':
    case 'rvo':
    case 'readviewonce':
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
    case 'vignette':
    case 'magick':
    case 'im':
      return handleMedia(sock, m, context);

    // 10. Owner & System
    case 'owner':
    case 'ownerinfo':
    case 'ping':
    case 'runtime':
    case 'uptime':
    case 'status':
    case 'serverstats':
    case 'stats':
    case 'setprefix':
    case 'block':
    case 'unblock':
    case 'bc':
    case 'broadcast':
    case 'broadcastgroup':
    case 'bcgc':
    case 'broadcastuser':
    case 'clearsession':
    case 'self':
    case 'githubstalk':
    case 'ghstalk':
    case 'mlstalk':
    case 'robloxstalk':
    case 'discordstalk':
    case 'dcstalk':
    case 'commandstats':
    case 'cmdstats':
    case 'signallog':
    case 'sessionlog':
    case 'autoreply':
    case 'autoreplygemini':
    case 'argemini':
    case 'ar':
    case 'addlist':
    case 'addl':
    case 'dellist':
    case 'dell':
    case 'listuser':
    case 'listu':
    case 'whitelist':
    case 'restart':
    case 'reboot':
    case 'shutdown':
    case 'stop':
    case 'off':
    case 'matikan':
      return handleOwnerCommands(sock, m, context);

    // 11. Anime / Manga / Manhwa
    case 'anime':
    case 'ani':
      return handleAnime(sock, m, context);

    case 'manga':
    case 'mnk':
      return handleManga(sock, m, context);

    case 'manhwa':
    case 'mhw':
      return handleManhwa(sock, m, context);

    // 13. Extras — anime quote, berita, film, apk
    case 'quoteanime':
    case 'qanime':
    case 'animequote':
    case 'qa':
      return handleAnimeQuote(sock, m, context);

    case 'berita':
    case 'news':
    case 'br':
      return handleBerita(sock, m, context);

    case 'film':
    case 'movie':
    case 'drakor':
    case 'fm':
      return handleFilm(sock, m, context);

    case 'apksearch':
    case 'apk':
    case 'apks':
      return handleApkSearch(sock, m, context);

    // 14. Fun & Entertainment
    case 'define':
    case 'readmore':
    case 'fact':
    case 'couple':
    case 'jodoh':
    case 'soulmate':
    case 'pick':
    case 'pickupline':
    case 'gombal':
    case 'quotes':
    case 'can':
    case 'is':
    case 'when':
    case 'where':
    case 'what':
    case 'how':
    case 'rate':
    case 'checkme':
    case 'stupidcheck':
    case 'handsomecheck':
    case 'uncleancheck':
    case 'hotcheck':
    case 'smartcheck':
    case 'greatcheck':
    case 'evilcheck':
    case 'dogcheck':
    case 'coolcheck':
    case 'waifucheck':
    case 'awesomecheck':
    case 'gaycheck':
    case 'cutecheck':
    case 'lesbiancheck':
    case 'hornycheck':
    case 'prettycheck':
    case 'lovelycheck':
    case 'uglycheck':
      return handleFun(sock, m, context);

    case 'shazam':
    case 'sz':
      return handleShazam(sock, m, context);

    case 'menfess':
    case 'menfes':
    case 'confess':
      return handleMenfess(sock, m, context);

    // 12. Gallery (random image/video packs)
    default:
      if (GALLERY_PACKS[cmd]) return handleGallery(sock, m, context);
      if (AUDIO_EFFECT_NAMES.includes(cmd)) return handleAudioEffect(sock, m, context);
      if (REACTION_COMMANDS.includes(cmd)) return handleFun(sock, m, context);
      break;
  }
}

