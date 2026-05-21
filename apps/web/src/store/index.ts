import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/auth.slice';
import { configureApiClientAuth } from '@/services/api-client';

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});

configureApiClientAuth({
  getAccessToken: () => store.getState().auth.accessToken,
  setAccessToken: (token) =>
    store.dispatch({ type: 'auth/setAccessToken', payload: token }),
  clearAuth: () => store.dispatch({ type: 'auth/clearAuth' }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
