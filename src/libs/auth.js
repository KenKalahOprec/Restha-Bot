import fs from 'fs';
import path from 'path';
import config from '../../config.js';

const DATA_DIR = path.resolve('./data');
const AUTH_FILE = path.join(DATA_DIR, 'allowedUsers.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(AUTH_FILE)) {
    const initial = Array.isArray(config.allowedUsers) && config.allowedUsers.length
      ? config.allowedUsers.map(String)
      : ['6281237373800'];
    fs.writeFileSync(AUTH_FILE, JSON.stringify(initial, null, 2), 'utf8');
  }
}

export function getAllowedUsers() {
  try {
    ensureDataFile();
    const raw = fs.readFileSync(AUTH_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      config.allowedUsers = parsed;
      return parsed;
    }
  } catch {}
  return Array.isArray(config.allowedUsers) ? config.allowedUsers : [];
}

export function normalizePhone(val) {
  if (!val) return '';
  const digits = String(val).split('@')[0].split(':')[0].replace(/\D/g, '');
  if (digits.startsWith('0')) return '62' + digits.slice(1);
  return digits;
}

export function addAllowedUser(idOrNumber) {
  ensureDataFile();
  const list = getAllowedUsers();
  const clean = normalizePhone(idOrNumber) || String(idOrNumber).trim();
  if (!clean) return false;

  if (!list.includes(clean)) {
    list.push(clean);
    fs.writeFileSync(AUTH_FILE, JSON.stringify(list, null, 2), 'utf8');
    config.allowedUsers = list;
    return true;
  }
  return false;
}

export function removeAllowedUser(idOrNumber) {
  ensureDataFile();
  const list = getAllowedUsers();
  const clean = normalizePhone(idOrNumber) || String(idOrNumber).trim();
  const idx = list.indexOf(clean);
  if (idx !== -1) {
    list.splice(idx, 1);
    fs.writeFileSync(AUTH_FILE, JSON.stringify(list, null, 2), 'utf8');
    config.allowedUsers = list;
    return true;
  }
  return false;
}

export function isUserAllowed(candidateList = []) {
  const allowed = getAllowedUsers();
  if (!allowed.length) return false;

  for (const candidate of candidateList) {
    if (!candidate) continue;
    const rawStr = String(candidate);
    const clean = rawStr.split('@')[0].split(':')[0].replace(/\D/g, '');
    const norm = normalizePhone(clean);

    for (const target of allowed) {
      const targetClean = String(target).replace(/\D/g, '');
      const targetNorm = normalizePhone(targetClean);

      const cleanTail = clean.length >= 9 ? clean.slice(-9) : null;
      const targetTail = targetClean.length >= 9 ? targetClean.slice(-9) : null;

      if (
        (clean && clean === targetClean) ||
        (norm && norm === targetNorm) ||
        (cleanTail && targetTail && cleanTail === targetTail) ||
        rawStr.includes(targetClean) ||
        rawStr.includes(target)
      ) {
        return true;
      }
    }
  }
  return false;
}

