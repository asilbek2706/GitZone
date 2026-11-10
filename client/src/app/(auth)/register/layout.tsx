import type { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: "Ro'yxatdan o'tish - GitZone",
  description: "GitZone'da yangi hisob ochish va hamjamiyatga qo'shilish.",
};

export default function RegisterLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
