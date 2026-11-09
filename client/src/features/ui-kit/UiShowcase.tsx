'use client';

import { Checkbox } from '@/components/form/Checkbox';
import { Field } from '@/components/form/Field';
import { Input } from '@/components/form/Input';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/hooks/useToast';

export function UiShowcase() {
  const toast = useToast();
  const row = { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' } as const;

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <h1 style={{ fontSize: 34 }}>Komponentlar</h1>
      <Card style={{ display: 'grid', gap: 16 }}>
        <h2 style={{ fontSize: 20 }}>Tugmalar</h2>
        <div style={row}>
          <Button variant="primary">Asosiy</Button>
          <Button>Ikkinchi darajali</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">O‘chirish</Button>
          <Button variant="primary" loading>Yuklanmoqda</Button>
          <Button disabled>Nofaol</Button>
        </div>
      </Card>
      <Card style={{ display: 'grid', gap: 16 }}>
        <h2 style={{ fontSize: 20 }}>Forma</h2>
        <Field label="Email" hint="Hisobingiz emaili">{(p) => <Input type="email" placeholder="siz@misol.uz" {...p} />}</Field>
        <Field label="Parol" error="Parol kamida 8 ta belgidan iborat bo‘lishi kerak">{(p) => <Input type="password" {...p} />}</Field>
        <Checkbox label="Meni eslab qol" />
      </Card>
      <Card style={{ display: 'grid', gap: 16 }}>
        <h2 style={{ fontSize: 20 }}>Holatlar</h2>
        <div style={row}>
          <Badge>Neutral</Badge><Badge tone="accent">Accent</Badge><Badge tone="jade">Jade</Badge><Badge tone="danger">Danger</Badge>
          <Spinner />
        </div>
        <Skeleton height={20} />
        <div style={row}>
          <Button onClick={() => toast.success('Saqlandi', 'O‘zgarishlar muvaffaqiyatli saqlandi.')}>Success toast</Button>
          <Button onClick={() => toast.error('Xatolik', 'Amalni bajarib bo‘lmadi.')}>Error toast</Button>
          <Button onClick={() => toast.info('Ma’lumot')}>Info toast</Button>
        </div>
      </Card>
    </div>
  );
}
