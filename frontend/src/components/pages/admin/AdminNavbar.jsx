import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

export default function AdminNavbar({ email = "admin@docverfy.io" }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // State to track if the mobile navigation panel is open
  const [isOpen, setIsOpen] = useState(false);

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

          {/* DESKTOP CENTER: LINKS (Hidden on mobile screens) */}
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

          {/* DESKTOP RIGHT: PROFILE & LOGOUT (Hidden on mobile screens) */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex flex-col text-right">
              <span className="text-xs font-black text-slate-200">System Admin</span>
              <span className="text-[10px] font-mono font-medium text-slate-400">{email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center px-4 py-2 bg-slate-800 hover:bg-rose-950 border border-slate-700/60 hover:border-rose-900/50 rounded-xl text-xs font-bold text-slate-300 hover:text-rose-200 transition duration-150 cursor-pointer"
            >
              Sign Out
            </button>
          </div>

          {/* MOBILE BUTTON: Hamburger/X Toggle (Hidden on desktop screens) */}
          <div className="flex md:hidden items-center">
            <button 
              onClick={() => setIsOpen(!isOpen)} 
              type="button" 
              className="text-slate-400 hover:text-white focus:outline-none p-1 cursor-pointer"
            >
              {isOpen ? (
                // "X" Close Icon
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                // Hamburger Menu Icon
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* MOBILE DROPDOWN PANEL: Conditionally rendered on toggle */}
      {isOpen && (
        <div className="md:hidden bg-slate-900 border-t border-slate-800 px-4 pt-2 pb-4 space-y-3">
          <div className="flex flex-col space-y-1">
            <Link 
              to="/admin-dashboard" 
              onClick={() => setIsOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/admin-dashboard') ? 'bg-slate-800 text-violet-400' : 'text-slate-300'}`}
            >
              Dashboard
            </Link>
            <Link 
              to="/all-documents" 
              onClick={() => setIsOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/all-documents') ? 'bg-slate-800 text-violet-400' : 'text-slate-300'}`}
            >
              All Documents
            </Link>
            <Link 
              to="/all-users" 
              onClick={() => setIsOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/all-users') ? 'bg-slate-800 text-violet-400' : 'text-slate-300'}`}
            >
              All Users
            </Link>
          </div>
          
          <hr className="border-slate-800" />
          
          {/* User Meta Data & Sign Out Actions for mobile layout */}
          <div className="px-3 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-200">System Admin</span>
              <span className="text-[10px] font-mono text-slate-400 max-w-[180px] truncate">{email}</span>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                handleLogout();
              }}
              className="px-3 py-1.5 bg-rose-950/40 text-rose-300 border border-rose-900/50 rounded-lg text-xs font-bold cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}