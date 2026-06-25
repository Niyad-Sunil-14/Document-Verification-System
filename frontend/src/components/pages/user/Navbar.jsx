import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axiosInstance from '../../../api/Axiosinstance';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 🔥 NEW: State for real notifications array data hook
  const [notifications, setNotifications] = useState([]);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const getNavLinkClass = (path) => {
    const isActive = location.pathname === path;
    return `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-semibold h-full transition ${
      isActive 
        ? 'border-violet-600 text-slate-900' 
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`;
  };

  useEffect(() => {
    const fetchUserProfileAndAlerts = async () => {
      try {
        setLoading(true);
        const profileResponse = await axiosInstance.get('users/profile/'); 
        setUser(profileResponse.data);

        // 🔥 Fetch live notifications from database limit payload to top 3 for preview panel
        const alertResponse = await axiosInstance.get('documents/notifications/');
        setNotifications(alertResponse.data.slice(0, 3));
      } catch (err) {
        console.error("Profile/Notification systems failing:", err);
        setError(err.response?.data?.detail || 'Identity sync issue.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserProfileAndAlerts();
  }, []);

  // 🔥 Has unread notification tracking compute logic
  const hasUnread = notifications.some(n => !n.is_read);

  const logoutUser = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        await axiosInstance.post('token/blacklist/', { refresh: refreshToken });
      }
    } catch (error) {
      console.error("Backend token blacklisting failed:", error);
    } finally {
      localStorage.clear();
      navigate('/');
    }
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          
          <div className="flex items-center space-x-8">
            <Link to="/user-dashboard" className="flex-shrink-0 flex items-center space-x-2 cursor-pointer">
              <img src="/logo.png" alt="icon" className="w-full h-auto object-contain max-w-[42px]"/>
              <span className="text-xl font-bold tracking-tight text-slate-900">DocVerify</span>
            </Link>

            <div className="hidden md:flex space-x-6 h-full">
              <Link to="/user-dashboard" className={getNavLinkClass('/user-dashboard')}>Dashboard</Link>
              <Link to="/documents" className={getNavLinkClass('/documents')}>My Documents</Link>
              <Link to="/upload" className={getNavLinkClass('/upload')}>Upload Document</Link>
              <Link to="/support" className={getNavLinkClass('/support')}>Help & Support</Link>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            
            {/* NOTIFICATION ITEM */}
            <div className="relative">
              <button 
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="p-1.5 text-gray-400 hover:text-gray-500 rounded-full hover:bg-slate-50 transition relative focus:outline-none cursor-pointer"
              >
                <span className="sr-only">Notification</span>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {/* 🔥 DYNAMIC BADGE RED DOT CONDITION MATCHING */}
                {hasUnread && (
                  <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
                )}
              </button>

              {/* Notification Overlay Panel */}
              {isNotificationOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-72 rounded-xl shadow-lg bg-white ring-1 ring-black ring-opacity-5 border border-slate-100 py-2 z-50">
                  <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-slate-100">
                    Notifications Log
                  </div>
                  
                  {/* 🔥 DYNAMIC INLINE ITERATION OF PREVIEW CORES */}
                  <div className="divide-y divide-slate-50 max-h-60 overflow-y-auto">
                    {notifications.map((notif) => (
                      <div key={notif.id} className="px-4 py-3 text-sm hover:bg-slate-50 cursor-pointer">
                        <div className="flex items-center space-x-1.5">
                          <p className="font-bold text-slate-800">{notif.title}</p>
                          {!notif.is_read && <span className="h-1 w-1 bg-violet-600 rounded-full" />}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{notif.description}</p>
                      </div>
                    ))}
                    
                    {notifications.length === 0 && (
                      <div className="px-4 py-6 text-center text-xs text-gray-400 font-medium">
                        No recent account activities.
                      </div>
                    )}
                  </div>

                  {/* 🔥 LINK REDIRECT OUT ROW TO DEDICATED MASTER LOG */}
                  <Link 
                    to="/notifications" 
                    onClick={() => setIsNotificationOpen(false)}
                    className="block text-center text-xs text-violet-600 font-bold hover:underline cursor-pointer pt-3 pb-1 border-t border-slate-100 text-decoration-none"
                  >
                    View All Activity
                  </Link>
                </div>
              )}
            </div>

            {/* PROFILE DROPDOWN ITEM */}
            <div className="relative">
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 items-center space-x-2 border border-slate-200 p-1.5 pr-3 hover:bg-slate-50 transition cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center font-bold text-sm uppercase shadow-sm">
                  {user?.fullname ? user.fullname.charAt(0) : '?'}
                </div>
                <div className="text-left hidden lg:block">
                  <p className="text-xs font-bold text-slate-800 leading-tight">{user?.fullname || 'Loading...'}</p>
                </div>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isProfileOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-xl shadow-lg bg-white ring-1 ring-black ring-opacity-5 border border-slate-100 py-1 z-50">
                  <div className="px-4 py-2.5 text-xs border-b border-slate-100 bg-slate-50/50">
                    Active Account: <br /><strong className="text-slate-800 break-all">{user?.email}</strong>
                  </div>
                  <Link to="/profile" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 font-semibold text-decoration-none">Profile</Link>
                  <Link to="/settings" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 font-medium text-decoration-none">Account Settings</Link>
                  <button onClick={logoutUser} className="block w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-bold border-t border-slate-100 cursor-pointer">
                    Logout
                  </button>
                </div>
              )}
            </div>

          </div>

          <div className="flex items-center md:hidden">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="inline-flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-gray-500 hover:bg-slate-50 focus:outline-none">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 px-4 pt-2 pb-4 space-y-1 shadow-inner">
          <Link to="/user-dashboard" className="block px-3 py-2 rounded-lg text-base font-bold bg-violet-50 text-violet-700 text-decoration-none">Dashboard</Link>
          <Link to="/documents" className="block px-3 py-2 rounded-lg text-base font-medium text-gray-600 hover:bg-slate-50 text-decoration-none">My Documents</Link>
          <Link to="/upload" className="block px-3 py-2 rounded-lg text-base font-medium text-gray-600 hover:bg-slate-50 text-decoration-none">Upload Document</Link>
          {/* Mobile points straight to notifications center */}
          <Link to="/notifications" className="block px-3 py-2 rounded-lg text-base font-medium text-gray-600 hover:bg-slate-50 text-decoration-none">Notifications Center</Link>
          <Link to="/profile" className="block px-3 py-2 rounded-lg text-base font-medium text-gray-600 hover:bg-slate-50 text-decoration-none">Profile</Link>
          <Link to="/support" className="block px-3 py-2 rounded-lg text-base font-medium text-gray-600 hover:bg-slate-50 text-decoration-none">Help & Support</Link>
          
          <div className="pt-4 border-t border-slate-200 mt-2">
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Logged Identity</p>
            <p className="px-3 text-sm font-medium text-slate-800 mt-1 break-all">{user?.email || 'Loading...'}</p>
            <button onClick={logoutUser} className="block w-full text-left px-3 py-2 text-base font-bold text-red-600 mt-2 hover:bg-red-50 rounded-lg cursor-pointer">
              Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}