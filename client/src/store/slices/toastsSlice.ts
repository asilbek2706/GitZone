import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';

export type ToastKind = 'success' | 'error' | 'info';
export interface Toast { id: string; kind: ToastKind; title: string; message?: string }

const MAX_TOASTS = 5;

const toastsSlice = createSlice({
  name: 'toasts',
  initialState: { items: [] as Toast[] },
  reducers: {
    pushToast: {
      reducer(state, action: PayloadAction<Toast>) {
        state.items.push(action.payload);
        if (state.items.length > MAX_TOASTS) state.items.shift();
      },
      prepare: (toast: Omit<Toast, 'id'>) => ({ payload: { ...toast, id: nanoid() } }),
    },
    dismissToast(state, action: PayloadAction<string>) {
      state.items = state.items.filter((t) => t.id !== action.payload);
    },
  },
});

export const { pushToast, dismissToast } = toastsSlice.actions;
export default toastsSlice.reducer;
