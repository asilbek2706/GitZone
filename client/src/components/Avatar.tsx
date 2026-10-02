import type { User } from '../types';
export const initials = (user?: User | null) => (user?.name ?? user?.username ?? 'G').slice(0, 2).toUpperCase();
