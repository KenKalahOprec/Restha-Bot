import config from '../../config.js';
import { createC4Board, renderC4Board } from '../libs/games.js';
import { tokohList, ibukotaList } from '../libs/constants.js';

export const mathGames = new Map();
export const tttGames = new Map();
export const susunGames = new Map();
export const c4Games = new Map();
export const guessNumberGames = new Map();
export const wordChainGames = new Map();
export const charGuessGames = new Map();
export const capitalGuessGames = new Map();

export async function handleC4(sock, m, { jid, userName }) {
  const board = createC4Board();
  c4Games.set(jid, { board, player: userName });
  const boardStr = renderC4Board(board);
  await sock.sendMessage(jid, { text: `${boardStr}\n\n🎮 *CONNECT FOUR GAME*\nKamu: 🔴 | Bot: 🟡\nKetik angka *1 - 7* untuk menjatuhkan koin ke kolom pilihanmu!` }, { quoted: m });
}

export async function handleTTT(sock, m, { jid, q, userName }) {
  if (q === 'reset' || !tttGames.has(jid)) {
    tttGames.set(jid, ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    if (q === 'reset') return sock.sendMessage(jid, { text: '🔄 Papan Tic-Tac-Toe telah di-reset.' }, { quoted: m });
  }

  const board = tttGames.get(jid);
  const pos = parseInt(q) - 1;

  if (!isNaN(pos) && pos >= 0 && pos <= 8 && board[pos] !== '❌' && board[pos] !== '⭕') {
    board[pos] = '❌';
    const emptySpots = board.map((v, i) => (v !== '❌' && v !== '⭕' ? i : null)).filter(v => v !== null);
    if (emptySpots.length > 0) {
      const botPos = emptySpots[Math.floor(Math.random() * emptySpots.length)];
      board[botPos] = '⭕';
    }
  }

  const boardDisplay = `🎮 *TIC-TAC-TOE*\n❌: ${userName} | ⭕: Bot\n\n` +
    ` ${board[0]} | ${board[1]} | ${board[2]} \n` +
    `---+---+---\n` +
    ` ${board[3]} | ${board[4]} | ${board[5]} \n` +
    `---+---+---\n` +
    ` ${board[6]} | ${board[7]} | ${board[8]} \n\n` +
    `_Ketik ${config.prefix}ttt [1-9] untuk langkah berikutnya, atau ${config.prefix}ttt reset_`;

  await sock.sendMessage(jid, { text: boardDisplay }, { quoted: m });
}

export async function handleTebakAngka(sock, m, { jid }) {
  const target = Math.floor(Math.random() * 100) + 1;
  guessNumberGames.set(jid, { target, attempts: 0 });
  await sock.sendMessage(jid, { text: `🎯 *NUMBER GUESSING GAME*\n\nBot telah memilih angka rahasia antara *1 sampai 100*.\nKetik angka tebakanmu sekarang!` }, { quoted: m });
}

export async function handleSambungKata(sock, m, { jid }) {
  const starterWords = ['pantai', 'gunung', 'matahari', 'bintang', 'samudra', 'pelangi'];
  const starter = starterWords[Math.floor(Math.random() * starterWords.length)];
  const lastLetter = starter[starter.length - 1];
  wordChainGames.set(jid, { lastWord: starter, lastLetter, chainCount: 0 });
  await sock.sendMessage(jid, { text: `🔤 *WORD CHAIN GAME (SAMBUNG KATA)*\n\nKata pembuka: *${starter.toUpperCase()}*\n➡️ Huruf awalanmu: *${lastLetter.toUpperCase()}*\nKetik kata bahasa Indonesia yang berawalan huruf tersebut!` }, { quoted: m });
}

export async function handleTebakKartu(sock, m, { jid, q, cmd }) {
  const pick = parseInt(q.trim());
  if (![1, 2, 3].includes(pick)) {
    return sock.sendMessage(jid, { text: `🃏 *HIDDEN CARD GAME*\n\nTerdapat 3 kartu tertutup:\n[ 🎴 1 ]  [ 🎴 2 ]  [ 🎴 3 ]\n\nSalah satunya adalah Raja 👑, sisanya Joker 🃏.\nKetik *${config.prefix}${cmd} 1*, *2*, atau *3* untuk memilih!` }, { quoted: m });
  }
  const winning = Math.floor(Math.random() * 3) + 1;
  const cards = [1, 2, 3].map(i => i === winning ? '👑 KING' : '🃏 JOKER');
  const isWin = pick === winning;
  const revealStr = `🃏 [ 1: ${cards[0]} ] [ 2: ${cards[1]} ] [ 3: ${cards[2]} ]`;
  const resText = isWin
    ? `🎉 *SELAMAT, KAMU MENANG!*\n\n${revealStr}\nPilihanmu (Nomor ${pick}) tepat adalah *KING 👑*!`
    : `❌ *YAH, KAMU KALAH!*\n\n${revealStr}\nPilihanmu (Nomor ${pick}) adalah JOKER. Raja ada di nomor ${winning}!`;
  await sock.sendMessage(jid, { text: resText }, { quoted: m });
}

export async function handleDadu(sock, m, { jid }) {
  const diceFaces = ['⚀ (1)', '⚁ (2)', '⚂ (3)', '⚃ (4)', '⚄ (5)', '⚅ (6)'];
  const pRoll = Math.floor(Math.random() * 6);
  const bRoll = Math.floor(Math.random() * 6);
  const pScore = pRoll + 1;
  const bScore = bRoll + 1;

  let resultText = `🎲 *ROLLING DICE BATTLE*\n\n`;
  resultText += `👤 *Kamu* : ${diceFaces[pRoll]}\n`;
  resultText += `🤖 *Bot*  : ${diceFaces[bRoll]}\n\n`;
  if (pScore > bScore) {
    resultText += `🎉 *KAMU MENANG!* Skor ${pScore} vs ${bScore}`;
  } else if (pScore < bScore) {
    resultText += `❌ *BOT MENANG!* Skor ${bScore} vs ${pScore}`;
  } else {
    resultText += `🤝 *SERI!* Keduanya mendapat skor ${pScore}`;
  }
  await sock.sendMessage(jid, { text: resultText }, { quoted: m });
}

export async function handleTebakTokoh(sock, m, { jid }) {
  const char = tokohList[Math.floor(Math.random() * tokohList.length)];
  charGuessGames.set(jid, { name: char.name, clue: char.clue });
  await sock.sendMessage(jid, { text: `👤 *CHARACTER GUESSING GAME*\n\nPetunjuk: "${char.clue}"\n\nSiapakah tokoh ini? Ketik nama tokoh untuk menjawab!` }, { quoted: m });
}

export async function handleTebakIbukota(sock, m, { jid }) {
  const item = ibukotaList[Math.floor(Math.random() * ibukotaList.length)];
  capitalGuessGames.set(jid, { question: item.question, answer: item.answer });
  await sock.sendMessage(jid, { text: `🏛️ *CAPITAL CITY FINDING GAME*\n\nApa ibukota dari: *${item.question}*?\nKetik nama ibukota untuk menjawab!` }, { quoted: m });
}

export async function handleBlackjack(sock, m, { jid, userName }) {
  const userCard1 = Math.floor(Math.random() * 10) + 1;
  const userCard2 = Math.floor(Math.random() * 10) + 1;
  const botCard1 = Math.floor(Math.random() * 10) + 1;
  const botCard2 = Math.floor(Math.random() * 10) + 1;
  const userTotal = userCard1 + userCard2;
  const botTotal = botCard1 + botCard2;

  let text = `🃏 *BLACKJACK (21)*\n\n`;
  text += `👤 *${userName}*: [${userCard1}, ${userCard2}] = *${userTotal}*\n`;
  text += `🤖 *Dealer*: [${botCard1}, ${botCard2}] = *${botTotal}*\n\n`;
  if (userTotal > 21) {
    text += '💥 Kamu BUST! Dealer menang.';
  } else if (botTotal > 21 || userTotal > botTotal) {
    text += '🎉 Selamat, kamu MENANG!';
  } else if (userTotal < botTotal) {
    text += '❌ Dealer MENANG!';
  } else {
    text += '🤝 Hasil SERI!';
  }
  await sock.sendMessage(jid, { text }, { quoted: m });
}

export async function handleSlot(sock, m, { jid }) {
  const icons = ['🍒', '🍋', '🍇', '🍉', '⭐', '💎', '7️⃣'];
  const s1 = icons[Math.floor(Math.random() * icons.length)];
  const s2 = icons[Math.floor(Math.random() * icons.length)];
  const s3 = icons[Math.floor(Math.random() * icons.length)];

  let text = `🎰 *SLOT MACHINE*\n\n`;
  text += `┌─────────┐\n`;
  text += `│ ${s1} | ${s2} | ${s3} │\n`;
  text += `└─────────┘\n\n`;
  if (s1 === s2 && s2 === s3) {
    text += '🎉 JACKPOT! Tiga simbol sama!';
  } else if (s1 === s2 || s2 === s3 || s1 === s3) {
    text += '✨ Lumayan! Dua simbol cocok.';
  } else {
    text += '❌ Belum beruntung, coba putar lagi!';
  }
  await sock.sendMessage(jid, { text }, { quoted: m });
}

export async function handleCoinflip(sock, m, { jid, q, cmd }) {
  const choice = q.toLowerCase();
  if (!['gambar', 'angka', 'g', 'a'].includes(choice)) {
    return sock.sendMessage(jid, { text: `Format: *${config.prefix}${cmd} <gambar/angka>*` }, { quoted: m });
  }
  const result = Math.random() > 0.5 ? 'gambar' : 'angka';
  const userChoice = choice.startsWith('g') ? 'gambar' : 'angka';
  const win = userChoice === result;
  let text = `🪙 *COIN FLIP*\n\n`;
  text += `Koin mendarat di: *${result.toUpperCase()}*\n`;
  text += `Pilihanmu: *${userChoice.toUpperCase()}*\n\n`;
  text += win ? '🎉 Tebakanmu BENAR!' : '❌ Tebakanmu SALAH!';
  await sock.sendMessage(jid, { text }, { quoted: m });
}

export async function handleSuit(sock, m, { jid, q }) {
  const pChoice = q.toLowerCase();
  if (!['batu', 'gunting', 'kertas'].includes(pChoice)) {
    return sock.sendMessage(jid, { text: `Format: ${config.prefix}suitpvp <batu/gunting/kertas>` }, { quoted: m });
  }
  const botChoices = ['batu', 'gunting', 'kertas'];
  const bChoice = botChoices[Math.floor(Math.random() * 3)];
  let res = '🤝 Seri!';
  if (
    (pChoice === 'batu' && bChoice === 'gunting') ||
    (pChoice === 'gunting' && bChoice === 'kertas') ||
    (pChoice === 'kertas' && bChoice === 'batu')
  ) {
    res = '🎉 Kamu Menang!';
  } else if (pChoice !== bChoice) {
    res = '❌ Kamu Kalah!';
  }
  await sock.sendMessage(jid, { text: `✊✌️🖐️ *SUIT GAME*\n\nKamu: ${pChoice}\nBot: ${bChoice}\n\nHasil: *${res}*` }, { quoted: m });
}

export async function handleMath(sock, m, { jid }) {
  const num1 = Math.floor(Math.random() * 50) + 1;
  const num2 = Math.floor(Math.random() * 50) + 1;
  const ops = ['+', '-', '*'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let ans = 0;
  if (op === '+') ans = num1 + num2;
  if (op === '-') ans = num1 - num2;
  if (op === '*') ans = num1 * num2;
  mathGames.set(jid, { answer: ans });
  await sock.sendMessage(jid, { text: `🧮 *KUIS MATEMATIKA*\n\nBerapa hasil dari:\n*${num1} ${op} ${num2}* = ?\n\n_Ketik angka jawaban langsung di chat!_` }, { quoted: m });
}

export async function handleSusunKata(sock, m, { jid }) {
  const words = ['KOMPUTER', 'INTERNET', 'PEMROGRAMAN', 'WHATSAPP', 'KEYBOARD', 'MONITOR', 'DATABASE', 'ALGORITMA', 'JAVASCRIPT', 'INDONESIA'];
  const word = words[Math.floor(Math.random() * words.length)];
  const scrambled = word.split('').sort(() => Math.random() - 0.5).join('');
  susunGames.set(jid, { word });
  await sock.sendMessage(jid, { text: `🔤 *SUSUN KATA*\n\nSusunlah huruf acak berikut:\n*${scrambled}*\n\n_Ketik kata jawaban langsung di chat!_` }, { quoted: m });
}

export async function handleTrivia(sock, m, { jid }) {
  const trivias = [
    { q: 'Hewan apa yang bisa tidur sampai 3 tahun berturut-turut?', a: 'Siput' },
    { q: 'Benua terbesar di dunia adalah?', a: 'Asia' },
    { q: 'Simbol kimia untuk emas adalah?', a: 'Au' },
    { q: 'Gunung tertinggi di tata surya berada di planet?', a: 'Mars (Olympus Mons)' }
  ];
  const item = trivias[Math.floor(Math.random() * trivias.length)];
  await sock.sendMessage(jid, { text: `❓ *TRIVIA*\n\nPertanyaan: ${item.q}\n\nJawaban: *${item.a}*` }, { quoted: m });
}

export async function handleHint(sock, m, { jid }) {
  if (charGuessGames.has(jid)) {
    const g = charGuessGames.get(jid);
    return sock.sendMessage(jid, { text: `💡 *HINT TOKOH*: Huruf awal "${g.name[0]}" dan huruf akhir "${g.name[g.name.length - 1]}".` }, { quoted: m });
  }
  if (capitalGuessGames.has(jid)) {
    const g = capitalGuessGames.get(jid);
    return sock.sendMessage(jid, { text: `💡 *HINT IBUKOTA*: Huruf awal "${g.answer[0]}" dan panjang ${g.answer.length} huruf.` }, { quoted: m });
  }
  if (susunGames.has(jid)) {
    const g = susunGames.get(jid);
    return sock.sendMessage(jid, { text: `💡 *HINT KATA*: Huruf awal "${g.word[0]}" dan huruf akhir "${g.word[g.word.length - 1]}".` }, { quoted: m });
  }
  await sock.sendMessage(jid, { text: 'Tidak ada permainan aktif yang memerlukan petunjuk saat ini.' }, { quoted: m });
}

