import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/Axiosinstance';

export default function ProtectedRoute({ children, allowedRoles = ['USER'] }) {
  const [isAuthorized, setIsAuthorized] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('access_token');

  useEffect(() => {
    let isMounted = true;

    // 1. If there's no token at all, skip the backend check and redirect immediately
    if (!token) {
      const isAdminRoute = allowedRoles.includes('ADMIN');
      navigate(isAdminRoute ? "/admin-login" : "/login", { replace: true });
      return;
    }

    const checkAccessClearance = async () => {
      try {
        const response = await axiosInstance.get('users/profile/');
        
        if (!isMounted) return;

        // 🔥 INSULATED CONFIGURATION: Checks every common layout location for role flags
        const profileData = response.data;
        const isStaff = 
          profileData.is_staff === true || 
          profileData.is_superuser === true ||
          profileData.user?.is_staff === true ||
          profileData.user?.is_superuser === true;

        const currentRole = isStaff ? 'ADMIN' : 'USER';
        const hasAccess = allowedRoles.includes(currentRole);

        console.log("--- Guard Clearance Check ---");
        console.log("Allowed Roles for this route:", allowedRoles);
        console.log("Detected User Role from backend:", currentRole);
        console.log("Full Profile Payload:", profileData);

        if (hasAccess) {
          setIsAuthorized(true);
        } else {
          // Role Mismatch: User is logged in, but on the wrong dashboard space
          setIsAuthorized(false);
          navigate(isStaff ? "/admin-dashboard" : "/user-dashboard", { replace: true });
        }
      } catch (err) {
        console.error("Authorization guard encountered an API error:", err);
        
        if (!isMounted) return;

        setIsAuthorized(false);

        // If the token is rejected by the backend (401), clean the cache
        if (err.response?.status === 401) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }

        // Send unauthenticated users back to their respective login portals
        const isAdminRoute = allowedRoles.includes('ADMIN');
        navigate(isAdminRoute ? "/admin-login" : "/login", { replace: true });
      }
    };

    checkAccessClearance();

    return () => {
      isMounted = false;
    };
  }, [token, allowedRoles, navigate]);

  // 2. Loading State: Only display spinner while checking backend clearance
  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
      </div>
    );
  }

  // 3. Clear pass: If verified true, render the actual dashboard children components
  return isAuthorized ? children : null;
}