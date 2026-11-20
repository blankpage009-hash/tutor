import { IconMic, IconStop } from './icons/icons';
import styles from './MicButton.module.css';

type Props = {
  listening: boolean; disabled?: boolean; status: string; onClick: () => void;
  // 'label' = 디자인 v2의 작은 영문 대문자 라벨(LISTENING… 등). 아직 옛 모양인 화면은 기본값 그대로
  tone?: 'text' | 'label';
};

// handoff.md MicButton: 아래에 상태 문구를 꼭 붙인다
export function MicButton({ listening, disabled, status, onClick, tone = 'text' }: Props) {
  return (
    // 라벨 모양일 때는 듣는 중 숨 쉬는 고리(마이크 밖으로 약 13px)와 겹치지 않게 더 띄운다 (사용자 요청 2026-11-20)
    <div className={`${styles.wrap} ${tone === 'label' ? styles.wrapLabel : ''}`}>
      <button type="button" onClick={onClick} disabled={disabled}
        className={`${styles.mic} ${listening ? styles.listening : ''}`}
        aria-label={listening ? '듣기 멈추기' : '말하기 시작'} aria-pressed={listening}>
        {listening ? <IconStop /> : <IconMic />}
      </button>
      <p className={tone === 'label' ? styles.label : styles.status} lang={tone === 'label' ? 'en' : 'ko'} aria-live="polite">
        {status}
      </p>
    </div>
  );
}
