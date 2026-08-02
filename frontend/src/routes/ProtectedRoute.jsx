import React, { useEffect, useRef } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useUser } from '../context/UserContext';

export default function ProtectedRoute({ children, allowedRoles = ['USER'] }) {
  const { user, loading } = useUser();
  const location = useLocation();
  const token = localStorage.getItem('access_token');
  const alertShownRef = useRef(false);

  const isAdminRoute = allowedRoles.includes('ADMIN');

  useEffect(() => {
    const isManualLogout = localStorage.getItem('is_manual_logout');

    // 1. If user intentionally logged out, clear the flag and suppress the alert!
    if (isManualLogout) {
      localStorage.removeItem('is_manual_logout');
      return;
    }

    // 2. Check if user is already on a login route
    const isLoginPath = location.pathname === '/login' || location.pathname === '/admin-login';

    // 3. Only fire SweetAlert if it was an ACTUAL session loss (token missing & not a manual logout)
    if (!token && !alertShownRef.current && !isLoginPath) {
      alertShownRef.current = true;
      Swal.fire({
        title: 'Session Expired',
        text: 'Your session has expired or you are not logged in.',
        icon: 'warning',
        confirmButtonText: 'Go to Login',
        confirmButtonColor: '#4f46e5',
        allowOutsideClick: false,
        allowEscapeKey: false,
      }).then((result) => {
        if (result.isConfirmed) {
          window.location.href = isAdminRoute ? '/admin-login' : '/login';
        }
      });
    }
  }, [token, isAdminRoute, location.pathname]);

  if (!token) {
    return null;
  }

  if (loading) return null;

  if (!user) {
    const targetLogin = isAdminRoute ? "/admin-login" : "/login";
    return <Navigate to={targetLogin} replace />;
  }

  const isStaff = 
    user.is_staff === true || 
    user.is_superuser === true ||
    user.user?.is_staff === true ||
    user.user?.is_superuser === true;

  const currentRole = isStaff ? 'ADMIN' : 'USER';
  const hasAccess = allowedRoles.includes(currentRole);

  if (!hasAccess) {
    return <Navigate to={isStaff ? "/admin-dashboard" : "/user-dashboard"} replace />;
  }

  return children ? children : <Outlet />;
}