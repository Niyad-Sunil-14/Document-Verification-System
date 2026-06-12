import React from 'react';
import { Navigate, Outlet } from 'react-router';

export default function GuestRoutes() {
  // Check local storage for the active session token
  const isAuthenticated = !!localStorage.getItem('access_token');

  // 🔥 If logged in, redirect them to the documents dashboard.
  // Otherwise, render the public page (like the login screen).
  return isAuthenticated ? <Navigate to="/user-dashboard" replace /> : <Outlet />;
}