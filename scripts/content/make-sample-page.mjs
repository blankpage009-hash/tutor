// 실행: node scripts/content/make-sample-page.mjs [코스id ...]
// 샘플 20문장으로 아이폰 확인 페이지(docs/phase2/)를 만든다.
// 코스id를 안 주면 처음 승인받은 초급 샘플(PICK)을 그대로 만든다.
// 코스id를 여러 개 주면 20문장을 코스마다 나눠, 각 코스 안에서 고르게 띄엄띄엄 뽑는다.
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'docs/phase2');
const TOTAL = 20;
const PICK = ['01-s1', '01-s2', '02-s3', '03-s1', '03-s3', '04-s2', '05-s3', '06-s2', '07-s2', '08-s2',
  '09-s2', '10-s1', '11-s3', '12-s2', '13-s1', '14-s1', '15-s1', '17-s2', '19-s1', '20-s3'];

function loadSentences(id) {
  const course = JSON.parse(readFileSync(join(ROOT, `content/courses/${id}.json`), 'utf8'));
  return course.lessons.flatMap((l) => l.sentences.map((s) => ({ ...s, lesson: `${course.titleKo} · ${l.titleKo}` })));
}

// 코스마다 앞쪽 수업만 뽑히지 않도록 간격을 두고 가운데 지점을 고른다.
// shift: 코스마다 한 칸씩 밀어서 모든 코스가 같은 순번(s1)만 뽑히지 않게 한다
function spread(list, n, shift) {
  const step = list.length / n;
  return Array.from({ length: n }, (_, i) => list[(Math.floor(i * step + step / 2) + shift) % list.length]);
}

function pickSentences(ids) {
  if (ids.length === 0) {
    const all = loadSentences('beginner');
    return PICK.map((p) => all.find((s) => s.id === `beg-${p}`));
  }
  return ids.flatMap((id, i) => {
    const n = Math.floor(TOTAL / ids.length) + (i < TOTAL % ids.length ? 1 : 0);
    return spread(loadSentences(id), n, i % 3);
  });
}

const courseIds = process.argv.slice(2);
const picked = pickSentences(courseIds);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'audio'), { recursive: true });
const items = picked.map((s, i) => {
  const file = `audio/${basename(s.audio)}`;
  copyFileSync(join(ROOT, 'content', s.audio), join(OUT, file));
  return { n: i + 1, id: s.id, lesson: s.lesson, en: s.en, ko: s.ko, note: s.note, audio: file };
});
copyFileSync(join(ROOT, 'docs/phase0/icon.png'), join(OUT, 'icon.png'));
writeFileSync(join(OUT, 'manifest.webmanifest'), JSON.stringify({
  name: 'Tutor 샘플', short_name: 'Tutor 샘플', start_url: './index.html', scope: './',
  display: 'standalone', background_color: '#ffffff', theme_color: '#ffffff',
  icons: [{ src: 'icon.png', sizes: '180x180', type: 'image/png' }],
}, null, 2));

const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const scope = courseIds.length === 0 ? '초급 코스' : `${[...new Set(picked.map((s) => s.lesson.split(' · ')[0]))].join(', ')} 코스`;
const cards = items.map((it) => `
  <article>
    <div class="meta">${it.n}. ${esc(it.lesson)} · ${it.id}</div>
    <p class="en">${esc(it.en)}</p>
    <p class="ko">${esc(it.ko)}</p>
    <p class="note">${esc(it.note)}</p>
    <div class="row">
      <button data-src="${it.audio}" data-rate="1">▶ 보통 속도</button>
      <button data-src="${it.audio}" data-rate="0.75">▶ 느리게 (0.75배)</button>
    </div>
  </article>`).join('');

writeFileSync(join(OUT, 'index.html'), `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Tutor 샘플 확인</title>
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Tutor 샘플">
<style>
  :root { --bg: #fff; --fg: #111; --sub: #555; --line: #ddd; --accent: #0f31b8; color-scheme: light dark; }
  @media (prefers-color-scheme: dark) { :root { --bg: #0b0b0c; --fg: #f2f2f2; --sub: #aaa; --line: #333; --accent: #7d95ff; } }
  body { margin: 0; padding: 16px 16px calc(32px + env(safe-area-inset-bottom)); background: var(--bg); color: var(--fg);
    font: 16px/1.5 -apple-system, system-ui, sans-serif; }
  h1 { font-size: 22px; margin: 8px 0 4px; }
  .lead { color: var(--sub); margin: 0 0 16px; font-size: 14px; }
  article { border-top: 1px solid var(--line); padding: 16px 0; }
  .meta { font-size: 12px; color: var(--sub); }
  .en { font-size: 22px; font-weight: 600; margin: 4px 0; }
  .ko { margin: 0 0 8px; }
  .note { font-size: 14px; color: var(--sub); margin: 0 0 12px; }
  .row { display: flex; gap: 8px; }
  button { flex: 1; min-height: 44px; border: 1px solid var(--accent); background: transparent; color: var(--accent);
    border-radius: 10px; font-size: 15px; }
  button.playing { background: var(--accent); color: var(--bg); }
</style>
</head>
<body>
<h1>Tutor 샘플 20문장</h1>
<p class="lead">${esc(scope)} 샘플이에요. 홈화면에 추가한 뒤 앱 모드에서 소리를 들어보고, 문장·뜻·메모·발음이 자연스러운지 확인해주세요.</p>
${cards}
<audio id="player" preload="none"></audio>
<script>
  const player = document.getElementById('player');
  let current = null;
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-src]');
    if (!btn) return;
    if (current) current.classList.remove('playing');
    current = btn;
    btn.classList.add('playing');
    player.src = btn.dataset.src;
    // iOS는 src를 바꾸면 재생 속도가 1로 돌아가서, 불러온 뒤에 속도를 다시 맞춘다
    player.onloadedmetadata = () => { player.playbackRate = Number(btn.dataset.rate); };
    player.playbackRate = Number(btn.dataset.rate);
    player.play().catch(() => btn.classList.remove('playing'));
  });
  player.addEventListener('ended', () => current && current.classList.remove('playing'));
</script>
</body>
</html>
`);
console.log(`샘플 ${items.length}개 → ${OUT}`);
