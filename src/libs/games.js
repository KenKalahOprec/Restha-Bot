export function createC4Board() {
  return Array(6).fill(null).map(() => Array(7).fill('⚪'));
}

export function renderC4Board(board) {
  let str = '┌── [ CONNECT FOUR ]\n';
  for (let r = 0; r < 6; r++) {
    str += '│ ' + board[r].join(' ') + '\n';
  }
  str += '│ 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣\n└──';
  return str;
}

export function dropC4(board, col, piece) {
  for (let r = 5; r >= 0; r--) {
    if (board[r][col] === '⚪') {
      board[r][col] = piece;
      return r;
    }
  }
  return -1;
}

export function checkC4Win(board, piece) {
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === piece && board[r][c+1] === piece && board[r][c+2] === piece && board[r][c+3] === piece) return true;
    }
  }
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 7; c++) {
      if (board[r][c] === piece && board[r+1][c] === piece && board[r+2][c] === piece && board[r+3][c] === piece) return true;
    }
  }
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === piece && board[r+1][c+1] === piece && board[r+2][c+2] === piece && board[r+3][c+3] === piece) return true;
    }
  }
  for (let r = 3; r < 6; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === piece && board[r-1][c+1] === piece && board[r-2][c+2] === piece && board[r-3][c+3] === piece) return true;
    }
  }
  return false;
}

