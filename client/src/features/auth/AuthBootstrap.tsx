'use client';

import { useEffect } from 'react';
import { refreshSession } from '@/lib/api/refresh';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { loggedOut, setCredentials } from './authSlice';

/** Sahifa ochilganda refresh cookie orqali jim holda sessiyani tiklaydi. */
export function AuthBootstrap() {
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.auth.status);

  useEffect(() => {
    if (status !== 'unknown') return;
    let cancelled = false;
    refreshSession().then((session) => {
      if (!cancelled) dispatch(session ? setCredentials(session) : loggedOut());
    });
    return () => { cancelled = true; };
  }, [dispatch, status]);

  return null;
}
