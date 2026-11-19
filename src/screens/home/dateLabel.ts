// 홈 위쪽 날짜 라벨 (예: "NOV 19 · THU"). toLocaleDateString은 기기 언어 설정에 따라 한글이 섞여서 직접 만든다.
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export function dateLabel(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()} · ${DAYS[d.getDay()]}`;
}
