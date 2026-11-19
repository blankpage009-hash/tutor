import { Link } from 'react-router-dom';
import { IconSettings } from '../components/icons/icons';
import { ScreenHeader } from '../components/ScreenHeader';
import { TwoColumn } from '../components/TwoColumn';
import { useProgressMap } from './courses/useProgressMap';
import { dateLabel } from './home/dateLabel';
import { ResumeCard } from './home/ResumeCard';
import { ReviewTiles } from './home/ReviewTiles';
import { TodayCard } from './home/TodayCard';
import { useNewResume } from './home/useNewResume';
import styles from './HomeScreen.module.css';

// 디자인 v2 홈: 날짜 라벨 + 제목(설정 아이콘), 연속일·목표 막대, 이어 할 레슨 카드, 복습 칸 2개.
// 아이패드에서는 왼쪽에 레슨 카드, 오른쪽에 복습 칸
export function HomeScreen() {
  const progress = useProgressMap();
  const resume = useNewResume(progress);
  const settings = (
    <Link to="/settings" className={styles.iconBtn} aria-label="설정">
      <IconSettings />
    </Link>
  );
  return (
    <>
      <ScreenHeader eyebrow={dateLabel(new Date())} title="Today's Practice" action={settings} />
      <TodayCard />
      <TwoColumn list={<ResumeCard resume={resume} />}>
        <ReviewTiles />
      </TwoColumn>
    </>
  );
}
