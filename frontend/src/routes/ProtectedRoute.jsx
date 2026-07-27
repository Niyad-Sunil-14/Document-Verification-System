import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';

export default function ProtectedRoute({ children, allowedRoles = ['USER'] }) {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  const token = localStorage.getItem('access_token');

  useEffect(() => {
    // 1. Wait until UserContext has finished its initial profile fetch
    if (loading) return;

    // 2. No token or no user context -> redirect to login
    if (!token || !user) {
      const isAdminRoute = allowedRoles.includes('ADMIN');
      navigate(isAdminRoute ? "/admin-login" : "/login", { replace: true });
      return;
    }

    // 3. Determine user role from the already-loaded context user object
    const isStaff = 
      user.is_staff === true || 
      user.is_superuser === true ||
      user.user?.is_staff === true ||
      user.user?.is_superuser === true;

    const currentRole = isStaff ? 'ADMIN' : 'USER';
    const hasAccess = allowedRoles.includes(currentRole);

    // 4. Role Mismatch: Redirect to their respective home dashboard
    if (!hasAccess) {
      navigate(isStaff ? "/admin-dashboard" : "/user-dashboard", { replace: true });
    }
  }, [user, loading, token, allowedRoles, navigate]);

  // Show loading spinner while UserContext is doing its initial boot fetch
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
      </div>
    );
  }

  // Determine role for render check
  const isStaff = 
    user?.is_staff === true || 
    user?.is_superuser === true ||
    user?.user?.is_staff === true ||
    user?.user?.is_superuser === true;

  const currentRole = isStaff ? 'ADMIN' : 'USER';
  const hasAccess = allowedRoles.includes(currentRole);

  // Render children only if token exists and role is authorized
  return token && user && hasAccess ? children : null;
}