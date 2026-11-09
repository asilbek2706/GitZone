'use client';

import { Button } from '@/components/ui/Button';
import { useLogoutMutation } from '@/features/auth/authApi';
import { useAppSelector } from '@/store/hooks';
import styles from './UserMenu.module.scss';

export function UserMenu() {
  const user = useAppSelector((s) => s.auth.user);
  const [logout, { isLoading }] = useLogoutMutation();
  if (!user) return null;
  return (
    <div className={styles.menu}>
      <span className={styles.avatar} aria-hidden="true">{user.username.slice(0, 1).toUpperCase()}</span>
      <span className={styles.name}>{user.username}</span>
      <Button variant="ghost" loading={isLoading} onClick={() => logout()}>Chiqish</Button>
    </div>
  );
}
