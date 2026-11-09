import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { Providers } from '@/components/providers/Providers';
import '@/styles/globals.scss';

const display = Bricolage_Grotesque({ subsets: ['latin', 'latin-ext'], variable: '--font-display', display: 'swap' });
const sans = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-sans', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin', 'latin-ext'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'GitZone', template: '%s · GitZone' },
  description: 'GitZone: kodingiz uchun o‘z hududingiz. Repozitoriylar, pull request va jamoa ishi.',
};

export const viewport: Viewport = { themeColor: '#080c0b' };

// Sahifa chizilishidan oldin saqlangan mavzuni qo'llaydi (miltillashsiz).
const THEME_SCRIPT = "try{var t=localStorage.getItem('gz-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uz" data-theme="dark" suppressHydrationWarning className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} /></head>
      <body>
        <a className="skip-link" href="#main">Asosiy mazmunga o‘tish</a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
