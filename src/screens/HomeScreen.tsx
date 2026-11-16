import { Link } from 'react-router-dom';
import { ScreenHeader } from '../components/ScreenHeader';
import { TwoColumn } from '../components/TwoColumn';
import { SCREENS } from '../routes';
import styles from './HomeScreen.module.css';

export function HomeScreen() {
  return (
    <>
      <ScreenHeader eyebrow="오늘" title="오늘의 연습" />
      <TwoColumn list={<p className={styles.note} lang="ko">오늘 요약은 Phase 7에서 만듭니다.</p>}>
        <p className={styles.note} lang="ko">이어서 할 수업과 복습 문장은 Phase 7에서 만듭니다.</p>
        {/* 뼈대 확인용: 연습 화면들은 탭바에 없으므로 여기서 이동해 본다. Phase 5에서 진짜 진입로로 대체 */}
        <h2 className={styles.sub}>임시 이동 목록 (뼈대 확인용)</h2>
        <ul className={styles.list}>
          {/* 임시 검증 화면 (Phase 4 연장). 화면 13개 목록(SCREENS)에는 넣지 않는다 — 확인이 끝나면 지울 것이라서 */}
          <li>
            <Link to="/lab/stt" className={styles.link}>음성 인식 시험 (임시)</Link>
          </li>
          {SCREENS.map((s) => (
            <li key={s.id}>
              <Link to={s.path} className={styles.link}>{s.title}</Link>
            </li>
          ))}
        </ul>
      </TwoColumn>
    </>
  );
}
