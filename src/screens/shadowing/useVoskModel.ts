import { useEffect, useState } from 'react';
import type { Model } from 'vosk-browser';
import { loadVoskModel } from '../../speech/voskEngine';

export type VoskModelState = 'off' | 'loading' | 'ready' | 'error';

// 쉐도잉 화면을 열자마자 인식 모델을 불러 둔다. 마이크를 누른 뒤에 받기 시작하면
// 처음 한 번은 1~2분(약 40MB)을 기다려야 해서다. 두 번째부터는 기기에 보관된 것을 1초 안에 연다
export function useVoskModel(enabled: boolean, log: (m: string) => void) {
  const [model, setModel] = useState<Model | null>(null);
  const [state, setState] = useState<VoskModelState>(enabled ? 'loading' : 'off');
  useEffect(() => {
    if (!enabled) {
      setState('off');
      return;
    }
    let alive = true;
    const began = performance.now();
    setState('loading');
    loadVoskModel().then(
      (m) => {
        if (!alive) return;
        log(`앱 인식 엔진 준비 끝 (${((performance.now() - began) / 1000).toFixed(1)}초)`);
        setModel(m);
        setState('ready');
      },
      (e) => {
        if (!alive) return;
        log(`앱 인식 엔진 준비 실패: ${String(e)}`);
        setState('error');
      }
    );
    return () => { alive = false; };
  }, [enabled, log]);
  return { model: state === 'ready' ? model : null, state };
}
