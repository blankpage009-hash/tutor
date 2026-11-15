// tokens.json → 디자인 시스템용 tokens.css (format.md의 compiled 배치: 요소 단위 data-theme)
const fs = require('fs');
const [, , src, out] = process.argv;
const t = JSON.parse(fs.readFileSync(src, 'utf8'));
const cv = (v, th) => {
  const c = typeof v === 'string' ? v : (v[th] ?? v.light);
  return c.startsWith('{') ? `var(--${c.slice(1, -1)})` : c;
};
const block = (th) => t.color.tokens.map((k) => `  --${k.name}: ${cv(k.value, th)};`).join('\n');
const list = (f) => t[f].tokens.map((k) => `  --${k.name}: ${k.value};`).join('\n');
const fam = Object.entries(t.type.families).map(([k, v]) => `  --font-${k}: ${v};`).join('\n');
const cls = t.type.groups.flatMap((g) => g.styles.map((s) => `.${s.name} {\n  font-family: var(--font-${s.family ?? g.family});\n  font-size: ${s.fontSize};\n  line-height: ${s.lineHeight};\n  font-weight: ${s.fontWeight};${s.letterSpacing ? `\n  letter-spacing: ${s.letterSpacing};` : ''}\n}`)).join('\n');
const css = `/* Tutor — generated from tokens.json */
:root, [data-theme="light"] {
${block('light')}
}
[data-theme="dark"] {
${block('dark')}
}
:root {
${list('spacing')}
${list('radius')}
${list('size')}
${fam}
}
${cls}
`;
fs.writeFileSync(out, css);
console.log('ok', css.length);
