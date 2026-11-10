'use client';

import { Monitor, Moon, Sun } from 'lucide-react';

import { useTheme, type Theme } from '@/providers/theme-provider';

import styles from './ThemeSwitcher.module.css';

const themes: {
  value: Theme;
  label: string;
  icon: typeof Sun;
}[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="group"
      aria-label="Choose appearance"
      className={styles.switcher}
    >
      {themes.map(({ value, label, icon: Icon }) => {
        const isActive = theme === value;

        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-label={`${label} theme`}
            aria-pressed={isActive}
            title={`${label} theme`}
            className={`${styles.option} ${isActive ? styles.active : ''}`}
          >
            <Icon size={16} strokeWidth={1.9} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
