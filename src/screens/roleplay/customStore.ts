import type { GeneratedRolePlay } from '../../gemini/tasks';

// Gemini가 만든 새 상황은 메모리에만 둔다. 저장하려면 DB 표를 늘려야 하고, 앱을 다시 열면 새로 만들면 된다
let current: GeneratedRolePlay | null = null;

export function getCustomRolePlay(): GeneratedRolePlay | null {
  return current;
}

export function setCustomRolePlay(rp: GeneratedRolePlay): void {
  current = rp;
}
