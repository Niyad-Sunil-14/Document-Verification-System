import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import Navbar from './Navbar';
import axiosInstance from '../../../api/Axiosinstance';

export default function UserProfile() {
  const navigate = useNavigate();

  // 1. STATE MANAGEMENT
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Tab Controller: 'INFO' or 'SECURITY'
  const [activeTab, setActiveTab] = useState('INFO');

  // Form States
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ fullname: '', email: '' });
  const [passwordData, setPasswordData] = useState({ old_password: '', new_password: '', confirm_password: '' });
  
  // Status Flags
  const [isSaving, setIsSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState({ text: '', isError: false });

  const [showPasswords, setShowPasswords] = useState({ old: false, new: false, confirm: false });

  // 2. FETCH IDENTITY DATA ON MOUNT
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await axiosInstance.get('users/profile/'); 
        setUser(response.data);
        
        setFormData({
          fullname: response.data?.fullname || '',
          email: response.data?.email || '',
        });
      } catch (err) {
        console.error("Profile fetching failed:", err);
        setError(err.response?.data?.detail || 'Failed to establish connection to identity vault.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserProfile();
  }, []);

  // 3. TRACK VALUE STROKES
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  // 4. SUBMIT UPDATE DETAILED INFORMATION
  const handleSaveChanges = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setActionMessage({ text: '', isError: false });

      const response = await axiosInstance.put('users/profile/', formData);
      
      setUser(response.data); 
      setIsEditing(false); 
      setActionMessage({ text: '🎉 Profile changes saved successfully!', isError: false });
    } catch (err) {
      console.error("Failed executing profile updates:", err);
      setActionMessage({ 
        text: err.response?.data?.detail || 'Failed to update credentials. Please review field parameters.', 
        isError: true 
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 5. SUBMIT SECURITY VAULT UPDATE (PASSWORD CHANGE)
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      setActionMessage({ text: '⚠️ New password keys do not match your confirmation parameters.', isError: true });
      return;
    }

    try {
      setIsSaving(true);
      setActionMessage({ text: '', isError: false });

      // Change this endpoint to match your Django URL setup path (e.g., 'users/change-password/')
      await axiosInstance.put('users/change-password/', {
        old_password: passwordData.old_password,
        new_password: passwordData.new_password
      });

      setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
      setActionMessage({ text: '🛡️ Password updated successfully!', isError: false });
    } catch (err) {
      console.error("Password mutation failed:", err);
      setActionMessage({ 
        text: err.response?.data?.detail || 'Failed to modify credentials. Check your fields.', 
        isError: true 
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 6. TIMEOUT DISMISS TIMER
  useEffect(() => {
    if (actionMessage.text) {
      const timer = setTimeout(() => setActionMessage({ text: '', isError: false }), 4000);
      return () => clearTimeout(timer);
    }
  }, [actionMessage.text]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-md mx-auto pt-20 px-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
            <span className="text-4xl block mb-2">⚠️</span>
            <h3 className="text-lg font-bold text-slate-900">Connection Interrupted</h3>
            <p className="text-gray-400 text-sm mt-1">{error}</p>
            <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer">
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans antialiased">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* BACK NAVIGATION HEADER BAR */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Profile</h1>
            <p className="text-gray-500 mt-1">Manage your identity profiles, credentials, and verification clearance nodes.</p>
          </div>
          <button 
            onClick={() => navigate(-1)} 
            className="text-sm font-semibold text-gray-500 hover:text-slate-800 flex items-center space-x-1 transition cursor-pointer"
          >
            <span>← Back</span>
          </button>
        </div>

        {/* FEEDBACK STATUS TOAST WINDOW MESSAGES */}
        {actionMessage.text && (
          <div className={`mb-6 p-4 rounded-xl border text-sm font-bold text-center animate-fade-in ${
            actionMessage.isError 
              ? 'bg-rose-50 border-rose-200 text-rose-700' 
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            {actionMessage.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* LEFT PANEL: PROFILE CARD & TAB TOGGLES */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 text-center flex flex-col items-center">
              <div className="w-24 h-24 rounded-2xl bg-violet-600 text-white flex items-center justify-center font-black text-3xl uppercase shadow-md shadow-violet-200 mb-4">
                {user?.fullname ? user.fullname.charAt(0) : '?'}
              </div>
              
              <h2 className="text-lg font-bold text-slate-800 truncate max-w-full">
                {user?.fullname || 'System User'}
              </h2>

              <div className="mt-4 pt-4 border-t border-slate-100 w-full flex justify-center">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                  user?.is_staff ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {user?.is_staff ? '⚡ Global Staff Administrator' : '👤 Verified User'}
                </span>
              </div>
            </div>

            {/* TAB CONTROLLERS SLOTS */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-2 flex flex-col space-y-1">
              <button
                onClick={() => { setActiveTab('INFO'); setActionMessage({ text: '', isError: false }); }}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                  activeTab === 'INFO' ? 'bg-violet-50 text-violet-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>👤</span> <span>User Details</span>
              </button>
              <button
                onClick={() => { setActiveTab('SECURITY'); setActionMessage({ text: '', isError: false }); setIsEditing(false); }}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                  activeTab === 'SECURITY' ? 'bg-violet-50 text-violet-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>🔑</span> <span>Change Password</span>
              </button>
            </div>
          </div>

          {/* RIGHT WORKSPACE CONTEXT SLOTS */}
          <div className="lg:col-span-2 bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden min-h-[350px]">
            
            {/* TAB 1: GENERAL USER DETAILS LAYOUT CONTENT */}
            {activeTab === 'INFO' && (
              <>
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-900">
                    {isEditing ? 'Modify Identity Parameters' : 'User Details'}
                  </h3>
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl transition shadow-sm cursor-pointer"
                    >
                      ✏️ Edit Profile
                    </button>
                  )}
                </div>

                <form onSubmit={handleSaveChanges}>
                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                      <label htmlFor="fullname" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Name</label>
                      <div className="sm:col-span-2">
                        {isEditing ? (
                          <input type="text" id="fullname" name="fullname" value={formData.fullname} onChange={handleInputChange} required disabled={isSaving} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 transition text-slate-800 shadow-inner" />
                        ) : (
                          <span className="block text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-xl shadow-inner break-all">{user?.fullname || 'N/A'}</span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                      <label htmlFor="email" className="text-xs font-bold text-slate-400 uppercase tracking-wider">E Mail</label>
                      <div className="sm:col-span-2">
                        {isEditing ? (
                          <input type="email" id="email" name="email" value={formData.email} onChange={handleInputChange} required disabled={isSaving} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 transition text-slate-800 shadow-inner" />
                        ) : (
                          <span className="block text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-xl shadow-inner break-all">{user?.email || 'unlinked@identity.vault'}</span>
                        )}
                      </div>
                    </div>

                    {user?.date_joined && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date Joined</span>
                        <span className="sm:col-span-2 text-sm font-semibold text-slate-600 bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-xl shadow-inner select-none">{user.date_joined}</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-gray-400">
                    {isEditing ? (
                      <div className="flex items-center space-x-3 w-full justify-end">
                        <button type="button" disabled={isSaving} onClick={() => { setIsEditing(false); setFormData({ fullname: user?.fullname || '', email: user?.email || '' }); }} className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition cursor-pointer">Cancel</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition shadow-md flex items-center justify-center space-x-1.5 cursor-pointer">
                          {isSaving ? <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" /> : <span>Save Changes</span>}
                        </button>
                      </div>
                    ) : (
                      <span>Authentication Managed Server Side.</span>
                    )}
                  </div>
                </form>
              </>
            )}

            {/* 🔥 TAB 2: CHANGE PASSWORD SECURE INTERFACE CONFIG */}
            {activeTab === 'SECURITY' && (
              <>
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-sm font-bold text-slate-900">Change Password</h3>
                </div>

                <form onSubmit={handleUpdatePassword}>
                  <div className="p-6 space-y-5">
                    
                    {/* FIELD A: CURRENT PASSWORD */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                      <label htmlFor="old_password" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Password</label>
                      <div className="sm:col-span-2 relative">
                        <input
                          type={showPasswords.old ? "text" : "password"}
                          id="old_password"
                          name="old_password"
                          value={passwordData.old_password}
                          onChange={handlePasswordChange}
                          required
                          disabled={isSaving}
                          className="w-full bg-white border border-slate-200 rounded-xl pl-4 pr-12 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 transition text-slate-800 shadow-inner"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, old: !prev.old }))}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-slate-600 focus:outline-none transition cursor-pointer"
                        >
                          {showPasswords.old ? (<i class="fa-regular fa-eye"></i>) : (<i class="fa-regular fa-eye-slash"></i>)}
                        </button>
                      </div>
                    </div>

                    {/* FIELD B: NEW PASSWORD */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                      <label htmlFor="new_password" className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Password</label>
                      <div className="sm:col-span-2 relative">
                        <input
                          type={showPasswords.new ? "text" : "password"}
                          id="new_password"
                          name="new_password"
                          value={passwordData.new_password}
                          onChange={handlePasswordChange}
                          required
                          disabled={isSaving}
                          className="w-full bg-white border border-slate-200 rounded-xl pl-4 pr-12 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 transition text-slate-800 shadow-inner"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-slate-600 focus:outline-none transition cursor-pointer"
                        >
                          {showPasswords.new ? (<i class="fa-regular fa-eye"></i>) : (<i class="fa-regular fa-eye-slash"></i>)}
                        </button>
                      </div>
                    </div>

                    {/* FIELD C: CONFIRM NEW PASSWORD */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                      <label htmlFor="confirm_password" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Confirm New Password</label>
                      <div className="sm:col-span-2 relative">
                        <input
                          type={showPasswords.confirm ? "text" : "password"}
                          id="confirm_password"
                          name="confirm_password"
                          value={passwordData.confirm_password}
                          onChange={handlePasswordChange}
                          required
                          disabled={isSaving}
                          className="w-full bg-white border border-slate-200 rounded-xl pl-4 pr-12 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 transition text-slate-800 shadow-inner"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-slate-600 focus:outline-none transition cursor-pointer"
                        >
                          {showPasswords.confirm ? (<i class="fa-regular fa-eye"></i>) : (<i class="fa-regular fa-eye-slash"></i>)}
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* SECURITY ACTION BAR FOOTER */}
                  <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-end">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-5 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-bold text-xs rounded-xl transition shadow-md shadow-violet-200/50 flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      {isSaving ? (
                        <>
                          <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                          <span>Updating Server Registry...</span>
                        </>
                      ) : (
                        <span>Update Password</span>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}

          </div>

        </div>

      </main>
    </div>
  );
}