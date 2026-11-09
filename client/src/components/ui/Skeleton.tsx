import styles from './ui.module.scss';

export function Skeleton({ width = '100%', height = 16 }: { width?: number | string; height?: number | string }) {
  return <div className={styles.skeleton} style={{ width, height }} aria-hidden="true" />;
}
