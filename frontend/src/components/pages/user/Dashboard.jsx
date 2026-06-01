import React from 'react'
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../api/Axiosinstance';

function Dashboard() {

  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');

      // 1. Tell Django to invalidate the refresh token
      if (refreshToken) {
        await axiosInstance.post('auth/logout/', {
          refresh: refreshToken,
        });
      }
    } catch (error) {
      console.error("Backend logout failed or token already expired:", error);
    } finally {
      // 2. ALWAYS clear local storage regardless of API success/fail
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');

      // 3. Bounce the user back to the login screen
      navigate('/login', { replace: true });
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition"
    >
      <i className="fa-solid fa-right-from-bracket"></i> Logout
    </button>
  );
}
  export default Dashboard