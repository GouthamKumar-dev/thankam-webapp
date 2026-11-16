import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '@/hooks/store';
import { Role } from '@/types/auth';
import { PageLoader } from '@/components/common/skeleton';

type ProtectedRouteProps = {
  roles?: Role[];
};

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { isAuthenticated, user, initialized } = useAppSelector((s) => s.auth);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F5]">
        <PageLoader message="Verifying session..." />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
