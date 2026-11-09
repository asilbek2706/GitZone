import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { loggedOut, setCredentials } from '@/features/auth/authSlice';
import type { RootState } from '@/store';
import { refreshSession } from './refresh';

const raw = fetchBaseQuery({
  baseUrl: 'http://localhost:5000',
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) headers.set('authorization', `Bearer ${token}`);
    return headers;
  },
});

// Bu endpointlarda 401 = "ma'lumot noto'g'ri", sessiyani yangilash kerak emas.
const NO_REAUTH = /^\/api\/auth\/(login|register|refresh|logout|2fa\/login)/;
const urlOf = (args: string | FetchArgs) => (typeof args === 'string' ? args : args.url);

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extra,
) => {
  const tokenNow = () => (api.getState() as RootState).auth.accessToken;
  const sentWith = tokenNow();
  let result = await raw(args, api, extra);

  if (result.error?.status === 401 && !NO_REAUTH.test(urlOf(args))) {
    if (tokenNow() !== sentWith) {
      result = await raw(args, api, extra); // boshqa so'rov tokenni allaqachon yangilagan
    } else {
      const session = await refreshSession();
      if (session) {
        api.dispatch(setCredentials(session));
        result = await raw(args, api, extra);
      } else {
        api.dispatch(loggedOut());
      }
    }
  }
  return result;
};

/** Barcha endpointlar `injectEndpoints` orqali qo'shiladi. Yo'llar swagger bilan bir xil: /api/... */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Me', 'Session', 'Token', 'Repository', 'Issue', 'PullRequest', 'Notification'],
  endpoints: () => ({}),
});
