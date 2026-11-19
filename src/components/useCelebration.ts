import { useCallback, useEffect, useState } from 'react';

// 단계를 끝낸 순간(done이 거짓 → 참) 축하 화면을 한 번 띄우고, 탭하면 닫는다.
// 다시 연습해서 또 끝내면 또 한 번 뜬다
export function useCelebration(done: boolean) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (done) setShow(true);
  }, [done]);
  const close = useCallback(() => setShow(false), []);
  return { show, close };
}
