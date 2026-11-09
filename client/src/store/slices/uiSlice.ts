import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type Theme = 'dark' | 'light';

const uiSlice = createSlice({
  name: 'ui',
  initialState: { theme: 'dark' as Theme },
  reducers: {
    setTheme(state, action: PayloadAction<Theme>) {
      state.theme = action.payload;
    },
  },
});

export const { setTheme } = uiSlice.actions;
export default uiSlice.reducer;
