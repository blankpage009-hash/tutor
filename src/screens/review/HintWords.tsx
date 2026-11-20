import styles from './Review.module.css';

// 힌트 글자("M_______ w___ for me.")를 시안처럼 밑줄 칸으로 그린다. 밑줄 문자 대신 선을 쓰는 건
// 밑줄 여러 개가 붙으면 한 줄로 이어져 글자 수를 셀 수 없어서다. 1단계는 길이를 숨기려고 모든 칸을 같은 폭으로 둔다
export function HintWords({ text, sameWidth }: { text: string; sameWidth: boolean }) {
  return (
    <p className={styles.hint} lang="en">
      <span className={styles.srOnly}>힌트: {text}</span>
      <span className={styles.hintWords} aria-hidden="true">
        {text.split(' ').map((word, i) => (
          <span key={i} className={styles.hintWord}>
            {sameWidth ? <>{word}<span className={styles.blank} style={{ width: '1.6em' }} /></> : pieces(word)}
          </span>
        ))}
      </span>
    </p>
  );
}

// 글자는 그대로, 밑줄 덩어리는 글자 수만큼 폭을 가진 선으로
function pieces(word: string) {
  return word.split(/(_+)/).filter(Boolean).map((p, i) => (p[0] === '_'
    ? <span key={i} className={styles.blank} style={{ width: `${p.length * 0.6}em` }} />
    : <span key={i}>{p}</span>));
}
