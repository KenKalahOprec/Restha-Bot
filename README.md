<!-- Improved compatibility of back to top link: See: https://github.com/othneildrew/Best-README-Template/pull/73 -->
<a id="readme-top"></a>

<!-- PROJECT SHIELDS -->
<div align="center">

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]

</div>

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/KenKalahOprec/Restha-Bot">
    <img src="https://media.giphy.com/media/CchzkJJ6UrQmQ/giphy.gif" alt="Itachi Uchiha Logo" width="300" style="border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
  </a>

  <h2 align="center">RESTHA BOT</h2>

  <p align="center">
    Bot Otomasi & Asisten WhatsApp Modern Berperforma Tinggi Berbasis Baileys
    <br />
    <a href="https://github.com/KenKalahOprec/Restha-Bot"><strong>Jelajahi Dokumentasi »</strong></a>
    <br />
    <br />
    <a href="https://github.com/KenKalahOprec/Restha-Bot/issues/new?labels=bug">Laporkan Masalah</a>
    ·
    <a href="https://github.com/KenKalahOprec/Restha-Bot/issues/new?labels=enhancement">Ajukan Fitur</a>
  </p>
</div>

<!-- DAFTAR ISI -->
<details open>
  <summary>Daftar Isi</summary>
  <ol>
    <li>
      <a href="#tentang-proyek">Tentang Proyek</a>
      <ul>
        <li><a href="#teknologi-yang-digunakan">Teknologi yang Digunakan</a></li>
      </ul>
    </li>
    <li><a href="#struktur-direktori">Struktur Direktori Lengkap</a></li>
    <li>
      <a href="#memulai">Memulai</a>
      <ul>
        <li><a href="#prasyarat">Prasyarat</a></li>
        <li><a href="#instalasi">Instalasi</a></li>
      </ul>
    </li>
    <li>
      <a href="#tabel-menu--fitur-lengkap">Tabel Menu & Fitur Lengkap (15 Kategori)</a>
      <ul>
        <li><a href="#01-downloader">01. Downloader</a></li>
        <li><a href="#02-cognitive-ai">02. Cognitive AI</a></li>
        <li><a href="#03-interactive-games">03. Interactive Games</a></li>
        <li><a href="#04-tools--compiler">04. Tools & Compiler</a></li>
        <li><a href="#05-search--anime-info">05. Search & Anime Info</a></li>
        <li><a href="#06-group-governance">06. Group Governance</a></li>
        <li><a href="#07-group-security-shields">07. Group Security Shields</a></li>
        <li><a href="#08-media-sticker--imagemagick">08. Media, Sticker & ImageMagick</a></li>
        <li><a href="#09-religion--spirituality">09. Religion & Spirituality</a></li>
        <li><a href="#10-audio-dsp-filters">10. Audio DSP Filters</a></li>
        <li><a href="#11-fun-checkers--confession">11. Fun, Checkers & Confession</a></li>
        <li><a href="#12-osint-stalker">12. OSINT Stalker</a></li>
        <li><a href="#13-curated-gallery--tiktok-packs">13. Curated Gallery & TikTok Packs</a></li>
        <li><a href="#14-restricted-gallery-18">14. Restricted Gallery (18+)</a></li>
        <li><a href="#15-owner--system-management">15. Owner & System Management</a></li>
      </ul>
    </li>
    <li><a href="#rencana-pengembangan">Rencana Pengembangan</a></li>
    <li><a href="#kontribusi">Kontribusi</a></li>
    <li><a href="#lisensi">Lisensi</a></li>
    <li><a href="#kontak">Kontak</a></li>
  </ol>
</details>

<!-- TENTANG PROYEK -->
## Tentang Proyek

**Restha Bot** adalah bot WhatsApp otomatis canggih berbasis `@whiskeysockets/baileys` yang dirancang untuk performa tinggi, ketahanan sesi, dan penanganan media yang lengkap. Dilengkapi dengan Hot-Reloading modul tanpa putus koneksi, arsitektur anti-crash, integrasi AI Gemini, audio DSP filter lengkap, pengenalan lagu Shazam, pesan rahasia Menfess dua arah, generator stiker Brat ragam tema, hingga sistem proteksi grup otomatis.

### Teknologi yang Digunakan

* [![NodeJS][Node.js]][NodeJS-url]
* [![JavaScript][JavaScript.com]][JavaScript-url]
* [![FFmpeg][FFmpeg.org]][FFmpeg-url]

<p align="right">(<a href="#readme-top">kembali ke atas</a>)</p>

<!-- STRUKTUR DIREKTORI -->
## Struktur Direktori Lengkap

```text
restha-bot/
├── config.js                      # Konfigurasi owner, prefix, API key, & whitelist
├── index.js                       # Entry point koneksi Baileys & watcher hot-reloader
├── package.json                   # Metadata dependensi dan skrip proyek
├── session/                       # Direktori penyimpanan multi-file auth Baileys
└── src/
    ├── assets/                    # File media statis, font, & template canvas
    │   ├── iqc/                   # Template & font iPhone Quotes Creator
    │   │   ├── background.png
    │   │   └── SFPRODISPLAYREGULAR.otf
    │   └── nulis/                 # Aset bot buku tulis & lembar folio
    │       ├── buku_kanan.jpg
    │       ├── buku_kiri.jpg
    │       ├── folio_kanan.jpg
    │       ├── folio_kiri.jpg
    │       └── Indie-Flower.ttf
    ├── commands/                  # Router perintah & logika eksekusi
    │   ├── ai.js                  # Handler Google Gemini AI & generator gambar
    │   ├── anime.js               # Handler Otakudesu & Manga batch downloader
    │   ├── downloader.js          # Handler YouTube, Spotify, SoundCloud, TikTok, IG, FB
    │   ├── extras.js              # Handler Shazam audio, Menfess anonim, Berita, APK
    │   ├── fun.js                 # Handler checker, reaction sticker, gombal, quotes
    │   ├── gallery.js             # Handler curated packs wallpaper, cosplay, TikTok
    │   ├── games.js               # Handler permainan interaktif (C4, TTT, Suit, Blackjack)
    │   ├── group.js               # Handler administrasi grup (kick, promote, link, hidetag)
    │   ├── index.js               # Dispatcher utama & routing switch-case perintah
    │   ├── media.js               # Handler stiker, Brat generator, efek ImageMagick
    │   ├── menu.js                # Handler tampilan menu help 15 kategori interaktif
    │   ├── owner.js               # Handler restart, shutdown, whitelist, broadcast
    │   ├── religion.js            # Handler Al-Qur'an, Jadwal Sholat, Alkitab, Gita
    │   ├── search.js              # Handler Google, Wiki, BudayaBali, WatchHentai SNI
    │   └── tools.js               # Handler compiler kode, remini, toURL, OCR, TTS
    ├── handlers/                  # Event listener socket Baileys
    │   ├── group.js               # Listener event member join/leave & update grup
    │   └── message.js             # Interceptor pesan, anti-spam, relay Menfess & whitelist
    └── libs/                      # Utilitas core, scraper engine, & helper
        ├── ai.js                  # Engine integrasi API Google Gemini
        ├── auth.js                # Sistem otorisasi & manajemen whitelist nomor
        ├── constants.js           # Konstanta global & definisi statis
        ├── format.js              # Helper pemformatan teks, durasi, & angka
        ├── games.js               # Engine logika board game (Connect Four, Tic-Tac-Toe)
        ├── groupSettings.js       # Konfigurasi per-grup (antilink, antibot, antivv)
        ├── instagram.js           # Engine scraper Instagram reels & post
        ├── logger.js              # Custom ANSI terminal logger
        ├── manga.js               # Scraper pembaca & unduh bab Manga
        ├── media.js               # Engine konversi audio FFmpeg, Brat SVG, & ImageMagick
        ├── otakudesu.js           # Scraper anime streaming Otakudesu
        ├── scrapers.js            # Scraper multi-sumber (Film, Berita, APK, Lirik)
        ├── shazam-api.js          # Core reverse-engine fingerprinting Shazam API
        └── textEffects.js         # Generator efek teks stilistik & banner ASCII
```

<p align="right">(<a href="#readme-top">kembali ke atas</a>)</p>

<!-- MEMULAI -->
## Memulai

Ikuti langkah-langkah berikut untuk memasang dan menjalankan bot pada environment Anda.

### Prasyarat

* **Node.js**: Versi 18.0.0 atau lebih baru
* **npm** / **yarn** / **pnpm**
* **FFmpeg**: Terpasang otomatis melalui `@ffmpeg-installer/ffmpeg`

### Instalasi

1. Kloning repositori:
   ```sh
   git clone https://github.com/KenKalahOprec/Restha-Bot.git
   cd Restha-Bot
   ```
2. Pasang dependensi:
   ```sh
   npm install
   ```
3. Konfigurasikan file `config.js`:
   ```js
   export default {
     ownerName: 'Putu Pasek Jade Aurestha',
     ownerNumber: '6281339467851',
     prefix: '.',
     geminiApiKey: 'API_KEY_GEMINI_ANDA',
     // ...
   };
   ```
4. Jalankan bot:
   ```sh
   # Mode Scan QR Code:
   node index.js

   # Mode Pairing Code WhatsApp:
   node index.js --pairing 6281339467851
   ```

<p align="right">(<a href="#readme-top">kembali ke atas</a>)</p>

<!-- TABEL MENU & FITUR LENGKAP -->
## Tabel Menu & Fitur Lengkap

### 01. Downloader
| Perintah | Shortcut | Parameter | Deskripsi |
|---|---|---|---|
| `.play` | - | `<judul / URL>` | Memutar & mengunduh audio lagu dari YouTube |
| `.ytmp3` | `.yta` | `<URL YouTube>` | Mengunduh audio berkualitas tinggi dari YouTube |
| `.ytmp4` | `.ytv` | `<URL YouTube>` | Mengunduh video MP4 dari YouTube |
| `.tiktok` | `.tt` | `<URL TikTok>` | Mengunduh video TikTok tanpa watermark |
| `.tiktokmp3` | `.ttmp3` | `<URL TikTok>` | Mengunduh audio lagu dari postingan TikTok |
| `.ig` | `.reel` | `<URL Instagram>` | Mengunduh video Reels atau postingan gambar IG |
| `.igstory` | `.igs` | `<username / URL>` | Mengunduh Story Instagram aktif |
| `.fb` | `.facebook` | `<URL Facebook>` | Mengunduh video publik dari Facebook |
| `.spotify` | `.sp` | `<judul / link>` | Streaming & unduh lagu Spotify via pencarian audio |
| `.soundcloud` | `.sc` | `<judul / link>` | Streaming & unduh lagu dari SoundCloud |
| `.mediafire` | `.mf` | `<URL MediaFire>` | Mengunduh file langsung dari MediaFire |
| `.sfile` | `.sf` | `<query / link>` | Mencari & mengunduh file dari Sfile.mobi |
| `.snackvideo` | `.sv` | `<URL SnackVideo>`| Mengunduh video tanpa watermark dari SnackVideo |
| `.terabox` | `.tb` | `<URL TeraBox>` | Mengunduh file dari tautan penyimpanan TeraBox |
| `.mangadl` | `.mdl` | `<judul> [ch]` | Mengunduh chapter komik/manga dalam format PDF/ZIP |
| `.animedl` | `.adl` | `<judul / link>` | Mengunduh episode anime langsung dari Otakudesu |

### 02. Cognitive AI
| Perintah | Shortcut | Parameter | Deskripsi |
|---|---|---|---|
| `.ai` | `.chatgpt` | `<prompt>` | Percakapan pintar dan pemecahan masalah dengan Gemini AI |
| `.restha` | - | `<prompt>` | Asisten AI personal dengan persona Restha |
| `.ddg` | - | `<prompt>` | Pencarian jawaban AI berbasis DuckDuckGo |
| `.perplexity` | `.perp` | `<prompt>` | Pencarian jawaban bertenaga web research AI |

### 03. Interactive Games
| Perintah | Shortcut | Parameter | Deskripsi |
|---|---|---|---|
| `.c4` | `.connect4` | `@lawan` | Permainan Connect Four PvP atau vs Bot (kolom 1-7) |
| `.ttt` | `.tictactoe`| `@lawan` | Permainan Tic-Tac-Toe multiplayer pada grid 3x3 |
| `.suit` | `.suitpvp` | `@lawan` | Tantangan permainan Gunting-Batu-Kertas |
| `.blackjack` | `.bj` | `[taruhan]` | Permainan kartu klasik kasino 21 melawan bot |
| `.slot` | `.slots` | - | Mesin slot bergulir untuk menguji keberuntungan |
| `.coinflip` | `.cf` | `[head/tail]` | Permainan lempar koin keberuntungan |
| `.dadu` | `.dice` | - | Melempar dadu angka acak 1 sampai 6 |
| `.tebakangka`| - | `[angka]` | Permainan tebak angka tersembunyi dengan indikator |
| `.sambungkata`| - | `[kata]` | Permainan menyambung suku kata bahasa Indonesia |
| `.tebakkartu`| - | `[1-5]` | Menebak kartu rahasia yang dipilih bot |
| `.tebaktokoh`| - | - | Kuis menebak nama tokoh terkenal Indonesia & dunia |
| `.tebakibukota`| - | - | Kuis menebak nama ibu kota negara di dunia |
| `.susunkata` | `.tebakkata` | - | Permainan mengacak dan menyusun kembali kata |
| `.trivia` | `.quiz` | - | Kuis pengetahuan umum bergaya cerdas cermat |
| `.math` | - | `[tingkat]` | Kuis matematika cepat (easy, medium, hard) |
| `.hint` | `.clue` | - | Meminta petunjuk huruf bantuan pada permainan aktif |

### 04. Tools & Compiler
| Perintah | Shortcut | Parameter | Deskripsi |
|---|---|---|---|
| `.draw` | `.genimg`, `.gptimage` | `<deskripsi>` | Menghasilkan gambar ilustrasi AI (GPT-Image 2.5 Engine) |
| `.lasermeme` | `.meme`, `.lasereyes` | `<teks>` | Membuat stiker meme laser eyes, flowchart, & efek elemen (reply foto) |
| `.c` | `.cpp`, `.c++` | `<kode / reply>` | Menjalankan dan mengompilasi kode C/C++ |
| `.run` | `.code` | `<bahasa> <kode>`| Menjalankan kode multi-bahasa pemrograman |
| `.py` | - | `<kode Python>` | Menjalankan skrip Python 3 secara terisolasi |
| `.js` | `.ts` | `<kode JS/TS>` | Menjalankan skrip Node.js / JavaScript |
| `.go` | `.rs`, `.java` | `<kode>` | Menjalankan kode Golang, Rust, atau Java |
| `.iqc` | - | `<pesan\|bat\|jam>`| Membuat mockup gelembung chat iPhone Quotes |
| `.remini` | `.hd` | `(reply foto)` | Menjernihkan resolusi foto buram menjadi HD |
| `.tourl` | `.url` | `(reply media)` | Mengunggah foto/video ke tautan hosting internet |
| `.nulis` | `.nulis2`, `.folio`| `<teks>` | Mengubah teks ketikan menjadi tulisan tangan buku |
| `.nulisai` | - | `<topik tugas>` | AI yang otomatis mengerjakan esai & menulis di buku |
| `.kalender` | - | - | Menampilkan kalender bulan dan tanggal hari ini |
| `.qr` | `.qrcode` | `<teks / link>` | Membuat gambar kode QR instan |
| `.tr` | - | `<target> <teks>`| Menerjemahkan bahasa ke puluhan bahasa dunia |
| `.tts` | - | `[bahasa] <teks>`| Mengonversi teks menjadi audio suara manusia |
| `.diary` | `.catatan` | `<teks>` | Menyimpan buku harian / catatan privat di bot |
| `.del` | - | `(reply bot)` | Menghapus pesan terkirim bot secara otomatis |
| `.text3d` | `.neon`, `.glitch`| `<teks>` | Membuat grafiti teks bergaya efek visual 3D |

### 05. Search & Anime Info
| Perintah | Shortcut | Parameter | Deskripsi |
|---|---|---|---|
| `.google` | `.gg` | `<query>` | Mencari informasi melalui mesin telusur Google |
| `.pinterest`| `.pin`, `.pt` | `<query>` | Mencari foto estetik & inspirasi dari Pinterest |
| `.pixiv` | `.px` | `<query>` | Mencari ilustrasi anime berkualitas dari Pixiv |
| `.berita` | `.news`, `.br`| `[topik]` | Membaca berita terkini dari portal CNN/CNBC |
| `.film` | `.movie`, `.fm`| `<judul>` | Informasi database sinopsis & rating film TMDB/IMDb |
| `.drakor` | - | `<judul>` | Pencarian informasi drama Korea & jadwal tayang |
| `.apk` | `.apksearch` | `<nama>` | Mencari link unduhan file APK Android terpercaya |
| `.wiki` | `.wikipedia` | `<query>` | Mengambil ringkasan ensiklopedia dari Wikipedia |
| `.shazam` | `.sz` | `(reply audio)` | Mengidentifikasi judul lagu & penyanyi via sampel audio |
| `.budayabali`| `.bbali` | `<query>` | Ensiklopedia artikel kebudayaan, adat, & tradisi Bali |
| `.yts` | `.ytsearch` | `<query>` | Menampilkan daftar hasil pencarian video YouTube |
| `.lirik` | `.lyrics` | `<judul>` | Mencari lirik lagu lengkap musisi lokal & internasional |
| `.chord` | `.kunci` | `<judul>` | Menampilkan chord gitar dan kunci dasar lagu |
| `.tiktoksearch`| `.ttsearch`| `<query>` | Mencari video tren TikTok berdasarkan kata kunci |
| `.anime` | `.ani` | `<judul>` | Informasi data anime (skor, studio, episode, genre) |
| `.manga` | `.mnk` | `<judul>` | Informasi komik manga Jepang beserta status rilis |
| `.manhwa` | `.mhw` | `<judul>` | Informasi komik webtoon/manhwa asal Korea |

### 06. Group Governance
| Perintah | Shortcut | Parameter | Deskripsi |
|---|---|---|---|
| `.hidetag` | `.ht` | `<pesan>` | Mengirim pesan dengan tag tersembunyi ke semua member |
| `.tagall` | - | `[pesan]` | Menandai seluruh peserta grup dengan daftar nama |
| `.totag` | - | `(reply pesan)` | Mengulang pesan yang di-reply menjadi tag semua member |
| `.linkgc` | `.link` | - | Mengambil tautan undangan grup saat ini |
| `.revoke` | `.resetlink` | - | Menyetel ulang link grup agar link lama tidak valid |
| `.kick` | - | `@tag / nomor` | Mengeluarkan anggota tertentu dari grup |
| `.add` | - | `<nomor>` | Memasukkan nomor WhatsApp ke dalam grup |
| `.kickall` | - | - | Mengeluarkan seluruh peserta non-admin (hanya owner) |
| `.promote` | `.promoteall` | `@tag` | Mengangkat anggota menjadi admin grup |
| `.demote` | `.demoteall` | `@tag` | Menurunkan status admin menjadi anggota biasa |
| `.open` | `.close` | - | Membuka atau menutup grup untuk izin chat anggota |
| `.setname` | - | `<nama baru>` | Mengganti judul subjek grup WhatsApp |
| `.setdesc` | - | `<deskripsi>` | Memperbarui teks deskripsi aturan grup |
| `.setpp` | - | `(reply foto)` | Mengganti foto profil grup langsung via bot |
| `.delppgc` | - | - | Menghapus foto profil grup menjadi kosong |
| `.editinfo` | - | `<open/close>` | Mengatur siapa yang dapat mengedit info grup |
| `.ephemeral`| - | `<opsi>` | Mengatur pesan sementara (on, off, 24h, 7d, 90d) |
| `.listgroup`| `.listadmin` | - | Menampilkan daftar grup terhubung & anggota admin |
| `.invite` | - | `<nomor>` | Mengirimkan link undangan grup ke nomor pribadi |
| `.getcontact`| - | `@tag` | Mengambil kontak vCard dari anggota yang ditandai |
| `.sendcontact`| - | `<nomor> [nama]`| Mengirimkan kartu kontak nama ke ruang obrolan |

### 07. Group Security Shields
| Perintah | Parameter | Deskripsi |
|---|---|---|
| `.welcome` | `on / off` | Menyambut anggota baru & pamitan saat member keluar |
| `.antilink` | `on / off` | Menghapus link grup WhatsApp asing & kick pelanggar |
| `.antitoxic` | `on / off` | Menghapus pesan yang mengandung kata-kata kasar/kotor |
| `.antibot` | `on / off` | Mengeluarkan bot WhatsApp lain yang masuk tanpa izin |
| `.antivv` | `on / off` | Mengirim ulang foto/video sekali lihat (View-Once) ke grup |
| `.antivirus` | `on / off` | Proteksi terhadap teks virtex / bug pembuat crash |
| `.antiforeign`| `on / off` | Mengeluarkan nomor berawalan luar negeri (selain +62) |
| `.antimedia` | `on / off` | Memblokir pengiriman semua jenis lampiran media |
| `.antiaudio` | `on / off` | Memblokir pengiriman pesan suara / rekaman audio |
| `.antivideo` | `on / off` | Memblokir pengiriman video di dalam obrolan grup |
| `.antiimage` | `on / off` | Memblokir pengiriman foto atau gambar di dalam grup |
| `.antidocument`| `on / off` | Memblokir file dokumen, APK, atau zip |
| `.antisticker`| `on / off` | Menghapus stiker yang dikirimkan anggota |
| `.anticontact`| `on / off` | Memblokir pengiriman kartu kontak vCard |
| `.antilocation`| `on / off` | Memblokir kiriman titik lokasi koordinat |
| `.antipoll` | `on / off` | Memblokir fitur jajak pendapat (polling) WhatsApp |
| `.adminevent`| `on / off` | Notifikasi otomatis saat ada admin yang di-promote/demote |

### 08. Media, Sticker & ImageMagick
| Perintah | Shortcut | Parameter | Deskripsi |
|---|---|---|---|
| `.s` | `.sticker` | `[pack \| author]`| Mengubah foto atau video pendek menjadi stiker WA |
| `.sgif` | - | `[pack \| author]`| Membuat stiker bergerak animasi dari video / gif |
| `.brat` | `.btext` | `<teks>` | Generator stiker teks Brat resmi dengan latar **putih** |
| `.bratg` | `.btextg` | `<teks>` | Generator stiker teks Brat resmi dengan latar **ijo** |
| `.bratb` | `.btextb` | `<teks>` | Generator stiker teks Brat resmi dengan latar **hitam** |
| `.bratvid` | `.bvid` | `<teks>` | Stiker video animasi teks mengetik bertahap khas Brat |
| `.toimg` | - | `(reply stiker)` | Mengubah stiker biasa menjadi gambar foto PNG |
| `.togif` | `.tovideo` | `(reply stiker)` | Mengubah stiker bergerak kembali menjadi video MP4 |
| `.tomp3` | `.getaudio`| `(reply video)` | Mengekstrak rekaman suara dari video menjadi MP3 |
| `.tovn` | `.vn` | `(reply audio)` | Mengubah audio menjadi Voice Note (PTT) centang hijau |
| `.rvo` | `.readviewonce`| `(reply view-once)`| Mengunduh media sekali lihat menjadi pesan permanen |
| `.blur` | - | `(reply gambar)` | Memberikan efek buram artistik pada gambar |
| `.charcoal` | - | `(reply gambar)` | Memberikan efek lukisan arang hitam-putih |
| `.paint` | `.sketch` | `(reply gambar)` | Mengubah foto menjadi efek sketsa pensil / lukisan |
| `.emboss` | `.edge` | `(reply gambar)` | Menampilkan garis batas tekstur timbul pada gambar |
| `.invert` | `.sepia` | `(reply gambar)` | Membalikkan warna foto atau memberi rona cokelat klasik |
| `.swirl` | `.implode` | `(reply gambar)` | Memberikan distorsi putaran atau tarikan pusat pada foto |
| `.rotate` | `.flip`, `.flop`| `(reply gambar)` | Memutar sudut foto 90 derajat atau membalik simetris |
| `.grayscale`| `.bw` | `(reply gambar)` | Mengubah foto berwarna menjadi hitam-putih presisi |
| `.magick` | `.im` | `<opsi>` | Menjalankan filter ImageMagick kustom tingkat lanjut |

### 09. Religion & Spirituality
| Perintah | Shortcut | Parameter | Deskripsi |
|---|---|---|---|
| `.quran` | `.qrn` | `<surah:ayat>` | Menampilkan ayat Al-Qur'an, transliterasi, & terjemahan |
| `.sholat` | `.js` | `[nama kota]` | Jadwal lengkap waktu salat 5 waktu di kota Indonesia |
| `.kisahnabi` | `.kn` | `[nama nabi]` | Membaca riwayat kisah teladan 25 Nabi dan Rasul |
| `.alkitab` | `.bible`, `.ktb`| `<kitab pasal:ayat>`| Mengambil kutipan ayat firman dari Alkitab Kristen |
| `.gita` | `.bhagavadgita`| `<bab:sloka>` | Menampilkan bait sloka dan makna suci Bhagavad Gita |
| `.doahindu` | - | `[gayatri/dll]` | Kumpulan doa sehari-hari dan mantram penganut Hindu |
| `.dhammapada`| `.dh` | `[nomor]` | Menampilkan syair kebajikan ajaran suci Dhammapada Buddha |

### 10. Audio DSP Filters
*(Digunakan dengan cara membalas/reply rekaman audio atau Voice Note)*
| Perintah | Shortcut | Efek Filter Audio |
|---|---|---|
| `.bass` | `.bs` | Penguatan frekuensi rendah (deep bass boost) |
| `.earrape` | `.er` | Distorsi volume ekstrem saturasi suara tinggi |
| `.nightcore`| `.nc` | Peningkatan nada vokal & tempo tempo cepat enerjik |
| `.robot` | `.rb` | Modulasi sintesis efek vokal robot mekanis |
| `.reverse` | `.rev` | Memutar balik urutan pemutaran audio dari belakang |
| `.slow` | `.slw` | Memperlambat tempo pemutaran menjadi santai |
| `.fast` | `.fst` | Mempercepat kecepatan tempo pemutaran suara |
| `.deep` | `.dp` | Menurunkan pitch suara menjadi lebih berat dan dalam |
| `.smooth` | `.smt` | Filter audio lembut penghalus noise frekuensi tinggi |
| `.blown` | `.bln` | Efek suara bergetar pecah pada intensitas tinggi |
| `.reverb` | `.rvb` | Simulasi pantulan gema ruangan akustik / hall |
| `.echo` | `.ec` | Efek echo penundaan pengulangan suara vokal |
| `.vaporwave`| `.vw` | Nuansa nostalgia slowed pitch dengan efek akustik |
| `.chipmunk` | `.cm` | Efek vokal kartun tupai dengan pitch nada tinggi |
| `.slowed` | `.slwd` | Efek slowed and reverb yang populer di internet |
| `.lofi` | `.lf` | Filter audio santai lowpass bernuansa retro Lo-Fi |

### 11. Fun, Checkers & Confession
| Perintah | Shortcut | Parameter | Deskripsi |
|---|---|---|---|
| `.menfess` | `.confess`, `.menfes`| `<nomor> \| <pesan>`| Mengirim pesan rahasia anonim dua arah via bot |
| `.define` | - | `<kata>` | Mencari arti kata atau istilah populer di Urban Dictionary |
| `.readmore` | - | `<teks \| rahasia>` | Membuat teks pemicu tombol 'Baca Selengkapnya' WA |
| `.fact` | - | - | Menampilkan fakta-fakta unik dunia yang jarang diketahui |
| `.pick` | - | `<opsi 1 \| opsi 2>` | Meminta bot menentukan pilihan keputusan acak |
| `.pickupline`| `.gombal` | - | Menghasilkan kata-kata gombalan lucu dan romantis |
| `.quotes` | - | - | Kutipan mutiara inspiratif dari para tokoh dunia |
| `.animequote`| `.qanime` | - | Kata-kata mutiara dari karakter anime populer |
| `.couple` | `.soulmate` | - | Menampilkan rekomendasi profil pasangan romantis |
| `.can`, `.is` | `.when`, `.how` | `<pertanyaan>` | Tanya jawab ramalan ala kerang ajaib |
| `.checkme` | - | - | Menilai persentase kepribadian pengguna secara acak |
| `.stupidcheck`| `.handsomecheck`| - | Cek persentase kegantengan atau tingkat kelemotan |
| `.hotcheck` | `.smartcheck` | - | Cek persentase daya tarik atau kecerdasan |
| `.evilcheck`| `.waifucheck` | - | Cek sifat kejahatan atau kecocokan karakter waifu |
| `.cutecheck`| `.prettycheck`| - | Cek skor keimutan atau kecantikan pengguna |
| `.hug`, `.kiss`| `.pat`, `.slap` | `@tag` | Mengirim stiker animasi reaksi aksi fisik ke teman |
| `.bonk`, `.cry`| `.kill`, `.cuddle`| `@tag` | Mengirim stiker reaksi emosi ke anggota chat |

### 12. OSINT Stalker
| Perintah | Shortcut | Parameter | Deskripsi |
|---|---|---|---|
| `.githubstalk`| `.ghstalk` | `<username>` | Menampilkan profil, statistik repositori, & bio GitHub |
| `.mlstalk` | - | `<id user>` | Memeriksa nickname dan data akun Mobile Legends |
| `.robloxstalk`| - | `<username>` | Melihat avatar, bio, dan tanggal pendaftaran Roblox |
| `.discordstalk`| `.dcstalk` | `<id user>` | Menampilkan profil dan avatar pengguna Discord |

### 13. Curated Gallery & TikTok Packs
| Perintah | Kategori | Keterangan Konten |
|---|---|---|
| `.waifu`, `.neko`, `.loli` | Anime Gallery | Foto karakter anime acak berkualitas tinggi |
| `.husbu`, `.shota`, `.animerandom`| Anime Gallery | Koleksi foto ilustrasi anime acak pria & umum |
| `.aesthetic`, `.kpop`, `.cosplay` | Photo Packs | Foto estetik, idol K-Pop, dan cosplayer pilihan |
| `.cat`, `.dog`, `.car`, `.rose` | Photo Packs | Foto kucing lucu, anjing, mobil sport, & bunga mawar |
| `.wallhp`, `.wallml`, `.ppcouple`| Wallpaper | Wallpaper smartphone, MLBB, dan foto profil couple |
| `.ttkr`, `.ttjp`, `.ttid`, `.tthijab`| TikTok Pics | Foto kurasi kreator TikTok Korea, Jepang, Indo, Hijab |
| `.ttcn`, `.ttth`, `.ttvn`, `.ttmy`| TikTok Pics | Foto kreator TikTok China, Thailand, Vietnam, Malaysia |
| `.ttvgirl`, `.ttvukhty`, `.ttvsantuy`| TikTok Vids | Video singkat pilihan dari tren platform TikTok |

### 14. Restricted Gallery (18+)
| Perintah | Shortcut | Parameter | Deskripsi |
|---|---|---|---|
| `.nsfwmilf`, `.nsfwyuri` | - | - | Koleksi foto ilustrasi anime dewasa NSFW kategori spesifik |
| `.nsfwfoot`, `.nsfwblowjob` | - | - | Koleksi gambar anime dewasa pose tertentu |
| `.nsfwpussy`, `.nsfwass` | - | - | Ilustrasi eksplisit berformat gambar kualitas tinggi |
| `.hentai`, `.paizuri` | - | - | Gambar karya seni anime dewasa acak dari Nekobot |
| `.javsearch` | `.jav` | `<ID/Query>` | Pencarian basis data judul, artis, & kode seri JAV |
| `.watchhentai`| `.whentai` | `<query>` | Pencarian anime dewasa di WatchHentai beserta cover poster |
| `.lustpress` | `.lp`, `.r18` | `[provider] <query>` | Unified R18 video aggregator (Eporner, XNXX, PornHub) |
| `.xnxx` | - | `<query>` | Shortcut pencarian video dewasa di database XNXX |
| `.pornhub` | `.ph` | `<query>` | Shortcut pencarian video dewasa di database PornHub |
| `.eporner` | - | `<query>` | Shortcut pencarian video dewasa di database Eporner |
| `.tomoe` | `.doujin` | `[provider] <query/code>` | Unified doujinshi aggregator (nHentai, Pururin, HentaiFox) |
| `.nhentai` | `.nh` | `<kode / query>` | Detail & cover doujin nHentai atau pencarian 5 judul teratas |
| `.nhpdf` | `.tomoepdf` | `<kode>` | Mengunduh seluruh halaman doujin dan mengompilasinya jadi PDF |
| `.pururin` | - | `<kode / query>` | Pencarian dan detail doujinshi dari database Pururin |
| `.hentaifox` | `.hfox` | `<kode / query>` | Pencarian dan detail doujinshi dari database HentaiFox |


### 15. Owner & System Management
| Perintah | Shortcut | Parameter | Deskripsi |
|---|---|---|---|
| `.ping` | - | - | Mengukur kecepatan respon server bot dalam milidetik |
| `.info` | - | - | Menampilkan informasi arsitektur bot dan library |
| `.owner` | `.ownerinfo` | - | Menampilkan kartu kontak developer bot |
| `.runtime` | `.uptime`, `.status`| - | Mengetahui durasi waktu aktif server bot sejak dinyalakan |
| `.serverstats`| `.stats` | - | Statistik pemakaian RAM, model CPU, dan OS server |
| `.setprefix` | - | `<prefix>` | Mengganti simbol awalan perintah (misal `!`, `#`, `.`) |
| `.self` | - | - | Mengubah mode bot menjadi hanya merespon owner (Self-Mode) |
| `.clearsession`| - | - | Membersihkan sampah cache auth tanpa menghapus login |
| `.block` | `.unblock` | `@tag / nomor` | Memblokir atau membuka blokir nomor kontak di WA |
| `.bc` | `.broadcast` | `<pesan>` | Menyiarkan pesan pengumuman ke seluruh kontak pribadi |
| `.signallog` | - | `on / off` | Mengaktifkan tampilan log enkripsi libsignal di terminal |
| `.autoreply` | `.ar` | `on / off` | Mengaktifkan balasan otomatis AI Gemini saat owner offline |
| `.addl` | `.addlist` | `<nomor>` | Menambahkan nomor pengguna ke daftar izin (whitelist) |
| `.dell` | `.dellist` | `<nomor>` | Mencabut nomor pengguna dari whitelist bot |
| `.listu` | `.whitelist` | - | Menampilkan daftar seluruh nomor yang diizinkan |
| `.cmdstats` | `.commandstats`| - | Menampilkan statistik jumlah eksekusi masing-masing perintah |
| `.restart` | `.reboot` | - | Memulai ulang proses bot otomatis tanpa memutus sesi WA |
| `.shutdown` | `.stop`, `.matikan`| - | Menutup koneksi socket dan mematikan server bot |

<p align="right">(<a href="#readme-top">kembali ke atas</a>)</p>

<!-- RENCANA PENGEMBANGAN -->
## Rencana Pengembangan

- [x] Multi-platform media streaming (Spotify, SoundCloud, YouTube)
- [x] Pengenalan audio instan via Shazam API
- [x] Generator stiker Brat tema resmi (Putih, Ijo, Hitam, Video animasi)
- [x] Sistem pesan anonim Menfess timbal balik (dua arah)
- [x] Bypass DNS untuk pengikis konten anime & gambar
- [x] Perintah restart & shutdown proses jarak jauh
- [ ] Dashboard pemantauan status bot berbasis web
- [ ] Dukungan multi-sesi perangkat bersamaan

<p align="right">(<a href="#readme-top">kembali ke atas</a>)</p>

<!-- KONTRIBUSI -->
## Kontribusi

Kontribusi dari komunitas sangat diapresiasi untuk terus mengembangkan proyek ini.

Jika Anda memiliki ide perbaikan atau fitur baru:
1. Lakukan **Fork** pada repositori ini.
2. Buat Feature Branch baru (`git checkout -b fitur/FiturKeren`).
3. Lakukan Commit perubahan (`git commit -m 'Menambahkan Fitur Keren'`).
4. Push ke Branch Anda (`git push origin fitur/FiturKeren`).
5. Buat **Pull Request**.

<p align="right">(<a href="#readme-top">kembali ke atas</a>)</p>

<!-- LISENSI -->
## Lisensi

Proyek ini dilisensikan di bawah Lisensi MIT. Lihat file `LICENSE` untuk informasi lebih lanjut.

<p align="right">(<a href="#readme-top">kembali ke atas</a>)</p>

<!-- KONTAK -->
## Kontak

**Putu Pasek Jade Aurestha** - [GitHub: @KenKalahOprec](https://github.com/KenKalahOprec)

Tautan Proyek: [https://github.com/KenKalahOprec/Restha-Bot](https://github.com/KenKalahOprec/Restha-Bot)

<p align="right">(<a href="#readme-top">kembali ke atas</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
[contributors-shield]: https://img.shields.io/github/contributors/KenKalahOprec/Restha-Bot.svg?style=for-the-badge
[contributors-url]: https://github.com/KenKalahOprec/Restha-Bot/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/KenKalahOprec/Restha-Bot.svg?style=for-the-badge
[forks-url]: https://github.com/KenKalahOprec/Restha-Bot/network/members
[stars-shield]: https://img.shields.io/github/stars/KenKalahOprec/Restha-Bot.svg?style=for-the-badge
[stars-url]: https://github.com/KenKalahOprec/Restha-Bot/stargazers
[issues-shield]: https://img.shields.io/github/issues/KenKalahOprec/Restha-Bot.svg?style=for-the-badge
[issues-url]: https://github.com/KenKalahOprec/Restha-Bot/issues
[license-shield]: https://img.shields.io/github/license/KenKalahOprec/Restha-Bot.svg?style=for-the-badge
[license-url]: https://github.com/KenKalahOprec/Restha-Bot/blob/master/LICENSE
[Node.js]: https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white
[NodeJS-url]: https://nodejs.org/
[JavaScript.com]: https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black
[JavaScript-url]: https://developer.mozilla.org/en-US/docs/Web/JavaScript
[FFmpeg.org]: https://img.shields.io/badge/FFmpeg-007808?style=for-the-badge&logo=ffmpeg&logoColor=white
[FFmpeg-url]: https://ffmpeg.org/
