import styles from './CoursePicker.module.css';

type Props = {
  courseNames: string[];
  courseIdx: number;
  levelCount: number;
  levelIdx: number;
  onCourse: (idx: number) => void;
  onLevel: (idx: number) => void;
};

// 위: 과정 칩(가로로 밀어서 볼 수 있음), 아래: 그 과정의 레벨 번호 칸
export function CoursePicker({ courseNames, courseIdx, levelCount, levelIdx, onCourse, onLevel }: Props) {
  return (
    <div className={styles.picker}>
      <div className={styles.chips} role="group" aria-label="과정">
        {courseNames.map((name, i) => (
          <button key={name} type="button" className={i === courseIdx ? `${styles.chip} ${styles.on}` : styles.chip}
            aria-pressed={i === courseIdx} onClick={() => onCourse(i)} lang="ko">
            {name}
          </button>
        ))}
      </div>
      <div className={styles.levels} role="group" aria-label="레벨"
        style={{ gridTemplateColumns: `repeat(${levelCount}, 1fr)` }}>
        {Array.from({ length: levelCount }, (_, i) => (
          <button key={i} type="button" className={i === levelIdx ? `${styles.level} ${styles.on}` : styles.level}
            aria-pressed={i === levelIdx} aria-label={`레벨 ${i + 1}`} onClick={() => onLevel(i)}>
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
