import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[];
  permission?: string;
}

export default function ProtectedRoute({ children, roles, permission }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, hasPermission } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-text-tertiary text-[13px]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role-based or permission-based denial → redirect to dashboard
  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (permission) {
    // Support pipe-separated OR logic: "can_manage_roles|can_manage_users"
    const allowed = permission.includes('|')
      ? permission.split('|').some(p => hasPermission(p))
      : hasPermission(permission);
    if (!allowed) return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
