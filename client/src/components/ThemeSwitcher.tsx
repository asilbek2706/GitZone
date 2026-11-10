'use client';

import { Monitor, Moon, Sun } from 'lucide-react';

import { useTheme, type Theme } from '@/providers/theme-provider';

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
      className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface p-1"
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
            title={label}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
              isActive
                ? 'bg-surface-hover text-foreground shadow-sm'
                : 'text-muted hover:bg-surface-hover hover:text-foreground'
            }`}
          >
            <Icon size={16} strokeWidth={1.8} />
          </button>
        );
      })}
    </div>
  );
}
