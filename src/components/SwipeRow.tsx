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
  // 오른쪽으로 밀면 왼쪽에 나오는 버튼 (단어장의 Know/Don't Know). 안 주면 왼쪽 밀기만 된다
  leftActions?: SwipeAction[];
  leftOpen?: boolean;
  onLeftOpenChange?: (open: boolean) => void;
  swipeEnabled?: boolean;
  onLongPress?: () => void;
  shifted?: boolean; // 고르기 모드: 카드가 오른쪽으로 살짝 밀리고 왼쪽에 lead가 보인다
  lead?: ReactNode;
  children: ReactNode;
};

// 보관함·단어장 줄: 왼쪽으로 밀면 오른쪽 아래에 숨은 버튼이 나온다 (디자인 v2 09·10)
export function SwipeRow({
  actions, open, onOpenChange, leftActions = [], leftOpen = false, onLeftOpenChange, swipeEnabled = true, onLongPress, shifted, lead, children
}: Props) {
  const width = actions.length * SWIPE_ACTION_WIDTH;
  const leftWidth = leftActions.length * SWIPE_ACTION_WIDTH;
  const { offset, dragging, handlers } = useSwipeRow({ width, open, onOpenChange, leftWidth, leftOpen, onLeftOpenChange, swipeEnabled, onLongPress });
  const [armed, setArmed] = useState<string | null>(null);
  useEffect(() => { if (!open) setArmed(null); }, [open]);
  const renderButtons = (list: SwipeAction[], isOpen: boolean, visible: boolean) => list.map((a) => {
    const isArmed = armed === a.key;
    return (
      <button key={a.key} type="button" tabIndex={isOpen ? 0 : -1} style={{ visibility: visible ? 'visible' : 'hidden' }}
        className={`${styles.action} ${a.danger ? styles.danger : ''} ${a.accent ? styles.accent : ''}${isArmed ? styles.armed : ''}`}
        onClick={() => { if (a.confirmLabel && !isArmed) setArmed(a.key); else a.onClick(); }}>
        {a.icon}<span>{isArmed ? a.confirmLabel : a.label}</span>
      </button>
    );
  });
  // 밀리는 방향에 맞는 쪽 버튼만 보인다 (반대쪽 버튼이 카드 틈으로 비치지 않게)
  const showRight = open || (dragging && offset < 0);
  const showLeft = leftOpen || (dragging && offset > 0);
  return (
    <li className={styles.row}>
      <div className={styles.actions} style={{ width }} aria-hidden={!open}>{renderButtons(actions, open, showRight)}</div>
      {leftWidth > 0 && (
        <div className={styles.actionsLeft} style={{ width: leftWidth }} aria-hidden={!leftOpen}>{renderButtons(leftActions, leftOpen, showLeft)}</div>
      )}
      {shifted && <div className={styles.lead}>{lead}</div>}
      <div className={`${styles.content} ${dragging ? '' : styles.settle} ${shifted ? styles.shifted : ''}`}
        style={{ transform: `translateX(${offset}px)` }} {...handlers}>
        {children}
      </div>
    </li>
  );
}
