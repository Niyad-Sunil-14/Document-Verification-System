// ProtectedRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useUser } from '../context/UserContext';

export default function ProtectedRoute({ children, allowedRoles = ['USER'] }) {
  const { user, loading } = useUser();
  const token = localStorage.getItem('access_token');

  // 1. Missing token on navigation: Show Swal once and halt render
  if (!token) {
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
        window.location.href = '/login';
      }
    });
    return null;
  }

  if (loading) return null;

  if (!user) {
    const isAdminRoute = allowedRoles.includes('ADMIN');
    return <Navigate to={isAdminRoute ? "/admin-login" : "/login"} replace />;
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