import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import styles from './ui.module.scss';

const TONES = { neutral: styles.bNeutral, accent: styles.bAccent, jade: styles.bJade, danger: styles.bDanger };

export function Badge({ tone = 'neutral', children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return <span className={cn(styles.badge, TONES[tone])}>{children}</span>;
}
