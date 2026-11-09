import { SessionsCard } from './SessionsCard';
import { TokensCard } from './TokensCard';
import { TwoFactorCard } from './TwoFactorCard';
import styles from './settings.module.scss';

export function SecuritySettings() {
  return (
    <div className={styles.stack}>
      <h1 style={{ fontSize: 34 }}>Xavfsizlik</h1>
      <TwoFactorCard />
      <SessionsCard />
      <TokensCard />
    </div>
  );
}
