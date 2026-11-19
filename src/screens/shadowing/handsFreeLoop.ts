// 손 안 대고 이어 말하기의 순서 (PLAN 5.3, 사용자 결정 2026-11-16). 화면(React)과 떼어 두어 시험으로 확인한다.
// 튜터가 읽음 → 내가 말함 → 통과면 다음 문장 / 실패면 느리게 한 번 들려준 뒤 바로 다시 들음.
// 같은 문장에서 연속으로 너무 많이 떨어지거나, 말이 없거나, 멈춤을 누르면 끝난다.

// preparing: 들을 차례지만 마이크가 아직 켜지는 중 (튜터 재생 중 마이크를 끄는 화면에서만, useHandsFree가 알림)
export type HandsFreeStep = 'reading' | 'preparing' | 'listening' | 'slow';
export type HearStatus = 'passed' | 'failed' | 'no-speech' | 'error';
export type HandsFreeEnd = 'done' | 'too-many-fails' | 'no-speech' | 'error' | 'stopped';

export type HandsFreeDeps<S> = {
  sentences: S[];
  start: number; // 시작할 문장 번호 (화면에서 보고 있던 문장)
  maxFails: number;
  slowRate: number;
  failFeedback: boolean;
  stopped: () => boolean;
  play: (s: S, rate: number) => Promise<void>;
  hear: (s: S) => Promise<HearStatus>; // 듣고 판정해 화면에 보여 준 뒤 결과를 알려 준다
  // 통과 한 번을 기록하고, 이제 필요 횟수 이상이면 true (이미 끝낸 문장에서 시작해도 넘어가게)
  recordPass: (s: S) => boolean;
  advance: () => void; // 화면을 다음 문장으로 (마지막 문장이면 "모두 통과")
  onStep?: (step: HandsFreeStep, s: S) => void;
  // 아래 셋은 드릴용(Phase 5.5). 안 주면 쉐도잉·변형·복습과 같은 기본 동작
  shouldRead?: (s: S) => boolean; // false면 튜터가 먼저 읽지 않고 바로 듣는다 (보고·기억 회차)
  readFirst?: (s: S) => Promise<void>; // 먼저 읽을 소리를 바꿀 때 (상황 응답은 정답 대신 cue)
  // 'slow-and-continue': 연속 실패가 maxFails에 닿으면 멈추지 않고 느리게 들려준 뒤 횟수를 0으로
  onTooManyFails?: 'stop' | 'slow-and-continue';
};

async function playSlow<S>(d: HandsFreeDeps<S>, s: S): Promise<void> {
  d.onStep?.('slow', s);
  await d.play(s, d.slowRate);
}

// 화면이 다시 그려지기 전에도 옛 문장을 또 읽지 않도록, 문장 번호는 여기서 따로 들고 간다
export async function runHandsFree<S>(d: HandsFreeDeps<S>): Promise<HandsFreeEnd> {
  let i = d.start;
  let fails = 0;
  let read = true;
  for (;;) {
    const s = d.sentences[i];
    if (read && (d.shouldRead?.(s) ?? true)) {
      d.onStep?.('reading', s);
      await (d.readFirst ? d.readFirst(s) : d.play(s, 1));
      if (d.stopped()) return 'stopped';
    }
    d.onStep?.('listening', s);
    const r = await d.hear(s);
    // 멈춤을 누른 순간 듣던 결과는 버린다 (판정 기록·느린 재생 안 함)
    if (d.stopped()) return 'stopped';
    if (r === 'no-speech' || r === 'error') return r;
    if (r === 'passed') {
      fails = 0;
      read = true;
      if (!d.recordPass(s)) continue; // 반복 횟수를 다 못 채웠으면 같은 문장을 튜터가 다시 읽는다
      d.advance();
      if (i >= d.sentences.length - 1) return 'done';
      i += 1;
      continue;
    }
    fails += 1;
    // 틀리면 보통 속도로 다시 읽지 않고 바로 듣는다
    read = false;
    if (fails >= d.maxFails) {
      if (d.onTooManyFails !== 'slow-and-continue') return 'too-many-fails';
      fails = 0;
      await playSlow(d, s);
    } else if (d.failFeedback) {
      await playSlow(d, s);
    }
    if (d.stopped()) return 'stopped';
  }
}
