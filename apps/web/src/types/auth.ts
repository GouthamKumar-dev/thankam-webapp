export type Role = 'ADMIN' | 'STAFF';

export type SafeUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  isActive: boolean;
};

export type AuthState = {
  accessToken: string | null;
  user: SafeUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  initialized: boolean;
};
