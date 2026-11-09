'use client';

import { useEffect, useState } from 'react';
import { Checkbox } from '@/components/form/Checkbox';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { copyText, downloadText } from '@/lib/clipboard';
import styles from './settings.module.scss';

/** Tiklash kodlari faqat shu komponent holatida turadi (Redux/storage'ga yozilmaydi). */
export function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const toast = useToast();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (saved) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [saved]);

  async function onCopy() {
    if (await copyText(codes.join('\n'))) toast.success('Kodlar nusxalandi');
    else toast.error('Nusxalab bo‘lmadi', 'Kodlarni qo‘lda belgilab nusxa oling.');
  }

  function onDownload() {
    const header = 'GitZone tiklash kodlari. Har biri BIR MARTA ishlatiladi. Xavfsiz joyda saqlang.\n\n';
    downloadText('gitzone-recovery-codes.txt', header + codes.join('\n') + '\n');
  }

  return (
    <div className={styles.form} style={{ maxWidth: 'none' }}>
      <Alert tone="warning">
        <b>2FA yoqildi. Tiklash kodlarini hoziroq saqlang.</b> Ular faqat bir marta ko‘rsatiladi. Telefoningizni yo‘qotsangiz,
        hisobingizga faqat shu kodlar bilan kira olasiz. Har bir kod bir marta ishlaydi.
      </Alert>
      <ul className={styles.codes}>{codes.map((c) => <li key={c}>{c}</li>)}</ul>
      <div className={styles.row}>
        <Button onClick={onCopy}>Nusxalash</Button>
        <Button onClick={onDownload}>.txt yuklab olish</Button>
      </div>
      <Checkbox label="Kodlarni xavfsiz joyga saqladim" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
      <Button variant="primary" disabled={!saved} onClick={onDone} style={{ justifySelf: 'start' }}>Tayyor</Button>
    </div>
  );
}
