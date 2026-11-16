import { BackLink } from './BackLink';
import { ScreenHeader } from './ScreenHeader';
import styles from './ScreenPlaceholder.module.css';

type Props = { title: string; phase: string; backToMore?: boolean };

// Phase 3은 "빈 방"만 만든다. 진짜 내용은 각 Phase에서 이 컴포넌트를 갈아 끼운다.
export function ScreenPlaceholder({ title, phase, backToMore }: Props) {
  return (
    <>
      {backToMore && <BackLink to="/more" label="더보기" />}
      <ScreenHeader eyebrow="준비 중" title={title} />
      <p className={styles.note} lang="ko">{phase}에서 만듭니다.</p>
    </>
  );
}
