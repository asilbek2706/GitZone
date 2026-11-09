import { baseApi } from '@/lib/api/baseApi';
import { loggedOut, setCredentials, setUser } from './authSlice';
import type {
  ApiEnvelope, AuthData, AuthSession, AuthUser, CreatedToken, LoginBody, LoginData,
  PersonalAccessToken, RegisterBody, TwoFactorSetup,
} from './types';

const unwrap = <T>(r: ApiEnvelope<T>): T => r.data;
const json = (url: string, body?: unknown) => ({ url, method: 'POST', body });

export const authApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    register: b.mutation<AuthData, RegisterBody>({
      query: (body) => json('/api/auth/register', body),
      transformResponse: (r: ApiEnvelope<AuthData>) => r.data,
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try { dispatch(setCredentials((await queryFulfilled).data)); } catch { /* xato UI'da ko'rsatiladi */ }
      },
    }),
    login: b.mutation<LoginData, LoginBody>({
      query: (body) => json('/api/auth/login', body),
      transformResponse: (r: ApiEnvelope<LoginData>) => r.data,
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (!data.requiresTwoFactor) dispatch(setCredentials({ user: data.user, accessToken: data.accessToken }));
        } catch { /* xato UI'da */ }
      },
    }),
    verifyTwoFactorLogin: b.mutation<AuthData, { challengeToken: string; code: string }>({
      query: (body) => json('/api/auth/2fa/login/verify', body),
      transformResponse: (r: ApiEnvelope<AuthData>) => r.data,
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try { dispatch(setCredentials((await queryFulfilled).data)); } catch { /* UI'da */ }
      },
    }),
    verifyTwoFactorRecoveryLogin: b.mutation<AuthData, { challengeToken: string; recoveryCode: string }>({
      query: (body) => json('/api/auth/2fa/login/recovery', body),
      transformResponse: (r: ApiEnvelope<AuthData>) => r.data,
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try { dispatch(setCredentials((await queryFulfilled).data)); } catch { /* UI'da */ }
      },
    }),
    logout: b.mutation<void, void>({
      query: () => json('/api/auth/logout'),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try { await queryFulfilled; } catch { /* baribir mahalliy chiqamiz */ }
        dispatch(loggedOut());
        dispatch(baseApi.util.resetApiState());
      },
    }),
    getMe: b.query<AuthUser, void>({
      query: () => '/api/auth/me',
      transformResponse: (r: ApiEnvelope<{ user: AuthUser }>) => r.data.user,
      providesTags: ['Me'],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try { dispatch(setUser((await queryFulfilled).data)); } catch { /* 401 ni baseQuery hal qiladi */ }
      },
    }),
    // ---- sessiyalar
    getSessions: b.query<AuthSession[], void>({
      query: () => '/api/auth/sessions',
      transformResponse: (r: ApiEnvelope<{ sessions: AuthSession[] }>) => r.data.sessions,
      providesTags: ['Session'],
    }),
    revokeSession: b.mutation<void, string>({
      query: (id) => ({ url: `/api/auth/sessions/${encodeURIComponent(id)}`, method: 'DELETE' }),
      invalidatesTags: ['Session'],
    }),
    revokeOtherSessions: b.mutation<{ revokedSessions: number }, void>({
      query: () => ({ url: '/api/auth/sessions', method: 'DELETE' }),
      transformResponse: (r: ApiEnvelope<{ revokedSessions: number }>) => r.data,
      invalidatesTags: ['Session'],
    }),
    // ---- personal access tokenlar
    listTokens: b.query<PersonalAccessToken[], void>({
      query: () => '/api/auth/tokens',
      transformResponse: (r: ApiEnvelope<{ tokens: PersonalAccessToken[] }>) => r.data.tokens,
      providesTags: ['Token'],
    }),
    createToken: b.mutation<CreatedToken, { name: string; expiresAt?: string }>({
      query: (body) => json('/api/auth/tokens', body),
      transformResponse: (r: ApiEnvelope<CreatedToken>) => r.data,
      invalidatesTags: ['Token'],
    }),
    revokeToken: b.mutation<void, string>({
      query: (id) => ({ url: `/api/auth/tokens/${encodeURIComponent(id)}`, method: 'DELETE' }),
      invalidatesTags: ['Token'],
    }),
    // ---- 2FA
    setupTwoFactor: b.mutation<TwoFactorSetup, void>({
      query: () => json('/api/auth/2fa/setup'),
      transformResponse: (r: ApiEnvelope<TwoFactorSetup>) => r.data,
    }),
    verifyTwoFactorSetup: b.mutation<{ recoveryCodes: string[] }, { code: string }>({
      query: (body) => json('/api/auth/2fa/verify', body),
      transformResponse: (r: ApiEnvelope<{ recoveryCodes: string[] }>) => r.data,
    }),
    disableTwoFactor: b.mutation<void, { password: string; code: string }>({
      query: (body) => json('/api/auth/2fa/disable', body),
    }),
  }),
});

export const {
  useRegisterMutation, useLoginMutation, useVerifyTwoFactorLoginMutation,
  useVerifyTwoFactorRecoveryLoginMutation, useLogoutMutation, useGetMeQuery,
  useGetSessionsQuery, useRevokeSessionMutation, useRevokeOtherSessionsMutation,
  useListTokensQuery, useCreateTokenMutation, useRevokeTokenMutation,
  useSetupTwoFactorMutation, useVerifyTwoFactorSetupMutation, useDisableTwoFactorMutation,
} = authApi;

void unwrap;
