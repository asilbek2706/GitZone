import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthData, AuthUser } from './types';

export type AuthStatus = 'unknown' | 'authenticated' | 'anonymous';

interface AuthState { user: AuthUser | null; accessToken: string | null; status: AuthStatus }

const initialState: AuthState = { user: null, accessToken: null, status: 'unknown' };

// Access token faqat xotirada (Redux) turadi. localStorage/sessionStorage'ga YOZILMAYDI.
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<AuthData>) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.status = 'authenticated';
    },
    setUser(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload;
    },
    loggedOut(state) {
      state.user = null;
      state.accessToken = null;
      state.status = 'anonymous';
    },
  },
});

export const { setCredentials, setUser, loggedOut } = authSlice.actions;
export default authSlice.reducer;
