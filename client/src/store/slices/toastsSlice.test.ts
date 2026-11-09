import { describe, expect, it } from 'vitest';
import reducer, { dismissToast, pushToast } from './toastsSlice';

describe('toastsSlice', () => {
  it('toast qo‘shadi va o‘chiradi', () => {
    let state = reducer(undefined, pushToast({ kind: 'info', title: 'Salom' }));
    expect(state.items).toHaveLength(1);
    state = reducer(state, dismissToast(state.items[0].id));
    expect(state.items).toHaveLength(0);
  });

  it('ko‘pi bilan 5 ta toast saqlaydi', () => {
    let state = reducer(undefined, { type: 'init' });
    for (let i = 0; i < 8; i++) state = reducer(state, pushToast({ kind: 'success', title: `#${i}` }));
    expect(state.items).toHaveLength(5);
    expect(state.items[0].title).toBe('#3');
  });
});
