import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '@/hooks/store';
import { Role } from '@/types/auth';

type ProtectedRouteProps = {
  roles?: Role[];
};

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { isAuthenticated, user, initialized } = useAppSelector((s) => s.auth);

  if (!initialized) {
    return <div className="p-6 text-sm text-slate-500">Checking session...</div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
