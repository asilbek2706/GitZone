'use client';

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setTheme, type Theme } from '@/store/slices/uiSlice';

export function useTheme() {
  const theme = useAppSelector((s) => s.ui.theme);
  const dispatch = useAppDispatch();

  const set = useCallback(
    (next: Theme) => {
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('gz-theme', next); } catch { /* private mode */ }
      dispatch(setTheme(next));
    },
    [dispatch],
  );

  return { theme, set, toggle: () => set(theme === 'dark' ? 'light' : 'dark') };
}
