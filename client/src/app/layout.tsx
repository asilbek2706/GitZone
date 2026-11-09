// src/app/layout.tsx
import './globals.css'; // <--- Shu qator albatta bo'lishi kerak!
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GitZone',
  description: 'Git hosting and collaboration platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body className="bg-[#0d1117] text-white antialiased">{children}</body>
    </html>
  );
}
