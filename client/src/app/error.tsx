'use client';

import { useEffect } from 'react';
import { ErrorFallback } from '@/components/feedback/ErrorFallback';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <ErrorFallback title="Nimadir xato ketdi" message="Kutilmagan xatolik yuz berdi. Qayta urinib ko‘ring." onRetry={reset} />;
}
