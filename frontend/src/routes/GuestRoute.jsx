import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useUser } from '../context/UserContext';

export default function GuestRoutes() {
  const { user, loading } = useUser();
  const token = localStorage.getItem('access_token');

  // Wait for context to verify token validity before redirecting guest
  if (loading) {
    return null; 
  }

  // Determine user role if logged in
  const isStaff = 
    user?.is_staff === true || 
    user?.is_superuser === true ||
    user?.user?.is_staff === true ||
    user?.user?.is_superuser === true;

  // If authenticated session exists, send to appropriate dashboard
  if (token && user) {
    return <Navigate to={isStaff ? "/admin-dashboard" : "/user-dashboard"} replace />;
  }

  return <Outlet />;
}