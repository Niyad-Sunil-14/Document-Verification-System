// UserContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axiosInstance, { invalidateCache } from '../api/Axiosinstance';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    const token = localStorage.getItem('access_token');

    if (!token) {
      setUser(null);
      setLoading(false);
      return null;
    }

    try {
      const response = await axiosInstance.get('users/profile/');
      setUser(response.data);
      return response.data; // 👈 Return response data so callers can await state update
    } catch (err) {
      console.error("Failed to load user context profile:", err);
      if (err.response?.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    invalidateCache('users/profile/');
    return await fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return (
    <UserContext.Provider value={{ user, setUser, loading, refreshProfile, fetchProfile }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);