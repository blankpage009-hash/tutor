// tokens.json → 앱용 tokens.css (라이트 / 다크 / 시스템 3가지 테마 설정 지원)
const fs = require('fs');
const [, , src, out] = process.argv;
const t = JSON.parse(fs.readFileSync(src, 'utf8'));

const colorVal = (v, th) => {
  const c = typeof v === 'string' ? v : (v[th] ?? v.light);
  return c.startsWith('{') ? `var(--${c.slice(1, -1)})` : c;
};
const colors = (th) => t.color.tokens.map((k) => `  --${k.name}: ${colorVal(k.value, th)};`).join('\n');
const fam = Object.entries(t.type.families).map(([k, v]) => `  --font-${k}: ${v};`).join('\n');
const list = (f) => t[f].tokens.map((k) => `  --${k.name}: ${k.value};`).join('\n');
const typeVars = t.type.groups.flatMap((g) => g.styles.map((s) => {
  const p = `--type-${s.name}`;
  const lines = [`  ${p}-family: var(--font-${s.family ?? g.family});`, `  ${p}-size: ${s.fontSize};`, `  ${p}-line: ${s.lineHeight};`, `  ${p}-weight: ${s.fontWeight};`];
  lines.push(`  ${p}-tracking: ${s.letterSpacing ?? '0'};`);
  return lines.join('\n');
})).join('\n');
const typeClasses = t.type.groups.flatMap((g) => g.styles.map((s) => {
  const p = `--type-${s.name}`;
  const upper = s.name === 'label' ? '\n  text-transform: uppercase;' : '';
  return `.type-${s.name} {\n  font-family: var(${p}-family);\n  font-size: var(${p}-size);\n  line-height: var(${p}-line);\n  font-weight: var(${p}-weight);\n  letter-spacing: var(${p}-tracking);${upper}\n}`;
})).join('\n');

const css = `/* Tutor 디자인 토큰 — 디자인 시스템(claude.ai)의 tokens.json에서 생성. 직접 고치지 말고 tokens.json을 고친 뒤 다시 생성한다. */
/* 생성: ${new Date().toISOString().slice(0, 10)} */

/* 라이트 테마가 기본값. 설정의 "시스템"은 data-theme 없음, "라이트"/"다크"는 <html data-theme="...">로 고정한다. */
:root {
  color-scheme: light;
${colors('light')}
}

/* "시스템" 설정일 때 기기가 다크 모드면 다크 값으로 바뀐다. 사용자가 "라이트"를 고르면(data-theme="light") 적용 안 됨. */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
${colors('dark').replace(/^/gm, '  ')}
  }
}

/* 사용자가 설정에서 "다크"를 고른 경우 */
:root[data-theme="dark"] {
  color-scheme: dark;
${colors('dark')}
}

/* 글꼴 · 간격 · 모서리 · 크기 (테마와 무관) */
:root {
${fam}
${list('spacing')}
${list('radius')}
${list('size')}
}

/* 글자 스타일: 변수 + 클래스. CSS Modules에서는 composes 대신 변수를 직접 쓴다. */
:root {
${typeVars}
}

${typeClasses}

/* 주의: CSS 변수는 미디어 쿼리 조건 안에서 쓸 수 없다. iPad 2컬럼은 @media (min-width: 768px)처럼 숫자를 직접 적는다 (--bp-ipad와 같은 값). */
`;
fs.writeFileSync(out, css);
console.log('wrote', out, css.length, 'bytes');
