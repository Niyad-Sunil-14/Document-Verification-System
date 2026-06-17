import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router';

export default function AdminNavbar() {
  const navigate = useNavigate();
  const location = useLocation();

  // 1. GLOBAL LOGOUT TRIGGER HANDLER
  const handleLogout = () => {
    // Clear out active identity token maps from memory buffers
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    
    // Kick context back down to authentication landing matrix
    navigate('/login');
  };

  // Helper function to handle active page highlight indicators
  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-slate-900 border-b border-slate-800 text-white shadow-md select-none sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* LEFT REGION: BRAND EMBLEM & SECURITY LAYER SIGNAL */}
          <div className="flex items-center space-x-4">
            <Link to="/admin" className="flex items-center space-x-2 bg-transparent border-0 cursor-pointer p-0 group">
              <span className="text-2xl transition duration-150 group-hover:scale-105">🛡️</span>
              <span className="font-black text-lg tracking-tight bg-gradient-to-r from-violet-400 to-indigo-300 bg-clip-text text-transparent">
                OmniScan
              </span>
            </Link>
            
            {/* Strict Global Staff System Signaler Badge */}
            <div className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold font-mono bg-red-500/10 text-red-400 border border-red-500/20 uppercase tracking-widest">
              Admin Mode
            </div>
          </div>

          {/* CENTER REGION: MODULE NAVIGATION ANCHORS */}
          <div className="hidden md:flex items-center space-x-1 text-sm font-bold">
            <Link 
              to="/admin" 
              className={`px-3 py-2 rounded-xl transition duration-150 ${
                isActive('/admin') 
                  ? 'bg-slate-800 text-violet-400 shadow-inner' 
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              Control Center
            </Link>
            <Link 
              to="/documents" 
              className={`px-3 py-2 rounded-xl transition duration-150 ${
                isActive('/documents') 
                  ? 'bg-slate-800 text-violet-400 shadow-inner' 
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              Document Registry
            </Link>
          </div>

          {/* RIGHT REGION: PROFILE SYSTEM & EXIT ACTIONS ACTION NODE */}
          <div className="flex items-center space-x-4">
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-xs font-black text-slate-200">System Admin</span>
              <span className="text-[10px] font-mono font-medium text-slate-500">root@omniscan.io</span>
            </div>

            {/* EXIT DISPATCH PORTAL TRIGGERS */}
            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-rose-950 border border-slate-700/60 hover:border-rose-900/50 rounded-xl text-xs font-bold text-slate-300 hover:text-rose-200 transition duration-150 cursor-pointer active:scale-[0.98]"
            >
              <span>Sign Out</span>
              <span className="text-[10px]">Logout ↩</span>
            </button>
          </div>

        </div>
      </div>
    </nav>
  );
}