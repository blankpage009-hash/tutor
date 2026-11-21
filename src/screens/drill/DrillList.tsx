import { useState, type MouseEvent } from 'react';
import { Button } from '../../components/Button';
import { IconBookmark, IconPlay } from '../../components/icons/icons';
import { TapText } from '../../components/wordPicker/TapText';
import type { NewLesson } from '../../content/lessonTypes';
import { drillSaveId } from '../../drillPlan';
import { LessonStepBar } from '../newLesson/LessonStepBar';
import styles from './Drill.module.css';

type Props = {
  lesson: NewLesson;
  fill: number; // 위쪽 단계 막대의 드릴 칸 (지나간 회차 비율)
  resume: boolean;
  onStart: () => void;
  onRestart: () => void;
  saved: Set<string>; // 보관함에 저장된 문장 id 모음
  saveError: string | null;
  onToggleSave: (saveId: string) => void;
};

// 드릴 첫 화면: 연습할 문장 6개만 보여 주고, 시작 버튼을 눌러야 카드 화면이 나온다 (사용자 요청 2026-11-19).
// 영어를 여기서 보여 줘도 되는 이유: 기억·상황 회차의 "정답 가리기"는 카드 화면에서만 필요하다
export function DrillList({ lesson, fill, resume, onStart, onRestart, saved, saveError, onToggleSave }: Props) {
  const rounds = lesson.drillStages.reduce((n, s) => n + s.reps.length, 0);
  // 한글 번역은 기본 숨김, 카드를 탭한 문장만 펼친다 (사용자 요청 2026-11-21)
  const [shownKo, setShownKo] = useState<Set<number>>(new Set());
  const toggleKo = (id: number, e: MouseEvent<HTMLElement>) => {
    // 단어(저장 창)·북마크 버튼을 누른 경우는 카드 탭으로 치지 않는다
    if ((e.target as HTMLElement).closest('button')) return;
    setShownKo((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  };
  return (
    <div className={styles.page}>
      <LessonStepBar lessonId={lesson.lessonId} current="drill" fill={fill} />
      <header className={styles.head}>
        <p className={styles.title} lang="ko">{lesson.lessonTitle}</p>
        <span className={styles.label}>{lesson.drills.length} Sentences · {rounds} Rounds</span>
      </header>
      <ol className={styles.list}>
        {lesson.drills.map((d) => {
          const saveId = drillSaveId(lesson.lessonId, d.id);
          const on = saved.has(saveId);
          return (
            <li key={d.id} className={`${styles.row} ${styles.tappable}`} onClick={(e) => toggleKo(d.id, e)}>
              <span className={styles.no}>{String(d.id).padStart(2, '0')}</span>
              <div className={styles.text}>
                <p className={styles.en} lang="en"><TapText text={d.en} source={{ id: saveId, en: d.en, ko: d.ko }} /></p>
                {shownKo.has(d.id) && <p className={styles.ko} lang="ko">{d.ko}</p>}
              </div>
              {/* 카드 화면의 북마크와 같은 스위치: 누를 때마다 저장 ↔ 해제 */}
              <button type="button" className={styles.save} aria-pressed={on} onClick={() => onToggleSave(saveId)}
                aria-label={on ? '저장 해제' : '문장 저장'}><IconBookmark filled={on} /></button>
            </li>
          );
        })}
      </ol>
      {saveError && <p className={styles.saveError} lang="ko" role="alert">{saveError}</p>}
      {/* 하다 만 기록이 있으면 처음부터/이어서를 고르게 한다 (사용자 요청 2026-11-19, 버튼은 영문) */}
      {resume ? (
        <div className={styles.actions}>
          <Button block onClick={onRestart}>Restart</Button>
          <Button variant="primary" block onClick={onStart}><IconPlay />Continue</Button>
        </div>
      ) : (
        <Button variant="primary" block className={styles.bottom} onClick={onStart}><IconPlay />Start Drill</Button>
      )}
    </div>
  );
}
