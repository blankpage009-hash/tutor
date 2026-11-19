// 단어장 "뜻 자동 채움" 사전(content/glossary.json)을 만든다.
// 재료: ① 옛 10코스 문장별 vocab(한 단어짜리만) ② content/glossary-new.json(새 커리큘럼용, 손으로 쓴 것)
// 왜 한 단어만: 앱에서 누를 수 있는 것이 단어 하나씩이라, "pick up" 같은 표현의 뜻을 pick에 붙이면 틀린 뜻이 되기 때문이다.
// 같은 단어가 둘 이상이면 새 커리큘럼 쪽이 이기고, 옛 코스끼리는 먼저 나온 것을 쓴다.
// 실행: node scripts/content/build-glossary.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { POS_VALUES } from './validate-core.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const content = (...p) => path.join(root, 'content', ...p);
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));

const words = {};

const manifest = readJson(content('manifest.json'));
for (const entry of manifest.courses) {
  const course = readJson(content(entry.file));
  for (const lesson of course.lessons) {
    for (const sentence of lesson.sentences) {
      for (const v of sentence.vocab ?? []) {
        const key = v.word.toLowerCase().trim();
        if (/\s/.test(key) || key in words) continue;
        words[key] = [v.ko, v.pos];
      }
    }
  }
}

const extra = readJson(content('glossary-new.json'));
const errors = [];
for (const [key, val] of Object.entries(extra)) {
  if (key.startsWith('_')) continue;
  if (!Array.isArray(val) || val.length !== 2 || !val[0] || !POS_VALUES.includes(val[1])) {
    errors.push(`${key}: [뜻, 품사] 모양이 아니거나 품사가 정해진 값이 아닙니다`);
    continue;
  }
  words[key] = val;
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const sorted = Object.fromEntries(Object.keys(words).sort().map((k) => [k, words[k]]));
fs.writeFileSync(content('glossary.json'), JSON.stringify({ schemaVersion: 1, words: sorted }));
console.log(`glossary.json: ${Object.keys(sorted).length}개`);
