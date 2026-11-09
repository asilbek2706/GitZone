import type { Metadata } from 'next';
import { LoginForm } from '@/features/auth/LoginForm';

export const metadata: Metadata = { title: 'Kirish' };

export default function LoginPage() {
  return <LoginForm />;
}
