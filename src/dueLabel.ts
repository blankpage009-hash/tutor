// 보관함 줄의 "다음 복습 날짜" 표시 (디자인 v2 09: TODAY / NOV 21). 화면과 떼어 테스트한다.
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export type DueLabel = { text: string; today: boolean };

// 오늘 안(밤 12시 전)에 때가 되는 문장은 TODAY. 이미 지난 것도 아직 안 한 복습이라 TODAY로 보인다.
// 날짜는 기기 시간대 기준 (홈 날짜 라벨과 같은 기준)
export function dueLabel(dueAt: number | undefined, now: number): DueLabel | null {
  if (dueAt === undefined) return null;
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  if (dueAt < end.getTime()) return { text: 'TODAY', today: true };
  const d = new Date(dueAt);
  return { text: `${MONTHS[d.getMonth()]} ${d.getDate()}`, today: false };
}
