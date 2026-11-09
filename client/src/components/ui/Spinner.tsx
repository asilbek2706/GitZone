import styles from './ui.module.scss';

export function Spinner({ size = 20, label = 'Yuklanmoqda' }: { size?: number; label?: string }) {
  return (
    <svg className={styles.spinner} width={size} height={size} viewBox="0 0 24 24" fill="none" role="status" aria-label={label}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function PageLoader({ label = 'Yuklanmoqda…' }: { label?: string }) {
  return (
    <div className={styles.loader} role="status" aria-live="polite">
      <Spinner size={24} label={label} />
      <span>{label}</span>
    </div>
  );
}
