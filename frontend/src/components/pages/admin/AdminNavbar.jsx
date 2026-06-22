import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

// 🔥 Receive the email prop here, setting a fallback value just in case
export default function AdminNavbar({ email = "admin@docverfy.io" }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/admin-login', { replace: true });
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-slate-900 border-b border-slate-800 text-white shadow-md select-none sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* LEFT: BRAND EMBLEM */}
          <div className="flex items-center space-x-4">
            <Link to="/admin-dashboard" className="flex items-center space-x-2 bg-transparent border-0 cursor-pointer p-0 group text-decoration-none">
              <img src="/logo.png" alt="icon" className="w-full h-auto object-contain max-w-[42px]"/>
              <span className="font-black text-lg tracking-tight bg-gradient-to-r from-violet-400 to-indigo-300 bg-clip-text text-transparent">
                DocVerify
              </span>
            </Link>
            
            <div className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold font-mono bg-red-500/10 text-red-400 border border-red-500/20 uppercase tracking-widest">
              Admin
            </div>
          </div>

          {/* CENTER: MODULE NAVIGATION ANCHORS */}
          <div className="hidden md:flex items-center space-x-2 text-sm font-medium">
            <Link 
              to="/admin-dashboard" 
              className={`px-3 py-2 rounded-lg ${isActive('/admin-dashboard') ? 'bg-slate-800 text-violet-400' : 'text-slate-300 hover:text-white'}`}
            >
              Dashboard
            </Link>
            
            <Link 
              to="/all-documents" 
              className={`px-3 py-2 rounded-lg ${isActive('/all-documents') ? 'bg-slate-800 text-violet-400' : 'text-slate-300 hover:text-white'}`}
            >
              All Documents
            </Link>
            
            <Link 
              to="/all-users" 
              className={`px-3 py-2 rounded-lg ${isActive('/all-users') ? 'bg-slate-800 text-violet-400' : 'text-slate-300 hover:text-white'}`}
            >
              All Users
            </Link>
          </div>

          {/* RIGHT: DYNAMIC PROFILE DISPLAY & EXIT ACTIONS */}
          <div className="flex items-center space-x-4">
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-xs font-black text-slate-200">System Admin</span>
              {/* 🔥 DYNAMIC RENDERING OF EMAIL HERE */}
              <span className="text-[10px] font-mono font-medium text-slate-400">{email}</span>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-rose-950 border border-slate-700/60 hover:border-rose-900/50 rounded-xl text-xs font-bold text-slate-300 hover:text-rose-200 transition duration-150 cursor-pointer active:scale-[0.98]"
            >
              <span>Sign Out</span>
            </button>
          </div>

        </div>
      </div>
    </nav>
  );
}