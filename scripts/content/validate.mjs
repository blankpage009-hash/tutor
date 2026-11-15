// 실행: node scripts/content/validate.mjs
// content/ 안의 manifest와 모든 코스 파일을 형식 검사한다. 오류가 있으면 종료 코드 1.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listSpokenItems, validateCourse, validateManifest } from './validate-core.mjs';

export const CONTENT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'content');

export function readJson(relPath) {
  return JSON.parse(readFileSync(join(CONTENT_DIR, relPath), 'utf8'));
}

// 음성 경로가 적혀 있는데 파일이 없으면 앱에서 무음이 되므로 여기서 잡는다
function checkAudioFiles(course) {
  const missing = [];
  for (const item of listSpokenItems(course)) {
    const p = item.obj.audio;
    if (p && !existsSync(join(CONTENT_DIR, p))) missing.push(`${item.id ?? item.text}: ${p}`);
  }
  return missing;
}

function loadCourses(manifest, report) {
  const seen = new Set();
  const courses = [];
  for (const entry of manifest.courses || []) {
    if (!existsSync(join(CONTENT_DIR, entry.file))) {
      report.errors.push(`manifest: 파일 ${entry.file}이 없습니다`);
      continue;
    }
    const course = readJson(entry.file);
    if (course.id !== entry.id) report.errors.push(`${entry.file}: 코스 id가 manifest(${entry.id})와 다릅니다`);
    const r = validateCourse(course, seen);
    report.errors.push(...r.errors);
    report.warnings.push(...r.warnings);
    report.errors.push(...checkAudioFiles(course).map((m) => `음성 파일 없음 ${m}`));
    courses.push(course);
  }
  return courses;
}

function main() {
  const manifest = readJson('manifest.json');
  const report = validateManifest(manifest);
  const courses = loadCourses(manifest, report);
  const sentenceCount = courses.reduce(
    (n, c) => n + c.lessons.reduce((m, l) => m + (l.sentences?.length || 0), 0), 0);
  for (const w of report.warnings) console.log('경고', w);
  for (const e of report.errors) console.log('오류', e);
  console.log(`\n코스 ${courses.length}개 · 핵심 문장 ${sentenceCount}개 · 오류 ${report.errors.length} · 경고 ${report.warnings.length}`);
  process.exitCode = report.errors.length ? 1 : 0;
}

// 다른 스크립트가 readJson만 가져다 쓸 때는 검사가 돌지 않게, 직접 실행했을 때만 main을 부른다
if (process.argv[1] && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) main();
