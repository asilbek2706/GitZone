'use client';

import Link from 'next/link';
import { Button, buttonClass } from '@/components/ui/Button';
import { TigerLogo } from '@/components/brand/TigerLogo';

interface Props { title: string; message: string; onRetry?: () => void }

export function ErrorFallback({ title, message, onRetry }: Props) {
  return (
    <div role="alert" style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
      <div style={{ display: 'grid', gap: 16, justifyItems: 'center', maxWidth: 420 }}>
        <TigerLogo size={96} decorative />
        <h1 style={{ fontSize: 28 }}>{title}</h1>
        <p style={{ color: 'var(--muted)' }}>{message}</p>
        <div style={{ display: 'flex', gap: 12 }}>
          {onRetry && <Button variant="primary" onClick={onRetry}>Qayta urinish</Button>}
          <Link href="/" className={buttonClass('secondary')}>Bosh sahifa</Link>
        </div>
      </div>
    </div>
  );
}
