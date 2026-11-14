'use client';

import { createContext, useContext } from 'react';

import type { AuthUser } from '@/types/api';

export const DashboardUserContext = createContext<AuthUser | null>(null);

export function useDashboardUser(): AuthUser | null {
  return useContext(DashboardUserContext);
}
