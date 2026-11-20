import { Navigate, useParams } from 'react-router-dom';

// 옛 주소 /curriculum/:levelKey. 설명·대화문·롤플레이 화면의 "뒤로" 링크가 아직 이 주소를 쓰므로
// 지우지 않고 코스 탭의 그 레벨로 보낸다 (5·6단계에서 그 화면들을 바꿀 때 함께 정리)
export function LevelRedirect() {
  const { levelKey = '' } = useParams();
  return <Navigate to={`/courses?level=${encodeURIComponent(levelKey)}`} replace />;
}
