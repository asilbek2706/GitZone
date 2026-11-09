import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import styles from '@/components/ui/ui.module.scss';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cn(styles.input, className)} {...rest} />;
});
