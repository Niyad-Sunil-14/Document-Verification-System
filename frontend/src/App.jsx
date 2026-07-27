import React, { useEffect, Suspense } from 'react';
import { BrowserRouter, Routes } from 'react-router-dom';
import CommonRoute from './routes/CommonRoute';
import UserRoute from './routes/UserRoute';
import AdminRoute from './routes/AdminRoute';
import { UserProvider } from './context/UserContext';

// Fallback Loader
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

function App() {
  useEffect(() => {
    const savedPrefs = localStorage.getItem('user_workspace_settings_prefs');
    if (savedPrefs) {
      const { darkMode } = JSON.parse(savedPrefs);
      if (darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  return (
    <BrowserRouter>
      <UserProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {CommonRoute()}
            {UserRoute()}
            {AdminRoute()}
          </Routes>
        </Suspense>
      </UserProvider>
    </BrowserRouter>
  );
}

export default App;