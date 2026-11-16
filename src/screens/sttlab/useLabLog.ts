import { useCallback, useState } from 'react';

function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return Boolean(nav.standalone) || window.matchMedia('(display-mode: standalone)').matches;
}

// 시험 기록. 사용자가 채팅에 그대로 붙여 넣을 수 있게 글자로 복사한다 (쉐도잉 진단 패널과 같은 방식)
export function useLabLog() {
  const [logs, setLogs] = useState<string[]>([]);
  const log = useCallback((m: string) => {
    const t = new Date().toLocaleTimeString('ko-KR', { hour12: false });
    setLogs((prev) => [...prev, `${t} ${m}`].slice(-300));
  }, []);
  const clear = useCallback(() => setLogs([]), []);
  const copy = useCallback(async () => {
    const head = [`음성 인식 시험 · 홈화면 앱 모드: ${isStandalone() ? '예' : '아니요'}`, `UA: ${navigator.userAgent}`, '---'];
    try {
      await navigator.clipboard.writeText([...head, ...logs].join('\n'));
      return '복사했어요. 채팅창에 붙여 넣어 주세요.';
    } catch {
      return '복사가 안 됐어요. 기록 화면을 스크린샷으로 보내 주세요.';
    }
  }, [logs]);
  return { logs, log, clear, copy };
}
