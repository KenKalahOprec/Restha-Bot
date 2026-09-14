/**
 * ANSI Color Terminal Utility (Zero external dependencies)
 */
export const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  blink: '\x1b[5m',

  // Foreground
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Bright Foreground
  brightBlack: '\x1b[90m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',

  // Background
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
  bgDarkGray: '\x1b[100m'
};

function timestamp() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}.${String(d.getMilliseconds()).padStart(3, '0')}`;
}

export function logBanner() {
  console.log(`
${c.bold}${c.brightMagenta} ██▀███  ▓█████   ██████ ▄▄▄█████▓ ██░ ██  ▄▄▄      ${c.reset}
${c.bold}${c.brightCyan}▓██ ▒ ██▒▓█   ▀ ▒██    ▒ ▓  ██▒ ▓▒▓██░ ██▒▒████▄    ${c.reset}
${c.bold}${c.brightBlue}▓██ ░▄█ ▒▒███   ░ ▓██▄   ▒ ▓██░ ▒░▒██▀▀██░▒██  ▀█▄  ${c.reset}
${c.bold}${c.brightGreen}▒██▀▀█▄  ▒▓█  ▄   ▒   ██▒░ ▓██▓ ░ ░▓█ ░██ ░██▄▄▄▄██ ${c.reset}
${c.bold}${c.brightYellow}░██▓ ▒██▒░▒████▒▒██████▒▒  ▒██▒ ░ ░▓█▒░██▓ ▓█   ▓██▒${c.reset}
${c.bold}${c.brightBlack}─────────────────────────────────────────────────────${c.reset}
${c.bgMagenta}${c.bold}${c.brightWhite}  RESTHA AUTONOMOUS CYBER-DECK  ${c.reset} ${c.brightCyan}v2.5 // LIVE RECON${c.reset}
`);
}

export function logConnection(status, details = '') {
  const time = `${c.dim}[${timestamp()}]${c.reset}`;
  if (status === 'open') {
    console.log(`${time} ${c.bgGreen}${c.bold}${c.black} READY ${c.reset} ${c.brightGreen}${c.bold}WhatsApp Socket Activated! Session Online.${c.reset}`);
  } else if (status === 'close') {
    console.log(`${time} ${c.bgRed}${c.bold}${c.white} WARN ${c.reset} ${c.brightYellow}Socket dropped (${details}). Attempting fast reconnect...${c.reset}`);
  } else if (status === 'reload') {
    console.log(`${time} ${c.bgBlue}${c.bold}${c.white} RELOAD ${c.reset} ${c.brightCyan}Hot-reloaded src module (${details}). Zero downtime.${c.reset}`);
  } else {
    console.log(`${time} ${c.bgCyan}${c.bold}${c.black} INFO ${c.reset} ${details}`);
  }
}

export function logCommand(prefix, cmd, user, target) {
  const time = `${c.dim}[${timestamp()}]${c.reset}`;
  const badge = `${c.bgMagenta}${c.bold}${c.brightWhite} STRIKE ${c.reset}`;
  const cmdStr = `${c.bold}${c.brightYellow}${prefix}${cmd}${c.reset}`;
  const userStr = `${c.brightCyan}@${user}${c.reset}`;
  const targetStr = target ? `${c.dim}--> ${c.white}${target}${c.reset}` : '';
  console.log(`${time} ${badge} ${cmdStr} ${c.dim}by${c.reset} ${userStr} ${targetStr}`);
}

export function logEval(type, user, snippet) {
  const time = `${c.dim}[${timestamp()}]${c.reset}`;
  const badge = type === 'eval'
    ? `${c.bgYellow}${c.bold}${c.black} EVAL-JS ${c.reset}`
    : `${c.bgRed}${c.bold}${c.white} EXEC-SH ${c.reset}`;
  const userStr = `${c.brightCyan}@${user}${c.reset}`;
  const codeStr = `${c.brightWhite}${snippet.slice(0, 50)}${snippet.length > 50 ? '...' : ''}${c.reset}`;
  console.log(`${time} ${badge} ${c.dim}by${c.reset} ${userStr} | ${codeStr}`);
}

export function logError(source, err) {
  const time = `${c.dim}[${timestamp()}]${c.reset}`;
  const badge = `${c.bgRed}${c.bold}${c.brightWhite} CRITICAL ${c.reset}`;
  console.error(`${time} ${badge} ${c.brightRed}${source}:${c.reset} ${err?.message || err}`);
}

export function logIncoming(sender, text, isAllowed) {
  const time = `${c.dim}[${timestamp()}]${c.reset}`;
  const badge = isAllowed
    ? `${c.bgGreen}${c.bold}${c.black} ACCESS-OK ${c.reset}`
    : `${c.bgYellow}${c.bold}${c.black} ACCESS-DENY ${c.reset}`;
  const senderStr = `${c.brightCyan}+${sender}${c.reset}`;
  const textStr = `${c.brightWhite}"${text.slice(0, 45)}${text.length > 45 ? '...' : ''}"${c.reset}`;
  console.log(`${time} ${badge} ${senderStr} -> ${textStr}`);
}


