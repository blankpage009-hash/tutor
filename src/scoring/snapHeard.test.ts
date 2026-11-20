import { describe, expect, it } from 'vitest';
import { judgeShown, pickShown, snapToSentence } from './snapHeard';

const text = (heard: string, expected: string) => snapToSentence(heard, expected).map((p) => p.text).join(' ');
const snapped = (heard: string, expected: string) =>
  snapToSentence(heard, expected).filter((p) => p.snapped).map((p) => p.text);

describe('롤플레이 화면: 들린 말을 예시 문장 쪽으로 맞춰 적기', () => {
  const ex = 'Afternoons work best for me. Can I come by after 3?';

  it('소리가 비슷한 단어는 예시 문장 단어로 바꾸고 표시한다 (work → walk)', () => {
    expect(text('afternoons walk best for me', ex)).toBe('afternoons work best for me');
    expect(snapped('afternoons walk best for me', ex)).toEqual(['work']);
  });

  it('어미만 다른 말·비슷한 모음도 맞춘다', () => {
    expect(text('afternoon work best', ex)).toBe('afternoons work best');
    expect(text('which one do you like bitter', 'Which one do you think she’d like better?'))
      .toBe('which one do you like better');
  });

  it('이미 맞는 단어·축약은 그대로 둔다', () => {
    expect(snapped('afternoons work best for me', ex)).toEqual([]);
    expect(snapped("i'm torn between them", "I'm torn between a place downtown and one near the beach.")).toEqual([]);
  });

  it('너무 후하지 않게: 짧은 단어·다른 소리는 바꾸지 않는다', () => {
    expect(snapped('my turn', 'Me first.')).toEqual([]);
    expect(snapped('watch it', 'Which one?')).toEqual([]);
    expect(text('i love pizza', ex)).toBe('i love pizza');
  });

  it('단어 수와 순서는 그대로다 (키워드 강조 번호가 맞게)', () => {
    const parts = snapToSentence('afternoons walk best for me okay', ex);
    expect(parts).toHaveLength(6);
  });
});

describe('롤플레이 화면: 보여 줄 후보 고르기', () => {
  const ex = 'Afternoons work best for me.';

  it('두 번째 의견이 예시 문장 단어를 더 담으면 그것을 보여 준다', () => {
    expect(pickShown(['work'], ['after noon walk the best four me', 'afternoons work best for me'], ex))
      .toBe('afternoons work best for me');
  });

  it('키워드를 다 담은 후보가 먼저다', () => {
    expect(pickShown(['work'], ['afternoons best for me', 'it works'], ex)).toBe('it works');
  });

  it('예시와 다르게 대답하면 자유 인식 글자를 남긴다 ([unk]투성이 두 번째 의견이 아니라)', () => {
    expect(pickShown([], ['mornings are good for me', '[unk] [unk] for me'], ex)).toBe('mornings are good for me');
  });

  it('점수가 같으면 앞의 것(자유 인식)', () => {
    expect(pickShown(['work'], ['afternoons walk best', 'afternoons work best'], ex)).toBe('afternoons walk best');
  });
});

describe('롤플레이 판정: 다시 들은 글자(hinted)는 판정에 섞지 않는다', () => {
  const ex = 'Afternoons work best for me.';

  it('자유 인식에 키워드가 없으면, 다시 들은 글자에 있어도 떨어진다', () => {
    const j = judgeShown(['for me'], ['afternoons work best'], 'afternoons work best for me', ex);
    expect(j.pass).toBe(false);
    expect(j.heard).toBe('afternoons work best');
  });

  it('자유 인식으로 통과하면, 예시 단어를 더 담은 다시 들은 글자를 보여 준다', () => {
    const j = judgeShown(['work'], ['after noon walk the best four me'], 'afternoons work best for me', ex);
    expect(j.pass).toBe(true);
    expect(j.heard).toBe('afternoons work best for me');
  });

  it('다시 들은 글자가 없으면 자유 인식 판정 그대로', () => {
    expect(judgeShown(['work'], ['it works'], undefined, ex).heard).toBe('it works');
  });
});
