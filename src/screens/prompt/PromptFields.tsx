import { SegmentedControl } from '../../components/SegmentedControl';
import type { Correction, FeedbackLang } from '../../prompt/buildPrompt';
import styles from './Prompt.module.css';

export type Draft = {
  situation: string;
  partnerRole: string;
  myRole: string;
  correction: Correction;
  feedbackLang: FeedbackLang;
};

type Props = { draft: Draft; onChange: (patch: Partial<Draft>) => void };

const CORRECTION_OPTIONS: { value: Correction; label: string }[] = [
  { value: 'later', label: '끝나고 한꺼번에' },
  { value: 'now', label: '그때그때 바로' }
];

const FEEDBACK_OPTIONS: { value: FeedbackLang; label: string }[] = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: '영어' }
];

type TextProps = { label: string; value: string; placeholder: string; onChange: (v: string) => void };

function TextField({ label, value, placeholder, onChange }: TextProps) {
  return (
    <label className={styles.field}>
      <span className={styles.label} lang="ko">{label}</span>
      <input className={styles.input} type="text" value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function PromptFields({ draft, onChange }: Props) {
  return (
    <>
      <TextField label="상황" value={draft.situation} placeholder="카페에서 커피 주문하기"
        onChange={(v) => onChange({ situation: v })} />
      <TextField label="상대 역할" value={draft.partnerRole} placeholder="바리스타"
        onChange={(v) => onChange({ partnerRole: v })} />
      <TextField label="내 역할" value={draft.myRole} placeholder="손님"
        onChange={(v) => onChange({ myRole: v })} />
      <div className={styles.field}>
        <span className={styles.label} lang="ko">틀렸을 때 고쳐 주는 방식</span>
        <SegmentedControl label="교정 방식" options={CORRECTION_OPTIONS} value={draft.correction}
          onChange={(v) => onChange({ correction: v })} />
      </div>
      <div className={styles.field}>
        <span className={styles.label} lang="ko">피드백 언어</span>
        <SegmentedControl label="피드백 언어" options={FEEDBACK_OPTIONS} value={draft.feedbackLang}
          onChange={(v) => onChange({ feedbackLang: v })} />
      </div>
    </>
  );
}
