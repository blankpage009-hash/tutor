// 보관함 Random에서 자주 틀리는 문장을 더 자주 내는 계산 (사용자 요청 2026-11-21).
// 화면·DB와 떼어 둔 순수 계산이라 테스트로 확인한다

const MAX_WEIGHT = 6; // 한 문장이 판을 독차지하지 않게
export const EXTRA_GAP = 3; // 바로 다시 하면 방금 들은 걸 따라 하는 것뿐이라, 다른 문장을 몇 개 사이에 둔다

// 백업에서 이상한 값이 들어왔어도 계산이 깨지지 않게, 숫자가 아니면 0으로 본다
export function missOf(r: { miss?: unknown }): number {
  return typeof r.miss === 'number' && Number.isFinite(r.miss) && r.miss > 0 ? r.miss : 0;
}

export function weightOf(miss: number): number {
  return Math.min(MAX_WEIGHT, 1 + Math.max(0, miss));
}

function fisherYates<T>(list: T[], random: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// 가중치가 모두 1이면 예전과 똑같이 섞는다 (틀린 기록이 없을 때 동작이 바뀌지 않게).
// 섞여 있으면 항목마다 -log(u)/가중치를 뽑아 작은 순서로 둔다: 가중치가 클수록 앞에 오기 쉽지만 매번 달라진다
export function weightedOrder<T>(list: T[], weight: (item: T) => number, random: () => number): T[] {
  if (list.every((x) => weight(x) === 1)) return fisherYates(list, random);
  return list
    .map((item) => ({ item, key: -Math.log(1 - random()) / weight(item) }))
    .sort((a, b) => a.key - b.key)
    .map((x) => x.item);
}

// 틀린 적 있는 문장을 한 번 더 끼운다. 점수 높은 순으로 최대 절반(올림)까지,
// 원래 자리보다 EXTRA_GAP 문장 이상 뒤에 (자리가 모자라면 맨 끝). 문장이 2개 미만이면 그대로
export function withExtras<T>(order: T[], miss: (item: T) => number): { item: T; extra: boolean }[] {
  const out = order.map((item) => ({ item, extra: false }));
  if (order.length < 2) return out;
  const picked = order
    .map((item, at) => ({ item, at, m: miss(item) }))
    .filter((x) => x.m >= 1)
    .sort((a, b) => b.m - a.m || a.at - b.at)
    .slice(0, Math.ceil(order.length / 2))
    .sort((a, b) => b.at - a.at); // 뒤쪽부터 끼워야 앞쪽 문장의 자리 계산이 흔들리지 않는다
  for (const p of picked) {
    const pos = out.findIndex((x) => x.item === p.item && !x.extra);
    out.splice(Math.min(out.length, pos + 1 + EXTRA_GAP), 0, { item: p.item, extra: true });
  }
  return out;
}
