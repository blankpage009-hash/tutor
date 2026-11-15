// 실행: node scripts/content/merge-lessons.mjs content/courses/<코스>.json <수업묶음.json>
// 수업 묶음(배열)을 코스 파일에 id 기준으로 넣거나 교체한다.
// 코스 하나를 한 번에 쓰면 파일이 너무 길어 중간에 잘릴 수 있어서, 수업 4~5개씩 나눠 쓰고 이걸로 합친다.
// 합친 뒤 make_audio.py를 돌리면 JSON 줄 정리(짧은 묶음은 한 줄)도 다시 맞춰진다.
import { readFileSync, writeFileSync } from 'node:fs';

const [coursePath, chunkPath] = process.argv.slice(2);
const course = JSON.parse(readFileSync(coursePath, 'utf8'));
const chunk = JSON.parse(readFileSync(chunkPath, 'utf8'));
for (const lesson of chunk) {
  const i = course.lessons.findIndex((l) => l.id === lesson.id);
  if (i >= 0) course.lessons[i] = lesson;
  else course.lessons.push(lesson);
}
course.lessons.sort((a, b) => a.id.localeCompare(b.id));
writeFileSync(coursePath, JSON.stringify(course, null, 2) + '\n', 'utf8');
console.log(`수업 ${chunk.length}개 반영 → 전체 ${course.lessons.length}개`);
