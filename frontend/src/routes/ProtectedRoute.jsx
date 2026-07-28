import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useUser } from '../context/UserContext';

export default function ProtectedRoute({ children, allowedRoles = ['USER'] }) {
  const { user, loading } = useUser();
  const token = localStorage.getItem('access_token');

  // 1. Wait until UserContext finishes booting
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
      </div>
    );
  }

  // 2. Unauthenticated -> Redirect to appropriate login page
  if (!token || !user) {
    const isAdminRoute = allowedRoles.includes('ADMIN');
    return <Navigate to={isAdminRoute ? "/admin-login" : "/login"} replace />;
  }

  // 3. Determine current role
  const isStaff = 
    user.is_staff === true || 
    user.is_superuser === true ||
    user.user?.is_staff === true ||
    user.user?.is_superuser === true;

  const currentRole = isStaff ? 'ADMIN' : 'USER';
  const hasAccess = allowedRoles.includes(currentRole);

  // 4. Role Mismatch -> Redirect to respective dashboard
  if (!hasAccess) {
    return <Navigate to={isStaff ? "/admin-dashboard" : "/user-dashboard"} replace />;
  }

  // Render wrapper children or layout outlet
  return children ? children : <Outlet />;
}