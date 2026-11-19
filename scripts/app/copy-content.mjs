// content/(원본)을 public/content/(앱이 읽는 복사본)로 똑같이 맞춘다.
// 왜 복사하나: Vite는 public/ 안의 파일만 그대로 내보내는데, public/에는 아이콘도 있어서
// content/ 자체를 publicDir로 지정할 수 없다. 원본은 content/ 한 곳에만 두고 고친다.
// 바뀐 파일만 복사하고, 원본에서 지워진 파일은 복사본에서도 지운다 (음성 4천여 개를 매번 다 복사하지 않게).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = path.join(root, 'content');
const DEST = path.join(root, 'public', 'content');
// schema.md 같은 설명 문서는 앱에 필요 없다
// curriculum.json·lessons/는 새 커리큘럼(make_lesson_audio.py가 만듦)
const INCLUDE = ['manifest.json', 'courses', 'audio', 'curriculum.json', 'lessons', 'glossary.json'];

function walk(dir, base = dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, base, out);
    else out.push(path.relative(base, full));
  }
  return out;
}

function sameFile(a, b) {
  if (!fs.existsSync(b)) return false;
  const sa = fs.statSync(a);
  const sb = fs.statSync(b);
  return sa.size === sb.size && sb.mtimeMs >= sa.mtimeMs;
}

const wanted = new Set();
let copied = 0;
for (const item of INCLUDE) {
  const srcPath = path.join(SRC, item);
  const files = fs.statSync(srcPath).isDirectory()
    ? walk(srcPath).map((f) => path.join(item, f))
    : [item];
  for (const rel of files) {
    wanted.add(rel);
    const from = path.join(SRC, rel);
    const to = path.join(DEST, rel);
    if (sameFile(from, to)) continue;
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
    copied++;
  }
}

let removed = 0;
for (const rel of walk(DEST)) {
  if (wanted.has(rel)) continue;
  fs.rmSync(path.join(DEST, rel));
  removed++;
}

console.log(`content 복사: 새로 ${copied}개, 삭제 ${removed}개, 전체 ${wanted.size}개`);
