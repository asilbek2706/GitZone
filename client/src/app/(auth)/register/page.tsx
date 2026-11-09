import type { Metadata } from 'next';
import { RegisterForm } from '@/features/auth/RegisterForm';

export const metadata: Metadata = { title: 'Ro‘yxatdan o‘tish' };

export default function RegisterPage() {
  return <RegisterForm />;
}
