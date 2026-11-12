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

const ADMIN_SESSION_KEY = 'has_admin_session';

export const logoutThunk = createAsyncThunk('auth/logout', authService.logout);

export const initializeAuthThunk = createAsyncThunk(
  'auth/initialize',
  async () => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      // Do not attempt admin/staff refresh on customer portal routes
      if (pathname.startsWith('/customer')) {
        return null;
      }
      const hasSession = localStorage.getItem(ADMIN_SESSION_KEY) === '1';
      const isStaffRoute =
        pathname.startsWith('/admin') ||
        pathname.startsWith('/staff') ||
        pathname === '/login';
      if (!hasSession && !isStaffRoute) {
        return null;
      }
    }
    try {
      const res = await authService.refreshSession();
      if (res && typeof window !== 'undefined') {
        localStorage.setItem(ADMIN_SESSION_KEY, '1');
      }
      return res;
    } catch {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(ADMIN_SESSION_KEY);
      }
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
      if (typeof window !== 'undefined') {
        localStorage.removeItem(ADMIN_SESSION_KEY);
      }
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
        if (typeof window !== 'undefined') {
          localStorage.setItem(ADMIN_SESSION_KEY, '1');
        }
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
        if (typeof window !== 'undefined') {
          localStorage.removeItem(ADMIN_SESSION_KEY);
        }
      })
      .addCase(logoutThunk.rejected, (state) => {
        state.accessToken = null;
        state.user = null;
        state.isAuthenticated = false;
        state.initialized = true;
        if (typeof window !== 'undefined') {
          localStorage.removeItem(ADMIN_SESSION_KEY);
        }
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
