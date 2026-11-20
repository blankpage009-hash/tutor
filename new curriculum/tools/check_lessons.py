"""레슨 JSON 검사 스크립트.

사용법 (프로젝트 루트에서):
  .venv/Scripts/python.exe "new curriculum/tools/check_lessons.py"            # samples/ + lessons/ 전체
  .venv/Scripts/python.exe "new curriculum/tools/check_lessons.py" 파일.json  # 특정 파일만

검사 기준은 CLAUDE.md 7절 + 기계적으로 확인 가능한 5절 규칙.
오류(ERROR)가 하나라도 있으면 종료 코드 1. 경고(WARN)는 사람이 판단할 항목이라 종료 코드에 영향 없음.
표준 라이브러리만 쓴다 (의존성 추가 승인 없이 돌릴 수 있게).
"""

import csv
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SAMPLE = ROOT / 'samples' / 'INT1-U03-L03.json'
CSV_PATH = ROOT / 'curriculum' / 'curriculum.csv'
LESSONS_DIR = ROOT / 'lessons'

LESSON_ID_RE = re.compile(r'^([A-Z0-9]+)-U(\d{2})-L(\d{2})$')


def load_json(path):
    # BOM이 붙은 파일도 열리게 utf-8-sig
    with open(path, encoding='utf-8-sig') as f:
        return json.load(f)


def words(text):
    return re.findall(r"[A-Za-z0-9']+(?:[:.][0-9]+)?", text)


def norm(text):
    # 대소문자·문장부호 차이만 있는 문장도 "같은 문장"으로 잡기 위해
    return ' '.join(w.lower() for w in words(text))


class Report:
    def __init__(self):
        self.errors = []
        self.warns = []

    def error(self, msg):
        self.errors.append(msg)

    def warn(self, msg):
        self.warns.append(msg)


# ---------- 1·2. 키 비교 (샘플을 "틀"로 사용) ----------

def build_templates(sample):
    """항목 종류별 키 틀. 대화문·롤플레이 줄은 화자(partner/me)마다 키가 달라서 따로 만든다."""
    t = {'_root': set(sample.keys())}
    for key in ('keySentence', 'explanation', 'dialogue', 'rolePlay', 'retryRule'):
        t[key] = set(sample[key].keys())
    t['keySentence.audio'] = set(sample['keySentence']['audio'].keys())
    t['pronunciation[]'] = set(sample['pronunciation'][0].keys())
    t['commonMistakes[]'] = set(sample['commonMistakes'][0].keys())
    t['dialogue.expressionNotes[]'] = set(sample['dialogue']['expressionNotes'][0].keys())
    t['drills[]'] = set(sample['drills'][0].keys())
    t['drills[].cue'] = set(sample['drills'][0]['cue'].keys())
    t['drills[].audio'] = set(sample['drills'][0]['audio'].keys())
    t['drillStages[]'] = set(sample['drillStages'][0].keys())
    for section in ('dialogue', 'rolePlay'):
        for speaker in ('partner', 'me'):
            lines = [l for l in sample[section]['lines'] if l['speaker'] == speaker]
            # 줄마다 다른 키가 있으면 공통 키는 필수, 나머지는 선택(예: hasKeySentence)
            required = set.intersection(*(set(l) for l in lines))
            optional = set.union(*(set(l) for l in lines)) - required
            t[f'{section}.lines[{speaker}]'] = (required, optional)
    return t


def compare_keys(rep, where, obj, required, optional=frozenset()):
    if not isinstance(obj, dict):
        rep.error(f'{where}: 객체(dict)가 아님')
        return
    have = set(obj.keys())
    missing = required - have
    extra = have - required - set(optional)
    if missing:
        rep.error(f'{where}: 빠진 항목 {sorted(missing)}')
    if extra:
        rep.error(f'{where}: 샘플에 없는 항목 {sorted(extra)}')


def check_keys(rep, lesson, t):
    compare_keys(rep, '최상위', lesson, t['_root'])
    for key in ('keySentence', 'explanation', 'dialogue', 'rolePlay', 'retryRule'):
        if isinstance(lesson.get(key), dict):
            compare_keys(rep, key, lesson[key], t[key])
    ks = lesson.get('keySentence', {})
    if isinstance(ks, dict) and 'audio' in ks:
        compare_keys(rep, 'keySentence.audio', ks['audio'], t['keySentence.audio'])
    for key in ('pronunciation', 'commonMistakes', 'drillStages'):
        for i, item in enumerate(lesson.get(key) or []):
            compare_keys(rep, f'{key}[{i}]', item, t[f'{key}[]'])
    for i, d in enumerate(lesson.get('drills') or []):
        compare_keys(rep, f'drills[{i}]', d, t['drills[]'])
        if isinstance(d, dict):
            for sub in ('cue', 'audio'):
                if sub in d:
                    compare_keys(rep, f'drills[{i}].{sub}', d[sub], t[f'drills[].{sub}'])
    dlg = lesson.get('dialogue') or {}
    for i, n in enumerate(dlg.get('expressionNotes') or []):
        compare_keys(rep, f'dialogue.expressionNotes[{i}]', n, t['dialogue.expressionNotes[]'])
    for section in ('dialogue', 'rolePlay'):
        for i, line in enumerate((lesson.get(section) or {}).get('lines') or []):
            sp = line.get('speaker') if isinstance(line, dict) else None
            if sp not in ('partner', 'me'):
                rep.error(f'{section}.lines[{i}]: speaker가 partner/me가 아님 ({sp!r})')
                continue
            req, opt = t[f'{section}.lines[{sp}]']
            compare_keys(rep, f'{section}.lines[{i}]({sp})', line, req, opt)


# ---------- 3·4. 개수와 고정값 ----------

def check_counts(rep, lesson, sample):
    lines = (lesson.get('dialogue') or {}).get('lines') or []
    me = [l for l in lines if l.get('speaker') == 'me']
    if len(lines) != 6 or len(me) != 3:
        rep.error(f'대화문: 6줄·me 3줄이어야 함 (지금 {len(lines)}줄·me {len(me)}줄)')
    for a, b in zip(lines, lines[1:]):
        if a.get('speaker') == b.get('speaker'):
            rep.error(f'대화문: {a.get("no")}·{b.get("no")}번 줄 화자가 번갈아 나오지 않음')
            break
    if len(lesson.get('drills') or []) != 6:
        rep.error(f'드릴: 6개여야 함 (지금 {len(lesson.get("drills") or [])}개)')
    rp = (lesson.get('rolePlay') or {}).get('lines') or []
    order = [l.get('speaker') for l in rp]
    if order != ['partner', 'me'] * 6:
        rep.error(f'롤플레이: partner→me 6세트(12줄)여야 함 (지금 {len(order)}줄)')
    if lesson.get('drillStages') != sample['drillStages']:
        rep.error('drillStages가 샘플과 다름')
    if lesson.get('retryRule') != sample['retryRule']:
        rep.error('retryRule이 샘플과 다름')
    n_expl = len((lesson.get('explanation') or {}).get('ko') or [])
    if not 3 <= n_expl <= 5:
        rep.warn(f'설명 ko: 3~5개 권장 (지금 {n_expl}개)')
    n_pron = len(lesson.get('pronunciation') or [])
    if not 3 <= n_pron <= 4:
        rep.warn(f'발음 팁: 3~4개 권장 (지금 {n_pron}개)')
    if len(lesson.get('commonMistakes') or []) != 3:
        rep.warn(f'자주 하는 실수: 3개 권장 (지금 {len(lesson.get("commonMistakes") or [])}개)')
    if len((lesson.get('dialogue') or {}).get('expressionNotes') or []) != 2:
        rep.warn('대화문 expressionNotes: 2개 권장')


# ---------- 5절 규칙 중 기계적으로 볼 수 있는 것 ----------

def check_rules(rep, lesson):
    ks = (lesson.get('keySentence') or {}).get('en', '')
    n = len(words(ks))
    if not 4 <= n <= 8:
        rep.warn(f'핵심 문장 {n}단어 (4~8단어 권장): {ks}')
    lines = (lesson.get('dialogue') or {}).get('lines') or []
    for l in lines:
        if len(words(l.get('en', ''))) > 15:
            rep.warn(f'대화문 {l.get("no")}번 줄이 15단어 초과')
    flagged = [l for l in lines if l.get('hasKeySentence')]
    if not flagged:
        rep.error('대화문에 hasKeySentence: true 줄이 없음')
    for l in flagged:
        if l.get('speaker') != 'me':
            rep.error(f'대화문 {l.get("no")}번: hasKeySentence 줄은 me여야 함')
        if norm(ks) not in norm(l.get('en', '')):
            rep.error(f'대화문 {l.get("no")}번: hasKeySentence인데 핵심 문장이 안 들어 있음')
    drills = lesson.get('drills') or []
    if drills and norm(drills[0].get('en', '')) != norm(ks):
        rep.error('드릴 1번이 핵심 문장과 다름')
    for d in drills:
        cue = d.get('cue') or {}
        if cue.get('lang') not in ('en', 'ko'):
            rep.error(f'드릴 {d.get("id")}번: cue.lang은 en 또는 ko')
        if d.get('en', '').strip().endswith('?') and cue.get('lang') != 'ko':
            rep.warn(f'드릴 {d.get("id")}번: 질문형 드릴은 cue를 ko 지시문으로 권장')
    points = [d.get('point', '') for d in drills[1:]]
    if len(set(points)) != len(points):
        rep.warn('드릴 2~6번 point가 겹침 (서로 다른 변형이어야 함)')
    rp = (lesson.get('rolePlay') or {}).get('lines') or []
    me_rp = [l for l in rp if l.get('speaker') == 'me']
    for l in me_rp:
        if l.get('freeResponse') is not True:
            rep.error(f'롤플레이 {l.get("no")}번: me 줄은 freeResponse: true')
    # 롤플레이 n번째 대답 = 드릴 n번 문장 (2026-11-20 사용자 결정)
    for l, d in zip(me_rp, drills):
        if norm(l.get('exampleEn', '')) != norm(d.get('en', '')):
            rep.error(f'롤플레이 {l.get("no")}번: 대답이 드릴 {d.get("id")}번 문장과 다름')
        if not l.get('requiredKeywords'):
            rep.error(f'롤플레이 {l.get("no")}번: requiredKeywords가 비어 있음')
    cues = {norm((d.get('cue') or {}).get('text', '')) for d in drills}
    for l in rp:
        if l.get('speaker') == 'partner' and norm(l.get('en', '')) in cues:
            rep.warn(f'롤플레이 {l.get("no")}번: 드릴 cue와 같은 질문')
    for l in me_rp:
        ex = norm(l.get('exampleEn', ''))
        for kw in l.get('requiredKeywords') or []:
            if norm(kw) not in ex:
                rep.warn(f'롤플레이 {l.get("no")}번: 예시 답에 키워드 "{kw}"가 없음')


def iter_audio(lesson):
    ks = lesson.get('keySentence') or {}
    yield from (ks.get('audio') or {}).values()
    for d in lesson.get('drills') or []:
        yield from (d.get('audio') or {}).values()
    for section in ('dialogue', 'rolePlay'):
        for l in (lesson.get(section) or {}).get('lines') or []:
            if 'audio' in l:
                yield l['audio']


def check_ids(rep, lesson, path, csv_rows):
    lid = lesson.get('lessonId', '')
    m = LESSON_ID_RE.match(lid)
    if not m:
        rep.error(f'lessonId 형식이 아님: {lid!r}')
        return
    code, unit, no = m.group(1), int(m.group(2)), int(m.group(3))
    if path.stem != lid:
        rep.error(f'파일 이름({path.name})이 lessonId와 다름')
    if lesson.get('levelCode') != code or lesson.get('unit') != unit or lesson.get('lessonNo') != no:
        rep.error('lessonId와 levelCode/unit/lessonNo가 서로 다름')
    if LESSONS_DIR in path.parents:
        expect = LESSONS_DIR / code / f'U{unit:02d}' / f'{lid}.json'
        if path.resolve() != expect.resolve():
            rep.error(f'저장 위치가 규칙과 다름 (기대: {expect.relative_to(ROOT)})')
    prefix = lid.lower() + '_'
    for name in iter_audio(lesson):
        if not name.startswith(prefix) or not name.endswith('.mp3'):
            rep.error(f'오디오 이름 규칙 위반: {name}')
    row = csv_rows.get((lesson.get('level'), unit, no))
    if row is None:
        rep.error(f'CSV에 없는 레슨: {lesson.get("level")} 유닛 {unit} 레슨 {no}')
        return
    if row['lesson_title'] != lesson.get('lessonTitle'):
        rep.error(f'레슨 제목이 CSV와 다름 (CSV: {row["lesson_title"]})')
    if row['unit_title'] != lesson.get('unitTitle'):
        rep.error(f'유닛 제목이 CSV와 다름 (CSV: {row["unit_title"]})')


# ---------- 5. 유닛 안 중복 ----------

def check_unit_duplicates(lessons):
    """(levelCode, unit)별로 핵심 문장·드릴 문장이 다른 레슨과 겹치는지. 결과: {lessonId: [메시지]}"""
    groups = defaultdict(list)
    for lesson in lessons:
        groups[(lesson.get('levelCode'), lesson.get('unit'))].append(lesson)
    problems = defaultdict(list)
    for group in groups.values():
        seen = {}
        for lesson in group:
            lid = lesson.get('lessonId')
            own = set()
            for kind, text in [('핵심 문장', lesson['keySentence']['en'])] + \
                    [(f'드릴 {d["id"]}', d['en']) for d in lesson.get('drills', [])[1:]]:
                key = norm(text)
                if key in own and kind != '핵심 문장':
                    problems[lid].append(f'{kind}이(가) 같은 레슨 안에서 겹침: {text}')
                own.add(key)
                if key in seen and seen[key][0] != lid:
                    problems[lid].append(f'{kind}이(가) {seen[key][0]}와 겹침: {text}')
                seen.setdefault(key, (lid, kind))
    return problems


def load_csv():
    rows = {}
    with open(CSV_PATH, encoding='utf-8-sig', newline='') as f:
        for r in csv.DictReader(f):
            rows[(r['level'], int(r['unit_no']), int(r['lesson_no']))] = r
    return rows


def collect_paths(args):
    if args:
        return [Path(a).resolve() for a in args]
    paths = sorted((ROOT / 'samples').glob('*.json'))
    if LESSONS_DIR.exists():
        paths += sorted(LESSONS_DIR.rglob('*.json'))
    return paths


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    sample = load_json(SAMPLE)
    templates = build_templates(sample)
    csv_rows = load_csv()
    results, loaded = [], []
    for path in collect_paths(sys.argv[1:]):
        rep = Report()
        try:
            lesson = load_json(path)
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            rep.error(f'JSON 문법 오류: {e}')
            results.append((path, None, rep))
            continue
        check_keys(rep, lesson, templates)
        try:
            check_counts(rep, lesson, sample)
            check_rules(rep, lesson)
            check_ids(rep, lesson, path, csv_rows)
            loaded.append(lesson)
        except (AttributeError, TypeError, KeyError) as e:
            rep.error(f'형식이 깨져서 검사를 끝까지 못 함: {e!r}')
        results.append((path, lesson, rep))

    dup = check_unit_duplicates(loaded)
    print('| lessonId | 레슨 제목 | 핵심 문장 | 검사 결과 |')
    print('| --- | --- | --- | --- |')
    total_err = 0
    for path, lesson, rep in results:
        if lesson:
            for msg in dup.get(lesson.get('lessonId'), []):
                rep.error(msg)
        total_err += len(rep.errors)
        status = '통과' if not rep.errors else f'오류 {len(rep.errors)}'
        if rep.warns:
            status += f' · 경고 {len(rep.warns)}'
        lid = lesson.get('lessonId', path.name) if lesson else path.name
        title = lesson.get('lessonTitle', '') if lesson else ''
        ks = (lesson.get('keySentence') or {}).get('en', '') if lesson else ''
        print(f'| {lid} | {title} | {ks} | {status} |')

    for path, lesson, rep in results:
        if rep.errors or rep.warns:
            print(f'\n[{path.relative_to(ROOT) if ROOT in path.parents else path}]')
            for m in rep.errors:
                print(f'  ERROR {m}')
            for m in rep.warns:
                print(f'  WARN  {m}')
    print(f'\n파일 {len(results)}개, 오류 {total_err}개')
    sys.exit(1 if total_err else 0)


if __name__ == '__main__':
    main()
