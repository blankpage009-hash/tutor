import { Button } from '../../components/Button';
import styles from './SttLab.module.css';

type Props = {
  busy: boolean;
  hasTutorAudio: boolean;
  onReopen: () => void;
  onReopenWithAudio: () => void;
  onKeepOpen: () => void;
};

// 시험 A: 마이크만 (인식 엔진 없이 소리가 들어오는지)
export function MicSection(p: Props) {
  return (
    <section className={styles.section}>
      <h2 className={styles.heading} lang="ko">시험 A · 마이크만</h2>
      <p className={styles.note} lang="ko">
        버튼을 누른 뒤 약 15초 동안 계속 아무 말이나 해 주세요. 3초마다 “최대 소리”가 기록돼요.
      </p>
      <div className={styles.buttons}>
        <Button size="sm" disabled={p.busy} onClick={p.onReopen}>A1 마이크 5번 열었다 닫기</Button>
        <Button size="sm" disabled={p.busy || !p.hasTutorAudio} onClick={p.onReopenWithAudio}>A2 사이에 튜터 음성 재생</Button>
        <Button size="sm" disabled={p.busy || !p.hasTutorAudio} onClick={p.onKeepOpen}>A3 마이크 계속 켜 두기</Button>
      </div>
    </section>
  );
}
