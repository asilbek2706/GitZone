'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { ToastViewport } from '@/components/feedback/ToastViewport';
import { AuthBootstrap } from '@/features/auth/AuthBootstrap';
import { makeStore } from '@/store';
import { useAppDispatch } from '@/store/hooks';
import { setTheme } from '@/store/slices/uiSlice';

function ThemeSync() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    if (t === 'light' || t === 'dark') dispatch(setTheme(t));
  }, [dispatch]);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [store] = useState(makeStore);
  return (
    <Provider store={store}>
      <ThemeSync />
      <AuthBootstrap />
      {children}
      <ToastViewport />
    </Provider>
  );
}
