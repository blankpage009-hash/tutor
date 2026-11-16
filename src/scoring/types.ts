// 판정 모듈의 "콘센트 규격". 지금은 단어 일치율 판정기(wordMatchJudge) 하나지만,
// 나중에 발음 평가 서비스로 바꿔도 화면 코드는 이 모양만 알면 되게 한다.

export type WordMark = {
  text: string; // 화면에 보일 원래 단어 (문장부호 포함)
  status: 'matched' | 'missed';
};

export type Judgement = {
  ratio: number; // 0~1, 맞힌 단어 비율
  words: WordMark[];
  nextIndex: number; // 다음에 말할 단어 위치 (밑줄 표시용). 다 맞혔으면 -1
  heard: string; // 가장 잘 맞은 인식 결과
};

export interface Judge {
  // alternatives: 음성 인식이 돌려준 후보 문장들 (가장 잘 맞는 후보로 판정)
  judge(target: string, alternatives: string[]): Judgement;
}

// 부동소수점 오차로 0.8이 0.7999…가 되어 떨어지는 일을 막는다
export function isPass(j: Judgement, threshold: number): boolean {
  return j.ratio + 1e-9 >= threshold;
}
