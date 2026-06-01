import { Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

export default function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('access_token');

  // Step 1: No token? Redirect to login immediately
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  try {
    const decoded = jwtDecode(token);
    const userRole = decoded.role; // Will be 'ADMIN', 'USER', etc.
    console.log(userRole)

    if (allowedRoles && !allowedRoles.includes(userRole)) {
      return <Navigate to="/admin-login" replace />;
    }
  } catch (error) {
    // If token is malformed, expired, or tampered with, wipe data and boot them
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }

  return children;
}