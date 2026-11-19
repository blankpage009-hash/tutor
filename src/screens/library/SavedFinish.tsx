import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import styles from '../shadowing/Shadowing.module.css';

// 보관함 연습을 끝까지 했을 때: 수업 진도와 상관없으니 보관함으로만 돌려보낸다
export function SavedFinish({ total }: { total: number }) {
  const nav = useNavigate();
  return (
    <>
      <p className={styles.pass} lang="ko">저장한 문장 {total}개를 모두 연습했어요!</p>
      <Button variant="primary" block onClick={() => nav('/library')}>보관함으로 돌아가기</Button>
    </>
  );
}
