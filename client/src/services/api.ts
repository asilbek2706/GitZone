import type { ApiResponse } from '../types';
export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';
export const getToken = () => localStorage.getItem('gitzone_access_token');
export const api = async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
  const headers = new Headers(init.headers); headers.set('Content-Type', 'application/json');
  const token = getToken(); if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_URL}${path}`, { ...init, headers, credentials: 'include' });
  const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.message ?? 'Request failed'); return body as T;
};
export type AuthResponse = ApiResponse<{ user: import('../types').User; accessToken: string }>;
