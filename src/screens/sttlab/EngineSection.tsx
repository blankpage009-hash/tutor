import { Button } from '../../components/Button';
import type { Sentence } from '../../content/types';
import styles from './SttLab.module.css';

export type ModelState = 'none' | 'loading' | 'ready' | 'error';

type Props = {
  busy: boolean;
  modelState: ModelState;
  sentences: Sentence[];
  useGrammar: boolean;
  onUseGrammar: (on: boolean) => void;
  onLoadModel: () => void;
  onSpeak: (s: Sentence) => void;
  onContinuous: () => void;
};

const MODEL_TEXT: Record<ModelState, string> = {
  none: '아직 준비 안 됨',
  loading: '준비 중… 처음에는 약 40MB를 받아서 1~2분 걸릴 수 있어요. 화면을 켜 둔 채 기다려 주세요',
  ready: '준비됨',
  error: '준비 실패 (기록을 확인해 주세요)'
};

// 시험 B: 앱 안 인식 엔진
export function EngineSection(p: Props) {
  const locked = p.busy || p.modelState !== 'ready';
  return (
    <section className={styles.section}>
      <h2 className={styles.heading} lang="ko">시험 B · 앱 안 인식 엔진</h2>
      <div className={styles.buttons}>
        <Button size="sm" disabled={p.busy || p.modelState === 'loading' || p.modelState === 'ready'}
          onClick={p.onLoadModel}>B0 인식 엔진 준비</Button>
      </div>
      <p className={styles.note} lang="ko">엔진 상태: {MODEL_TEXT[p.modelState]}</p>
      <label className={styles.toggle} lang="ko">
        <input type="checkbox" checked={p.useGrammar} onChange={(e) => p.onUseGrammar(e.target.checked)} />
        문장 단어만 허용 (끄면 자유 인식)
      </label>
      <p className={styles.note} lang="ko">B1: 버튼을 누르고 그 문장을 말하세요. 말을 마치면 저절로 끝나요.</p>
      <div className={styles.buttons}>
        {p.sentences.map((s, i) => (
          <Button key={s.id} size="sm" disabled={locked} onClick={() => p.onSpeak(s)}>
            B1 문장 {i + 1}: {s.en}
          </Button>
        ))}
      </div>
      <p className={styles.note} lang="ko">B2: 한 번만 누르면 튜터가 읽고 → 내가 따라 말하기를 3문장 이어서 해요.</p>
      <div className={styles.buttons}>
        <Button size="sm" variant="primary" disabled={locked} onClick={p.onContinuous}>B2 손 안 대고 이어 말하기</Button>
      </div>
    </section>
  );
}
