import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/features/auth/authSlice';
import { baseApi } from '@/lib/api/baseApi';
import toasts from './slices/toastsSlice';
import ui from './slices/uiSlice';

// App Router'da store har mount uchun alohida yaratiladi (serverda umumiy holat oqib ketmasligi uchun).
export const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: authReducer, toasts, ui },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
