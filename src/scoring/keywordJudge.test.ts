import { describe, expect, it } from 'vitest';
import { judgeKeywords } from './keywordJudge';

describe('롤플레이 키워드 판정', () => {
  it('실제 레슨 예시 답은 모두 통과한다', () => {
    const cases: [string[], string][] = [
      [['torn', 'between'], "Not yet. I'm torn between a place downtown and one near the beach."],
      [['this one', 'a lot'], "Yes. This one's a lot softer, though."],
      [['maybe', 'should'], 'Maybe we should try the one near the library.'],
      [['which', 'better'], "I'm not sure. Which one do you think she'd like better?"],
      [['if I were you'], "If I were you, I'd get the apple pie. Everyone loves it."],
      [['work', 'for me'], 'Afternoons work best for me. Can I come by after 3?']
    ];
    for (const [keys, example] of cases) expect(judgeKeywords(keys, [example]).pass).toBe(true);
  });

  it('앱 안 인식의 소문자·문장부호 없는 모양도 통과한다', () => {
    expect(judgeKeywords(['torn', 'between'], ['i am torn between the two places']).pass).toBe(true);
    expect(judgeKeywords(['this one'], ['this one is a lot softer']).pass).toBe(true);
  });

  it('키워드가 하나라도 빠지면 떨어지고, 무엇이 빠졌는지 알려 준다', () => {
    const j = judgeKeywords(['torn', 'between'], ["i can't decide between them"]);
    expect(j.pass).toBe(false);
    expect(j.hits).toEqual([{ keyword: 'torn', hit: false }, { keyword: 'between', hit: true }]);
  });

  it('여러 단어 키워드는 붙어서 순서대로 나와야 한다', () => {
    expect(judgeKeywords(['for me'], ['it works for me']).pass).toBe(true);
    expect(judgeKeywords(['for me'], ['me for it']).pass).toBe(false);
    expect(judgeKeywords(['if I were you'], ['if you were me']).pass).toBe(false);
  });

  it('단어 일부에 숨은 글자는 키워드로 치지 않는다', () => {
    expect(judgeKeywords(['or'], ['it works']).pass).toBe(false);
  });

  it('비슷한 소리는 인정한다 (아이폰: work를 walk로 들음 — 사용자 결정 2026-11-18)', () => {
    expect(judgeKeywords(['work', 'for me'], ['afternoons walk best for me']).pass).toBe(true);
    expect(judgeKeywords(['torn'], ['i am turn between them']).pass).toBe(true);
    expect(judgeKeywords(['better'], ['which one do you like bitter']).pass).toBe(true);
  });

  it('어미만 다른 말도 인정한다', () => {
    expect(judgeKeywords(['work'], ['afternoon works for me']).pass).toBe(true);
    expect(judgeKeywords(['work'], ['it worked']).pass).toBe(true);
    expect(judgeKeywords(['work'], ['working late']).pass).toBe(true);
  });

  it('너무 후하지 않게: 짧은 말·다른 소리는 여전히 다르다', () => {
    expect(judgeKeywords(['this one'], ['the one is softer']).pass).toBe(false);
    expect(judgeKeywords(['which'], ['watch it']).pass).toBe(false);
    expect(judgeKeywords(['should'], ['she showed me']).pass).toBe(false);
    expect(judgeKeywords(['if I were you'], ['if you were me']).pass).toBe(false);
    expect(judgeKeywords(['me'], ['my']).pass).toBe(false);
  });

  it('축약을 풀어 비교한다', () => {
    expect(judgeKeywords(['should'], ["we shouldn't go"]).pass).toBe(true);
  });

  it('키워드가 없는 줄은 말하기만 하면 통과, 못 알아들은 소리([unk])만으로는 통과 못 한다', () => {
    expect(judgeKeywords([], ['great see you then']).pass).toBe(true);
    expect(judgeKeywords([], ['[unk]']).pass).toBe(false);
    expect(judgeKeywords([], []).pass).toBe(false);
    expect(judgeKeywords([], ['[unk] okay']).heard).toBe('okay');
  });

  it('후보 중 하나라도 키워드를 다 담으면 통과', () => {
    const j = judgeKeywords(['torn', 'between'], ['i am born between', 'i am torn between']);
    expect(j.pass).toBe(true);
    expect(j.heard).toBe('i am torn between');
  });
});
