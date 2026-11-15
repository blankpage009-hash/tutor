// 토큰 조합별 명도 대비(WCAG 2) 계산
const fs = require('fs');
const t = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const map = {};
for (const tok of t.color.tokens) map[tok.name] = tok.value;
const val = (n, th) => {
  let v = map[n];
  if (typeof v === 'string') v = { light: v, dark: v };
  let c = v[th] ?? v.light;
  if (c.startsWith('{')) return val(c.slice(1, -1), th);
  return c;
};
const lum = (hex) => {
  const n = hex.replace('#', '');
  const rgb = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
};
const cr = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
// [전경, 배경, 최소 기준]
const pairs = [
  ['ink', 'paper', 4.5], ['ink', 'surface', 4.5], ['ink', 'surface-sunk', 4.5], ['ink', 'accent-tint', 4.5],
  ['ink-muted', 'paper', 4.5], ['ink-muted', 'surface', 4.5], ['ink-muted', 'surface-sunk', 4.5],
  ['accent-ink', 'paper', 4.5], ['accent-ink', 'surface', 4.5], ['accent-ink', 'accent-tint', 4.5],
  ['on-accent', 'accent', 4.5], ['on-accent', 'accent-press', 4.5],
  ['danger', 'surface', 4.5], ['danger', 'danger-tint', 4.5], ['danger', 'paper', 4.5],
  ['line-strong', 'surface', 3], ['line-strong', 'paper', 3],
  ['accent', 'surface', 3], ['accent', 'paper', 3], ['accent', 'surface-sunk', 3],
  ['focus', 'surface', 3], ['focus', 'paper', 3], ['focus', 'accent-tint', 3],
];
let fail = 0;
for (const th of ['light', 'dark']) {
  for (const [f, b, min] of pairs) {
    const r = cr(val(f, th), val(b, th));
    const ok = r >= min;
    if (!ok) fail++;
    console.log(`${ok ? 'OK ' : 'FAIL'} ${th.padEnd(5)} ${f} on ${b}: ${r.toFixed(2)} (min ${min})`);
  }
}
console.log(fail ? `\n${fail} FAIL` : '\nALL PASS');
