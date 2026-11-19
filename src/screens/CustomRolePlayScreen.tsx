import { Navigate } from 'react-router-dom';
import { RolePlayBody, type RolePlayView } from './NewRolePlayScreen';
import { getCustomRolePlay } from './roleplay/customStore';

// Gemini가 만든 새 상황(/roleplay/custom). 상대 줄은 음성 없이 글자로만 보여 준다.
// 앱을 새로 열면 만든 상황이 사라지므로 목록으로 돌려보낸다
export function CustomRolePlayScreen() {
  const rp = getCustomRolePlay();
  if (!rp) return <Navigate to="/roleplay" replace />;
  const view: RolePlayView = {
    lessonId: 'custom',
    levelCode: null,
    lessonTitle: rp.title,
    level: '새 상황',
    unit: 0,
    rolePlay: { situation: rp.situation, partnerRole: rp.partnerRole, lines: rp.lines, passRule: '' }
  };
  return <RolePlayBody lesson={view} />;
}
