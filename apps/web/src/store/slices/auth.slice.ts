import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, SafeUser } from '@/types/auth';
import { authService } from '@/features/auth/auth.service';

const initialState: AuthState = {
  accessToken: null,
  user: null,
  isAuthenticated: false,
  loading: false,
  initialized: false,
};

export const loginThunk = createAsyncThunk(
  'auth/login',
  authService.login,
);

export const logoutThunk = createAsyncThunk('auth/logout', authService.logout);
export const initializeAuthThunk = createAsyncThunk(
  'auth/initialize',
  async () => {
    try {
      return await authService.refreshSession();
    } catch {
      return null;
    }
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAccessToken(state, action: PayloadAction<string | null>) {
      state.accessToken = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    setUser(state, action: PayloadAction<SafeUser | null>) {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    clearAuth(state) {
      state.accessToken = null;
      state.user = null;
      state.isAuthenticated = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.accessToken = action.payload.accessToken;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.initialized = true;
      })
      .addCase(loginThunk.rejected, (state) => {
        state.loading = false;
        state.initialized = true;
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.accessToken = null;
        state.user = null;
        state.isAuthenticated = false;
        state.initialized = true;
      })
      .addCase(logoutThunk.rejected, (state) => {
        state.accessToken = null;
        state.user = null;
        state.isAuthenticated = false;
        state.initialized = true;
      })
      .addCase(initializeAuthThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(initializeAuthThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.initialized = true;
        if (action.payload) {
          state.accessToken = action.payload.accessToken;
          state.user = action.payload.user;
          state.isAuthenticated = true;
        } else {
          state.accessToken = null;
          state.user = null;
          state.isAuthenticated = false;
        }
      })
      .addCase(initializeAuthThunk.rejected, (state) => {
        state.loading = false;
        state.initialized = true;
        state.accessToken = null;
        state.user = null;
        state.isAuthenticated = false;
      });
  },
});

export const { setAccessToken, setUser, clearAuth } = authSlice.actions;
export default authSlice.reducer;
