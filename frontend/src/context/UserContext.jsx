import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axiosInstance, { invalidateCache } from '../api/Axiosinstance';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🚀 Single source of truth for user profile
  const fetchProfile = useCallback(async () => {
    try {
      const response = await axiosInstance.get('users/profile/', { useCache: true });
      setUser(response.data);
      return response.data;
    } catch (err) {
      console.error("Failed to load user context profile:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh helper for after profile updates
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

// Custom Hook to consume user data in any component
export const useUser = () => useContext(UserContext);