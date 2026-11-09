import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';
import styles from './ui.module.scss';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

/** Link (<a>) ni tugma ko'rinishida chiqarish uchun: <Link className={buttonClass('primary')}> */
export const buttonClass = (variant: ButtonVariant = 'secondary', fullWidth = false) =>
  cn(styles.btn, variant !== 'secondary' && styles[variant], fullWidth && styles.full);

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', loading = false, fullWidth = false, disabled, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonClass(variant, fullWidth), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner size={16} label="Yuklanmoqda" />}
      {children}
    </button>
  );
});
