import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CommonRoute from './routes/CommonRoute';
import UserRoute from './routes/UserRoute';
import AdminRoute from './routes/AdminRoute';

function App() {
  // 🚀 GLOBAL THEME ROOT MONITOR: Evaluates on mount and binds the .dark modifier
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
      <Routes>
        {CommonRoute()}
        {UserRoute()}
        {AdminRoute()}
      </Routes>
    </BrowserRouter>
  );
}

export default App;