export function formatNumber(num) {
  if (!num || isNaN(num)) return '-';
  const n = Number(num);
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.', ',') + 'jt';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace('.', ',') + 'k';
  return n.toLocaleString('id-ID');
}

export function formatDuration(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const s = Math.floor(Number(sec));
  const m = Math.floor(s / 60);
  const remaining = s % 60;
  return `${m}:${remaining < 10 ? '0' : ''}${remaining}`;
}

