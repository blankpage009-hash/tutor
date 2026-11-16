import type { Model } from 'vosk-browser';
import { useEffect, useRef, useState } from 'react';
import { contentUrl, loadLesson } from '../content/loader';
import type { Sentence } from '../content/types';
import { setAudioDebug, unlockAudio } from '../speech/audioPlayer';
import { setAudioSessionEnabled } from '../speech/audioSession';
import { loadVoskModel } from '../speech/voskEngine';
import { EngineSection, type ModelState } from './sttlab/EngineSection';
import { LabLog } from './sttlab/LabLog';
import { MicSection } from './sttlab/MicSection';
import { runKeepOpenTest, runReopenTest } from './sttlab/micTests';
import styles from './sttlab/SttLab.module.css';
import { useLabLog } from './sttlab/useLabLog';
import { runContinuousTest, runSpeakTest } from './sttlab/voskTests';

// 임시 검증 화면 (Phase 4 연장 1단계): 아이폰 내장 음성 인식 대신 앱 안 인식 엔진으로 바꿔도 되는지
// 실제 아이폰에서 확인한다. 이 화면에서는 내장 인식(SpeechRecognition)을 한 번도 부르지 않는다.
// 쉐도잉 화면을 새 엔진으로 바꾸고 나면 이 화면은 지운다.

function useLabSentences() {
  const [sentences, setSentences] = useState<Sentence[]>([]);
  useEffect(() => {
    loadLesson('beg-01').then((r) => setSentences(r.lesson.sentences)).catch(() => undefined);
  }, []);
  return sentences;
}

function useVoskModel(log: (m: string) => void) {
  const [state, setState] = useState<ModelState>('none');
  const model = useRef<Model | null>(null);
  const load = async () => {
    setState('loading');
    const began = performance.now();
    log('인식 엔진 준비 시작');
    try {
      model.current = await loadVoskModel();
      log(`인식 엔진 준비 끝 (${((performance.now() - began) / 1000).toFixed(1)}초)`);
      setState('ready');
    } catch (e) {
      log(`인식 엔진 준비 실패: ${String(e)}`);
      setState('error');
    }
  };
  return { state, model, load };
}

export function SttLabScreen() {
  const { logs, log, clear, copy } = useLabLog();
  const sentences = useLabSentences();
  const vosk = useVoskModel(log);
  const [busy, setBusy] = useState(false);
  const [useGrammar, setUseGrammar] = useState(true);
  const tutorUrl = sentences[0]?.audio ? contentUrl(sentences[0].audio) : null;

  useEffect(() => {
    // 오디오 세션을 건드리면 마이크가 먹통이 될 수 있어(WebKit 버그 321436 보고) 브라우저 기본값으로 둔다
    setAudioSessionEnabled(false);
    setAudioDebug(log);
  }, [log]);

  // 시험 함수는 탭한 순간에 바로(await 없이) 불러야 한다 — 그 안에서 녹음 장치를 만들기 때문
  const run = (name: string, test: () => Promise<void>) => {
    unlockAudio();
    setBusy(true);
    log(`=== ${name} ===`);
    test().finally(() => setBusy(false));
  };
  const withModel = (name: string, test: (m: Model) => Promise<void>) => {
    const m = vosk.model.current;
    if (m) run(name, () => test(m));
  };

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title} lang="ko">음성 인식 시험 (임시)</h1>
      <MicSection busy={busy} hasTutorAudio={tutorUrl !== null}
        onReopen={() => run('A1 마이크 5번 열었다 닫기', () => runReopenTest(log, null))}
        onReopenWithAudio={() => run('A2 사이에 튜터 음성 재생', () => runReopenTest(log, tutorUrl))}
        onKeepOpen={() => run('A3 마이크 계속 켜 두기', () => runKeepOpenTest(log, tutorUrl ?? ''))} />
      <EngineSection busy={busy} modelState={vosk.state} sentences={sentences}
        useGrammar={useGrammar} onUseGrammar={setUseGrammar} onLoadModel={vosk.load}
        onSpeak={(s) => withModel('B1 문장 말하기', (m) => runSpeakTest(m, s, useGrammar, log))}
        onContinuous={() => withModel('B2 손 안 대고 이어 말하기', (m) => runContinuousTest(m, sentences, useGrammar, log))} />
      <LabLog logs={logs} onCopy={copy} onClear={clear} />
    </div>
  );
}
