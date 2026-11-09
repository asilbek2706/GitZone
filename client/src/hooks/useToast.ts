import { useMemo } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { pushToast } from '@/store/slices/toastsSlice';

export function useToast() {
  const dispatch = useAppDispatch();
  return useMemo(
    () => ({
      success: (title: string, message?: string) => dispatch(pushToast({ kind: 'success', title, message })),
      error: (title: string, message?: string) => dispatch(pushToast({ kind: 'error', title, message })),
      info: (title: string, message?: string) => dispatch(pushToast({ kind: 'info', title, message })),
    }),
    [dispatch],
  );
}
