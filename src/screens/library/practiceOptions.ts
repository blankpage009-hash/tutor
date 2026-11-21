// 보관함 쉐도잉의 반복 횟수·순서 선택. 다음에 열어도 그대로이게 기기에만 기억한다.
// 사생활 모드 등에서 저장소가 막혀도 기본값으로 돌아가게 try로 감싼다
export const REPEAT_CHOICES = [1, 3, 5, 10] as const;
export type PracticeOrder = 'inOrder' | 'random';
export type PracticeOptions = { reps: number; order: PracticeOrder };

const KEY = 'library-practice-options';
const DEFAULTS: PracticeOptions = { reps: 1, order: 'inOrder' };

export function loadPracticeOptions(): PracticeOptions {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<PracticeOptions> | null;
    const reps = REPEAT_CHOICES.includes(raw?.reps as 1) ? (raw?.reps as number) : DEFAULTS.reps;
    const order = raw?.order === 'random' ? 'random' : 'inOrder';
    return { reps, order };
  } catch {
    return DEFAULTS;
  }
}

export function savePracticeOptions(o: PracticeOptions): void {
  try { localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* 저장 못 해도 이번 화면에선 그대로 쓴다 */ }
}
