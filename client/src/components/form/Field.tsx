import { useId, type ReactNode } from 'react';
import styles from '@/components/ui/ui.module.scss';

interface ControlProps { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }

/**
 * Label + hint + xato matnini boshqaruv elementiga to'g'ri bog'laydi (a11y).
 * <Field label="Email" error={err}>{(p) => <Input type="email" {...p} />}</Field>
 */
export function Field({ label, hint, error, children }: {
  label: string; hint?: string; error?: string; children: (props: ControlProps) => ReactNode;
}) {
  const id = useId();
  const describedBy = [error && `${id}-err`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && <span id={`${id}-hint`} className={styles.hint}>{hint}</span>}
      {error && <span id={`${id}-err`} role="alert" className={styles.error}>{error}</span>}
    </div>
  );
}
