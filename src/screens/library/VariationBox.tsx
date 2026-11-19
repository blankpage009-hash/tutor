import { useEffect, useState } from 'react';
import { Button } from '../../components/Button';
import { callGemini, GeminiError } from '../../gemini/geminiClient';
import { parseVariations, variationRequest, type Variation } from '../../gemini/tasks';
import { stopAudio } from '../../speech/audioPlayer';
import { getLastSpeakInfo, isSpeakSupported, speakText, warmUpVoices } from '../../speech/speakText';
import styles from './Library.module.css';

type Props = { geminiKey: string; en: string; ko?: string };

// 저장 문장 한 줄 아래의 "변형 더 만들기"(Gemini 키가 있을 때만 그려진다). 만든 문장은 글자로만 보여 준다
export function VariationBox({ geminiKey, en, ko }: Props) {
  const [items, setItems] = useState<Variation[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const make = async () => {
    setBusy(true);
    setError(null);
    try {
      setItems(parseVariations(await callGemini(geminiKey, variationRequest(en, ko))));
    } catch (e) {
      setError(e instanceof GeminiError ? e.message : '만들지 못했어요. 다시 해 주세요.');
    } finally {
      setBusy(false);
    }
  };
  // 변형 문장은 음성 파일이 없어 아이폰 내장 음성으로 읽는다. 탭 처리 함수에서 바로 불러야 iOS가 허락한다
  const canSpeak = isSpeakSupported();
  useEffect(warmUpVoices, []); // 목소리 목록을 미리 불러 둔다(아이폰은 처음엔 비어 있음)
  const [speakError, setSpeakError] = useState<string | null>(null);
  const listen = async (text: string) => {
    stopAudio();
    setSpeakError(null);
    const r = await speakText(text);
    // 소리가 안 나는 원인을 찾는 동안 결과를 화면에 보여 준다 (원인을 잡으면 지운다)
    const i = getLastSpeakInfo();
    const detail = i ? `[진단] 결과 ${i.result} · ${i.ms}ms · 시작신호 ${i.started ? '옴' : '없음'} · 목소리 ${i.voicesAtStart}→${i.voices}개 · 선택 ${i.picked ?? '기기 기본'}` : '';
    setSpeakError(r === 'failed' ? `소리를 내지 못했어요. 무음 모드나 볼륨을 확인해 주세요. ${detail}` : detail || null);
  };
  return (
    <>
      <div className={styles.actions}>
        <Button size="sm" disabled={busy} onClick={make}>{busy ? '만드는 중…' : items ? '다시 만들기' : '변형 더 만들기'}</Button>
      </div>
      {error && <p className={styles.confirm} lang="ko">{error}</p>}
      {items && (
        <ul className={styles.confirm}>
          {items.map((v) => (
            <li key={v.en} style={{ marginBottom: 'var(--space-2)' }}>
              <span lang="en">{v.en}</span>
              {v.ko && <span lang="ko" style={{ display: 'block', color: 'var(--ink-muted)' }}>{v.ko}</span>}
              {canSpeak && <Button size="sm" variant="ghost" onClick={() => listen(v.en)}>듣기</Button>}
            </li>
          ))}
        </ul>
      )}
      {speakError && <p className={styles.confirm} lang="ko">{speakError}</p>}
    </>
  );
}
