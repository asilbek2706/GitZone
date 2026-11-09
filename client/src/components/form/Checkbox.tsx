import type { InputHTMLAttributes } from 'react';
import styles from '@/components/ui/ui.module.scss';

export function Checkbox({ label, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={styles.check}>
      <input type="checkbox" {...rest} />
      <span>{label}</span>
    </label>
  );
}
