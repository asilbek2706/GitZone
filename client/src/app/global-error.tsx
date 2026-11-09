'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="uz">
      <body style={{ margin: 0, background: '#080c0b', color: '#edf3ef', fontFamily: 'system-ui, sans-serif', display: 'grid', placeItems: 'center', minHeight: '100vh', textAlign: 'center' }}>
        <div role="alert" style={{ display: 'grid', gap: 12, padding: 24 }}>
          <h1>Jiddiy xatolik</h1>
          <p style={{ color: '#8fa39a' }}>Ilovani qayta yuklab ko‘ring.</p>
          <button type="button" onClick={reset} style={{ padding: '10px 16px', borderRadius: 12, border: 0, background: '#ffb020', color: '#1a1200', fontWeight: 600, cursor: 'pointer' }}>
            Qayta urinish
          </button>
        </div>
      </body>
    </html>
  );
}
