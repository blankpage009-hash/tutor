import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'sm';
  block?: boolean;
};

// handoff.md Button: primary · secondary · ghost / 기본 52px, sm 44px / block(가로 꽉)
export function Button({ variant = 'secondary', size = 'md', block, className, ...rest }: Props) {
  const cls = [styles.btn, styles[variant], size === 'sm' && styles.sm, block && styles.block, className]
    .filter(Boolean)
    .join(' ');
  return <button type="button" className={cls} {...rest} />;
}
