import Link from 'next/link';
import { TigerLogo } from '@/components/brand/TigerLogo';
import { buttonClass } from '@/components/ui/Button';

export default function HomePage() {
  return (
    <main id="main" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
      <div style={{ display: 'grid', gap: 20, justifyItems: 'center', maxWidth: 560 }}>
        <TigerLogo size={200} />
        <h1 style={{ fontSize: 'clamp(36px, 7vw, 60px)', lineHeight: 1.05 }}>
          Kod yozing. <span style={{ color: 'var(--accent)' }}>Hududingizni</span> egallang.
        </h1>
        <p style={{ color: 'var(--muted)' }}>GitZone frontend poydevori tayyor. Bosh sahifa keyingi fazalarda to‘ldiriladi.</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/dashboard" className={buttonClass('primary')}>Bosh panel</Link>
          <Link href="/ui" className={buttonClass('secondary')}>Komponentlar</Link>
        </div>
      </div>
    </main>
  );
}
