import { useEffect, useState, type ReactNode } from 'react';
import { SWIPE_ACTION_WIDTH } from './swipeGesture';
import styles from './SwipeRow.module.css';
import { useSwipeRow } from './useSwipeRow';

export type SwipeAction = {
  key: string;
  label: string;
  icon: ReactNode;
  danger?: boolean;
  accent?: boolean; // 앱의 주 버튼(파란색)과 같은 색으로 칠한다
  confirmLabel?: string; // 있으면 한 번 눌러 이 글자로 바뀐 뒤, 한 번 더 눌러야 실행 (삭제 2단계, 사용자 결정 3)
  onClick: () => void;
};

type Props = {
  actions: SwipeAction[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  swipeEnabled?: boolean;
  onLongPress?: () => void;
  shifted?: boolean; // 고르기 모드: 카드가 오른쪽으로 살짝 밀리고 왼쪽에 lead가 보인다
  lead?: ReactNode;
  children: ReactNode;
};

// 보관함·단어장 줄: 왼쪽으로 밀면 오른쪽 아래에 숨은 버튼이 나온다 (디자인 v2 09·10)
export function SwipeRow({ actions, open, onOpenChange, swipeEnabled = true, onLongPress, shifted, lead, children }: Props) {
  const width = actions.length * SWIPE_ACTION_WIDTH;
  const { offset, dragging, handlers } = useSwipeRow({ width, open, onOpenChange, swipeEnabled, onLongPress });
  const [armed, setArmed] = useState<string | null>(null);
  useEffect(() => { if (!open) setArmed(null); }, [open]);
  const shown = open || dragging;
  return (
    <li className={styles.row}>
      <div className={styles.actions} style={{ width }} aria-hidden={!open}>
        {actions.map((a) => {
          const isArmed = armed === a.key;
          return (
            <button key={a.key} type="button" tabIndex={open ? 0 : -1} style={{ visibility: shown ? 'visible' : 'hidden' }}
              className={`${styles.action} ${a.danger ? styles.danger : ''} ${a.accent ? styles.accent : ''}${isArmed ? styles.armed : ''}`}
              onClick={() => { if (a.confirmLabel && !isArmed) setArmed(a.key); else a.onClick(); }}>
              {a.icon}<span>{isArmed ? a.confirmLabel : a.label}</span>
            </button>
          );
        })}
      </div>
      {shifted && <div className={styles.lead}>{lead}</div>}
      <div className={`${styles.content} ${dragging ? '' : styles.settle} ${shifted ? styles.shifted : ''}`}
        style={{ transform: `translateX(${offset}px)` }} {...handlers}>
        {children}
      </div>
    </li>
  );
}
