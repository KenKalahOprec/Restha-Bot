/**
 * Random image/video gallery from Toxic1239/Queen-RiasV2 JSON packs
 */

const BASE = 'https://raw.githubusercontent.com/Toxic1239/Queen-RiasV2/main/src/media';

export const GALLERY_PACKS = {
  // anime
  waifu:       { url: `${BASE}/anime/waifu.json`,       type: 'image' },
  neko:        { url: `${BASE}/anime/neko.json`,        type: 'image' },
  loli:        { url: `${BASE}/anime/loli.json`,        type: 'image' },
  husbu:       { url: `${BASE}/anime/husbu.json`,       type: 'image' },
  shota:       { url: `${BASE}/anime/shota.json`,       type: 'image' },
  animerandom: { url: `${BASE}/anime/random.json`,      type: 'image' },

  // randompics
  aesthetic:   { url: `${BASE}/randompics/aesthetic.json`,   type: 'image' },
  cat:         { url: `${BASE}/randompics/cat.json`,         type: 'image' },
  dog:         { url: `${BASE}/randompics/doggo.json`,       type: 'image' },
  car:         { url: `${BASE}/randompics/car.json`,         type: 'image' },
  kpop:        { url: `${BASE}/randompics/kpop.json`,        type: 'image' },
  wallhp:      { url: `${BASE}/randompics/wallhp.json`,      type: 'image' },
  wallml:      { url: `${BASE}/randompics/wallml.json`,      type: 'image' },
  ppcouple:    { url: `${BASE}/randompics/ppcouple.json`,    type: 'image' },
  cosplay:     { url: `${BASE}/randompics/cosplay.json`,     type: 'image' },
  rose:        { url: `${BASE}/randompics/rose.json`,        type: 'image' },
  ulzzangboy:  { url: `${BASE}/randompics/ulzzangboy.json`,  type: 'image' },
  ulzzanggirl: { url: `${BASE}/randompics/ulzzanggirl.json`, type: 'image' },

  // tiktok pics
  ttkr:    { url: `${BASE}/tiktokpics/korea.json`,       type: 'image' },
  ttjp:    { url: `${BASE}/tiktokpics/japan.json`,       type: 'image' },
  ttid:    { url: `${BASE}/tiktokpics/indonesia.json`,   type: 'image' },
  tthijab: { url: `${BASE}/tiktokpics/hijab.json`,       type: 'image' },
  ttcn:    { url: `${BASE}/tiktokpics/china.json`,       type: 'image' },
  ttth:    { url: `${BASE}/tiktokpics/thailand.json`,    type: 'image' },
  ttvn:    { url: `${BASE}/tiktokpics/vietnam.json`,     type: 'image' },
  ttmy:    { url: `${BASE}/tiktokpics/malaysia.json`,    type: 'image' },
  ttrandom:{ url: `${BASE}/tiktokpics/random.json`,      type: 'image' },

  // tiktok vids
  ttvgirl:  { url: `${BASE}/tiktokvids/tiktokgirl.json`, type: 'video' },
  ttvukhty: { url: `${BASE}/tiktokvids/ukhty.json`,      type: 'video' },
  ttvsantuy:{ url: `${BASE}/tiktokvids/santuy.json`,     type: 'video' },

  // nsfw
  nsfwmilf:     { url: `${BASE}/nsfw/milf.json`,     type: 'image' },
  nsfwyuri:     { url: `${BASE}/nsfw/yuri.json`,     type: 'image' },
  nsfwzettai:   { url: `${BASE}/nsfw/zettai.json`,   type: 'image' },
  nsfwfoot:     { url: `${BASE}/nsfw/foot.json`,     type: 'image' },
  nsfweba:      { url: `${BASE}/nsfw/eba.json`,      type: 'image' },
  nsfwblowjob:  { url: `${BASE}/nsfw/blowjob.json`,  type: 'image' },
  nsfwcuckold:  { url: `${BASE}/nsfw/cuckold.json`,  type: 'image' },
  nsfwpussy:    { url: `${BASE}/nsfw/pussy.json`,    type: 'image' },
  hentai:       { type: 'image' },
  paizuri:      { type: 'image' },
  nsfwass:      { type: 'image' },
  nsfwboobs:    { type: 'image' },
  nsfwneko:     { type: 'image' },
  nsfwanal:     { type: 'image' },
  nsfwloli:     { blocked: true },
};

const NSFW_DIRECT_APIS = {
  nsfwyuri:    async () => (await (await fetch('https://api.purrbot.site/v2/img/nsfw/yuri/gif', { signal: AbortSignal.timeout(10000) })).json())?.link,
  nsfwfoot:    async () => (await (await fetch('https://nekobot.xyz/api/image?type=feet', { signal: AbortSignal.timeout(10000) })).json())?.message,
  nsfwblowjob: async () => (await (await fetch('https://nekobot.xyz/api/image?type=blowjob', { signal: AbortSignal.timeout(10000) })).json())?.message,
  nsfwpussy:   async () => (await (await fetch('https://nekobot.xyz/api/image?type=pussy', { signal: AbortSignal.timeout(10000) })).json())?.message,
  nsfwzettai:  async () => (await (await fetch('https://nekobot.xyz/api/image?type=hthigh', { signal: AbortSignal.timeout(10000) })).json())?.message,
  hentai:      async () => {
    try {
      const res = await fetch('https://nekobot.xyz/api/image?type=hentai', { signal: AbortSignal.timeout(10000) });
      const data = await res.json();
      if (data?.message) return data.message;
    } catch {}
    const res2 = await fetch('https://nekobot.xyz/api/image?type=hboobs', { signal: AbortSignal.timeout(10000) });
    return (await res2.json())?.message;
  },
  paizuri:     async () => (await (await fetch('https://nekobot.xyz/api/image?type=paizuri', { signal: AbortSignal.timeout(10000) })).json())?.message,
  nsfwass:     async () => (await (await fetch('https://nekobot.xyz/api/image?type=hass', { signal: AbortSignal.timeout(10000) })).json())?.message,
  nsfwboobs:   async () => (await (await fetch('https://nekobot.xyz/api/image?type=hboobs', { signal: AbortSignal.timeout(10000) })).json())?.message,
  nsfwneko:    async () => (await (await fetch('https://nekobot.xyz/api/image?type=neko', { signal: AbortSignal.timeout(10000) })).json())?.message,
  nsfwanal:    async () => {
    try {
      const res = await fetch('https://nekobot.xyz/api/image?type=anal', { signal: AbortSignal.timeout(10000) });
      const data = await res.json();
      if (data?.message) return data.message;
    } catch {}
    return null;
  },
};

const cache = new Map();

async function fetchPack(packUrl) {
  if (cache.has(packUrl)) return cache.get(packUrl);
  const res = await fetch(packUrl, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Gagal mengambil pack data`);
  const data = await res.json();
  cache.set(packUrl, data);
  return data;
}

export async function handleGallery(sock, m, { jid, cmd }) {
  const pack = GALLERY_PACKS[cmd];
  if (!pack) return;

  if (pack.blocked) {
    return sock.sendMessage(jid, { text: '❌ Permintaan ditolak: Konten eksplisit karakter di bawah umur (loli/shota) dilarang keras.' }, { quoted: m });
  }

  try {
    let mediaUrl = null;

    if (NSFW_DIRECT_APIS[cmd]) {
      try {
        mediaUrl = await NSFW_DIRECT_APIS[cmd]();
      } catch {}
    }

    if (!mediaUrl && pack.url) {
      const data = await fetchPack(pack.url);
      const item = data[Math.floor(Math.random() * data.length)];

      // Khusus ppcouple: item memiliki properti male & female
      if (cmd === 'ppcouple' && item && (item.male || item.female)) {
        if (item.male) {
          try {
            const resM = await fetch(item.male, { signal: AbortSignal.timeout(15000) });
            if (resM.ok) {
              const bufM = Buffer.from(await resM.arrayBuffer());
              await sock.sendMessage(jid, { image: bufM, caption: '💑 *PP Couple (Cowok / Male)*' }, { quoted: m });
            }
          } catch {}
        }
        if (item.female) {
          try {
            const resF = await fetch(item.female, { signal: AbortSignal.timeout(15000) });
            if (resF.ok) {
              const bufF = Buffer.from(await resF.arrayBuffer());
              await sock.sendMessage(jid, { image: bufF, caption: '💑 *PP Couple (Cewek / Female)*' });
            }
          } catch {}
        }
        return;
      }

      mediaUrl = item?.url || item?.image || item?.link || (typeof item === 'string' ? item : null);
    }

    if (!mediaUrl) throw new Error('URL media tidak ditemukan');

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
    };

    let res;
    try {
      res = await fetch(mediaUrl, { headers, signal: AbortSignal.timeout(20000) });
    } catch {
      res = await fetch(mediaUrl, { headers, signal: AbortSignal.timeout(20000) });
    }

    if (!res.ok) throw new Error('Gagal mengunduh media');
    const buf = Buffer.from(await res.arrayBuffer());

    const isGif = mediaUrl.endsWith('.gif') || res.headers.get('content-type')?.includes('gif');
    if (pack.type === 'video') {
      await sock.sendMessage(jid, { video: buf, mimetype: 'video/mp4', caption: `[${cmd}]` }, { quoted: m });
    } else {
      await sock.sendMessage(jid, { image: buf, mimetype: isGif ? 'image/gif' : 'image/jpeg', caption: `[${cmd}]` }, { quoted: m });
    }
  } catch (err) {
    await sock.sendMessage(jid, { text: `[ERROR] ${err.message}` }, { quoted: m });
  }
}

