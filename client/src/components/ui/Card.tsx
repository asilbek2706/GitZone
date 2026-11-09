import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import styles from './ui.module.scss';

export function Card({ padded = true, className, ...rest }: HTMLAttributes<HTMLDivElement> & { padded?: boolean }) {
  return <div className={cn(styles.card, padded && styles.pad, className)} {...rest} />;
}
