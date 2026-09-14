export default {
  ownerName: 'Putu Pasek Jade Aurestha',
  ownerNumber: '6281339467851',
  ownerGithub: 'https://github.com/KenKalahOprec',
  prefix: '.',
  stickerPack: 'Selfbot by Jade',
  stickerAuthor: 'Jade',
  geminiApiKey: process.env.GEMINI_API_KEY || '', // Dapatkan gratis tanpa kartu kredit di https://aistudio.google.com/app/apikey
  showSignalLogs: false, // Aktifkan (true) jika ingin menampilkan log sesi libsignal / ratchet di terminal
  autoReplyGemini: false, // Fitur OP: Auto-reply AI Gemini khusus chat owner (on/off)
  allowedUsers: [] // Daftar nomor yang diizinkan mengakses semua command/prefix (.addlist / .addl)
};
