// 보관함 줄의 "저장한 지 얼마나 됐는지" 표시 (Today · 2일전 · 1주전 · 1개월전 · 1년 1개월전).
export type SavedLabel = { text: string; today: boolean };

function dayStart(ms: number): Date {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d;
}

// 달 수는 30일로 나누지 않고 달력 기준으로 센다 (1월 31일 → 2월 28일 같은 끝자락 어긋남을 줄이려고 날짜가 모자라면 한 달을 덜 센다)
function monthsBetween(from: Date, to: Date): number {
  let m = (to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth();
  if (to.getDate() < from.getDate()) m -= 1;
  return Math.max(0, m);
}

// 날짜 차이는 밤 12시 기준(오늘 저녁에 저장해도 내일 아침이면 1일전). 시간대는 기기 기준
export function savedLabel(savedAt: number, now: number): SavedLabel {
  const from = dayStart(savedAt);
  const to = dayStart(now);
  const days = Math.round((to.getTime() - from.getTime()) / 86400000);
  if (days <= 0) return { text: 'Today', today: true };
  const months = monthsBetween(from, to);
  if (months >= 12) {
    const y = Math.floor(months / 12);
    const rest = months % 12;
    return { text: rest ? `${y}년 ${rest}개월전` : `${y}년전`, today: false };
  }
  if (months >= 1) return { text: `${months}개월전`, today: false };
  if (days >= 7) return { text: `${Math.floor(days / 7)}주전`, today: false };
  return { text: `${days}일전`, today: false };
}
