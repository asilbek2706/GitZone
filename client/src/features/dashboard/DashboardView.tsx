'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/hooks/useToast';
import { getErrorMessage } from '@/lib/api/errors';
import { useGetHealthQuery } from '@/lib/api/healthApi';

export function DashboardView() {
  const toast = useToast();
  const { data, error, isLoading, isFetching, refetch } = useGetHealthQuery();

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <h1 style={{ fontSize: 34 }}>Bosh panel</h1>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <strong>Backend holati</strong>
            {isLoading ? <Skeleton width={160} height={20} /> : error ? (
              <span role="alert" style={{ color: 'var(--danger)' }}>{getErrorMessage(error)}</span>
            ) : (
              <Badge tone="jade">{data?.status ?? 'OK'}</Badge>
            )}
          </div>
          <Button loading={isFetching} onClick={() => { refetch(); toast.info('Tekshirilmoqda…'); }}>Qayta tekshirish</Button>
        </div>
      </Card>
    </div>
  );
}
