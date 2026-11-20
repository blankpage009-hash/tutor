import { describe, expect, it } from 'vitest';
import type { SavedSentence } from './db/types';
import {
  gradeCounts, gradeFor, initReview, isFinished, maskText, MAX_FAILS, pickReviewRows, reviewHintText, reviewReducer,
  type ReviewAction
} from './reviewPlan';

describe('빈칸 힌트', () => {
  it('0단계는 아무것도 보이지 않는다', () => {
    expect(maskText("I'm torn between these two.", 0)).toBe('');
  });

  it('1단계는 핵심 단어만 밑줄로 가리고 짧은 말·문장부호는 보여 준다', () => {
    expect(maskText('I want to go home.', 1)).toBe('I ____ to go ____.');
  });

  it('2단계는 빈칸에 첫 글자를 보여 준다', () => {
    expect(maskText('Nice to meet you.', 2)).toBe('N___ to m___ you.');
  });

  it("don't 같은 줄임말은 짧은 말로 보고 보여 준다", () => {
    expect(maskText("Don't worry about it.", 1)).toBe("Don't _____ _____ it.");
  });

  it('핵심 단어가 하나도 없으면 가장 긴 단어를 가린다', () => {
    const out = maskText('Is it you?', 1);
    expect(out).not.toBe('Is it you?');
    expect(out.split(' ').filter((w) => w.includes('_'))).toHaveLength(1);
  });
});

describe('문장 복습 힌트 3단계', () => {
  const en = 'Mornings work best for me.';
  it('0단계는 아무것도 보이지 않는다', () => expect(reviewHintText(en, 0)).toBe(''));
  it('1단계는 단어마다 첫 글자만 (길이·문장부호 없이)', () => expect(reviewHintText(en, 1)).toBe('M w b f m'));
  it('2단계는 첫 글자 + 나머지 글자 수만큼 밑줄', () => expect(reviewHintText(en, 2)).toBe('M_______ w___ b___ f__ m_.'));
  it('3단계는 짧은 말을 다 보여 주고 핵심 단어만 2단계처럼', () => expect(reviewHintText(en, 3)).toBe('M_______ w___ b___ for me.'));
  it('줄임표는 남기고, 문장부호만 있는 덩어리는 1단계에서 뺀다', () => {
    expect(reviewHintText("Don't — worry.", 1)).toBe('D w');
    expect(reviewHintText("Don't worry.", 2)).toBe("D__'_ w____.");
  });
});

describe('등급', () => {
  it('힌트 없이 한 번에 통과하면 좋음', () => expect(gradeFor(true, 0, 0)).toBe('good'));
  it('힌트를 썼거나 틀렸다가 통과하면 어려움', () => {
    expect(gradeFor(true, 1, 0)).toBe('hard');
    expect(gradeFor(true, 0, 2)).toBe('hard');
  });
  it('통과하지 못하면 모름', () => expect(gradeFor(false, 0, 0)).toBe('again'));
});

const row = (id: string, en?: string): SavedSentence => ({ id, courseId: 'c', lessonId: 'l', savedAt: 0, en, ko: en && '뜻' });

describe('복습할 문장 고르기', () => {
  const rows = [row('a', 'A'), row('b', 'B'), row('c', 'C'), row('d')];

  it('오늘 복습은 때가 된 문장만, 오래 밀린 것부터', () => {
    const due = new Map([['c', 10], ['a', 20]]);
    expect(pickReviewRows({ mode: 'due', rows, dueAt: due }).map((r) => r.id)).toEqual(['c', 'a']);
  });

  it('글자가 없는 문장은 뺀다', () => {
    const due = new Map([['d', 1]]);
    expect(pickReviewRows({ mode: 'due', rows, dueAt: due })).toEqual([]);
  });

  it('개수 제한을 지킨다', () => {
    const due = new Map(rows.map((r, i) => [r.id, i] as const));
    expect(pickReviewRows({ mode: 'due', rows, dueAt: due, limit: 2 })).toHaveLength(2);
  });

  it('랜덤은 때와 상관없이 글자 있는 문장 전부에서 섞어 뽑는다', () => {
    const picked = pickReviewRows({ mode: 'random', rows, dueAt: new Map(), rng: () => 0 });
    expect(picked.map((r) => r.id).sort()).toEqual(['a', 'b', 'c']);
  });
});

function run(ids: string[], actions: ReviewAction[]) {
  return actions.reduce(reviewReducer, initReview(ids));
}

describe('카드 진행', () => {
  it('힌트 없이 통과하면 좋음으로 기록하고, 다음으로 넘어가야 새 카드가 된다', () => {
    const s = run(['a', 'b'], [{ type: 'attempt', id: 'a', status: 'passed' }]);
    expect(s.outcome).toBe('passed');
    expect(s.graded).toEqual([{ id: 'a', grade: 'good' }]);
    const n = reviewReducer(s, { type: 'next' });
    expect(n).toMatchObject({ index: 1, hint: 0, fails: 0, outcome: 'open' });
  });

  it('힌트는 정한 단계까지만 올라간다 (기본 2, 문장 복습 3)', () => {
    const hints: ReviewAction[] = [{ type: 'hint' }, { type: 'hint' }, { type: 'hint' }, { type: 'hint' }];
    expect(run(['a'], hints).hint).toBe(2);
    expect(hints.reduce(reviewReducer, initReview(['a'], 3)).hint).toBe(3);
  });

  it('힌트를 쓰고 통과하면 어려움', () => {
    const s = run(['a'], [{ type: 'hint' }, { type: 'attempt', id: 'a', status: 'passed' }]);
    expect(s.graded[0].grade).toBe('hard');
  });

  it(`${MAX_FAILS}번 틀리면 정답을 보여 주고 모름`, () => {
    const fail: ReviewAction = { type: 'attempt', id: 'a', status: 'failed' };
    const two = run(['a'], [fail, fail]);
    expect(two.outcome).toBe('open');
    const three = reviewReducer(two, fail);
    expect(three.outcome).toBe('gave-up');
    expect(three.graded[0].grade).toBe('again');
  });

  it('정답 보기(포기)는 모름', () => {
    expect(run(['a'], [{ type: 'giveUp' }]).graded[0].grade).toBe('again');
  });

  it('끝난 카드나 다른 카드의 늦은 판정은 무시한다', () => {
    const done = run(['a', 'b'], [{ type: 'attempt', id: 'a', status: 'passed' }]);
    expect(reviewReducer(done, { type: 'attempt', id: 'a', status: 'failed' })).toBe(done);
    const open = initReview(['a', 'b']);
    expect(reviewReducer(open, { type: 'attempt', id: 'b', status: 'passed' })).toBe(open);
  });

  it('열려 있는 카드는 다음으로 못 넘어간다', () => {
    const open = initReview(['a']);
    expect(reviewReducer(open, { type: 'next' })).toBe(open);
  });

  it('마지막 카드 다음은 끝', () => {
    const s = run(['a'], [{ type: 'attempt', id: 'a', status: 'passed' }, { type: 'next' }]);
    expect(isFinished(s)).toBe(true);
    expect(gradeCounts(s.graded).good).toBe(1);
  });
});
