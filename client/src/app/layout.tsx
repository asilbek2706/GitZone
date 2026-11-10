// src/app/layout.tsx
import { Toaster } from 'sonner';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body className="bg-[#0a0a0a] text-white antialiased">
        {children}
        {/* Sonner Toaster komponenti */}
        <Toaster theme="dark" position="top-right" richColors />
      </body>
    </html>
  );
}
