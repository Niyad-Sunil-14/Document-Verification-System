import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import axiosInstance from '../../../api/Axiosinstance';

export default function UserProfile() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // 1. STATE MANAGEMENT
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('INFO');

  // Form States
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ fullname: '', email: '' });
  const [passwordData, setPasswordData] = useState({ old_password: '', new_password: '', confirm_password: '' });
  
  // Multi-step verification workflow states
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isUploadingPic, setIsUploadingPic] = useState(false);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  // Profile Picture Upload handler routing directly to multipart streams
  const handleProfilePicUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setIsUploadingPic(true);
      const picFormData = new FormData();
      picFormData.append('profile_picture', file);

      const response = await axiosInstance.patch('users/profile/', picFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setUser(response.data);
      setActionMessage({ text: '📸 Profile picture updated successfully!', isError: false });
    } catch (err) {
      console.error("Avatar streaming error:", err);
      setActionMessage({ text: 'Failed to upload profile picture.', isError: true });
    } finally {
      setIsUploadingPic(false);
    }
  };

  // Initiates the multi-step verification tree if the email field has changed
  const handleSaveChanges = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setActionMessage({ text: '', isError: false });

      if (formData.email !== user.email) {
        await axiosInstance.post('users/request-email-update/', { email: formData.email });
        setIsOtpStep(true);
        setActionMessage({ text: '📩 An authorization code was sent to your new email.', isError: false });
      } else {
        const response = await axiosInstance.put('users/profile/', { fullname: formData.fullname });
        setUser(response.data);
        setIsEditing(false);
        setActionMessage({ text: '🎉 Profile changes saved successfully!', isError: false });
      }
    } catch (err) {
      console.error("Failed executing profile updates:", err);
      setActionMessage({ text: err.response?.data?.detail || 'Failed to update credentials.', isError: true });
    } finally {
      setIsSaving(false);
    }
  };

  // Finalizes database verification once the OTP is input correctly
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await axiosInstance.post('users/confirm-email-update/', { code: otpCode });
      
      const finalResponse = await axiosInstance.put('users/profile/', { fullname: formData.fullname });
      setUser(finalResponse.data);
      
      setIsEditing(false);
      setIsOtpStep(false);
      setOtpCode('');
      setActionMessage({ text: '🎉 Email verified and updated successfully!', isError: false });
    } catch (err) {
      console.error("OTP verification failure:", err);
      setActionMessage({ text: err.response?.data?.detail || 'Invalid confirmation token.', isError: true });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (actionMessage.text && !isOtpStep) {
      const timer = setTimeout(() => setActionMessage({ text: '', isError: false }), 4000);
      return () => clearTimeout(timer);
    }
  }, [actionMessage.text, isOtpStep]);

  // Helper date formatter function
  const formatDate = (rawDate) => {
    if (!rawDate) return 'N/A';
    const cleanCheck = rawDate.replace(/[TZtz]/g, '');
    if (/[a-zA-Z]/.test(cleanCheck)) return rawDate;

    try {
      const date = new Date(rawDate);
      return isNaN(date.getTime()) 
        ? rawDate 
        : new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }).format(date);
    } catch (e) {
      return rawDate;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 flex flex-col transition-colors duration-200">
        <Navbar />
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600 dark:border-violet-400" />
        </div>
      </div>
    );
  }

  return (
    /* 🚀 FIXED: Dynamic canvas layer matches system dark option variables */
    <div className="min-h-screen bg-slate-50/50 text-slate-900 dark:bg-slate-900 dark:text-slate-100 font-sans antialiased transition-colors duration-200">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Profile</h1>
            <p className="text-gray-500 dark:text-slate-400 mt-1">Manage your identity data sheet, upload authorization assets, and configure email credentials.</p>
          </div>
          <button 
            onClick={() => navigate(-1)} 
            className="text-sm font-semibold text-gray-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center space-x-1 transition cursor-pointer bg-transparent border-0 outline-none"
          >
            <span>← Back</span>
          </button>
        </div>

        {actionMessage.text && (
          <div className={`mb-6 p-4 rounded-xl border text-sm font-bold text-center animate-fade-in ${
            actionMessage.isError 
              ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/40 dark:text-rose-400' 
              : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400'
          }`}>{actionMessage.text}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* LEFT PANEL: INTERACTIVE AVATAR UPLOADER + TAB TOGGLES */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 shadow-sm rounded-2xl p-6 text-center flex flex-col items-center relative group transition-colors">
              
              <div className="w-24 h-24 rounded-2xl bg-violet-600 text-white flex items-center justify-center font-black text-3xl uppercase shadow-md mb-4 relative overflow-hidden border border-slate-100 dark:border-slate-700">
                {user?.profile_picture ? (
                  <img src={user.profile_picture} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{user?.fullname ? user.fullname.charAt(0) : '?'}</span>
                )}
                
                {isUploadingPic && (
                  <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  </div>
                )}
              </div>

              <input type="file" ref={fileInputRef} onChange={handleProfilePicUpload} className="hidden" accept="image/*" />
              <button 
                type="button" 
                onClick={() => fileInputRef.current.click()}
                className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-bold tracking-wide transition cursor-pointer mb-2 bg-transparent border-0 outline-none"
              >
                📸 Update Picture
              </button>
              
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 truncate max-w-full">{user?.fullname || 'System User'}</h2>
              
              <div className="mt-2 pt-4 border-t border-slate-100 dark:border-slate-700 w-full flex flex-col items-center space-y-2">
                {user?.is_subscribed ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/60 shadow-sm">
                    👑 Premium Pro Member
                  </span>
                ) : (
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                    user?.is_staff 
                      ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/50' 
                      : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/50'
                  }`}>{user?.is_staff ? '⚡ Global Staff Administrator' : '👤 Verified User'}</span>
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 shadow-sm rounded-2xl p-2 flex flex-col space-y-1 transition-colors">
              <button 
                onClick={() => { setActiveTab('INFO'); setActionMessage({ text: '', isError: false }); setIsEditing(false); setIsOtpStep(false); }} 
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer border-0 outline-none ${
                  activeTab === 'INFO' 
                    ? 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/40'
                }`}
              >
                <span>👤</span> <span>User Details</span>
              </button>
              <button 
                onClick={() => { setActiveTab('SECURITY'); setActionMessage({ text: '', isError: false }); setIsEditing(false); setIsOtpStep(false); }} 
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer border-0 outline-none ${
                  activeTab === 'SECURITY' 
                    ? 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/40'
                }`}
              >
                <span>🔑</span> <span>Change Password</span>
              </button>
            </div>
          </div>

          {/* RIGHT WORKSPACE CONTEXT SLOTS */}
          <div className="lg:col-span-2 bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 shadow-sm rounded-2xl overflow-hidden min-h-[350px] transition-colors duration-200">
            
            {activeTab === 'INFO' && (
              <>
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isEditing ? (isOtpStep ? 'Confirm Verification Code' : 'Modify Your Details') : 'User Details'}
                  </h3>
                  {!isEditing && (
                    <button 
                      type="button" 
                      onClick={() => setIsEditing(true)} 
                      className="px-3.5 py-1.5 bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-xs rounded-xl transition shadow-sm cursor-pointer outline-none"
                    >
                      ✏️ Edit Profile
                    </button>
                  )}
                </div>

                {!isOtpStep ? (
                  <form onSubmit={handleSaveChanges}>
                    <div className="p-6 space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center pb-4 border-b border-slate-100 dark:border-slate-700 last:border-0 last:pb-0">
                        <label htmlFor="fullname" className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Name</label>
                        <div className="sm:col-span-2">
                          {isEditing ? (
                            <input 
                              type="text" 
                              id="fullname" 
                              name="fullname" 
                              value={formData.fullname} 
                              onChange={handleInputChange} 
                              required 
                              disabled={isSaving} 
                              className="w-full bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition shadow-inner" 
                            />
                          ) : (
                            <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 border border-slate-100 dark:bg-slate-900 dark:border-slate-700 px-4 py-2.5 rounded-xl break-all shadow-inner">
                              {user?.fullname || 'N/A'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center pb-4 border-b border-slate-100 dark:border-slate-700 last:border-0 last:pb-0">
                        <label htmlFor="email" className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">E Mail</label>
                        <div className="sm:col-span-2">
                          {isEditing ? (
                            <input 
                              type="email" 
                              id="email" 
                              name="email" 
                              value={formData.email} 
                              onChange={handleInputChange} 
                              required 
                              disabled={isSaving} 
                              className="w-full bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition shadow-inner" 
                            />
                          ) : (
                            <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 border border-slate-100 dark:bg-slate-900 dark:border-slate-700 px-4 py-2.5 rounded-xl break-all shadow-inner">
                              {user?.email || 'unlinked@identity.vault'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Subscription Status & Expiry Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center pb-4 border-b border-slate-100 dark:border-slate-700 last:border-0 last:pb-0">
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Subscription Expiry</span>
                        <div className="sm:col-span-2">
                          {user?.is_subscribed ? (
                            <span className="block text-sm font-semibold text-amber-700 bg-amber-50/60 border border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-400 px-4 py-2.5 rounded-xl shadow-inner">
                              Expires on {formatDate(user?.subscription_expires_at)} 
                            </span>
                          ) : (
                            <span className="block text-sm font-semibold text-gray-500 dark:text-slate-400 bg-slate-50 border border-slate-100 dark:bg-slate-900 dark:border-slate-700 px-4 py-2.5 rounded-xl shadow-inner select-none">
                              No Active Subscription Pass
                            </span>
                          )}
                        </div>
                      </div>

                      {(user?.date_joined || user?.joined_date) && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center pb-4 border-b border-slate-100 dark:border-slate-700 last:border-0 last:pb-0">
                          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Date Joined</span>
                          <span className="sm:col-span-2 text-sm font-semibold text-slate-600 dark:text-slate-400 bg-slate-50 border border-slate-100 dark:bg-slate-900 dark:border-slate-700 px-4 py-2.5 rounded-xl shadow-inner select-none">
                            {formatDate(user.date_joined || user.joined_date)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/30 px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                      {isEditing ? (
                        <div className="flex items-center space-x-3 w-full justify-end">
                          <button type="button" disabled={isSaving} onClick={() => { setIsEditing(false); setFormData({ fullname: user?.fullname || '', email: user?.email || '' }); }} className="px-4 py-2 bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition cursor-pointer">Cancel</button>
                          <button type="submit" disabled={isSaving} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600 text-white font-bold rounded-xl transition shadow-md flex items-center justify-center space-x-1.5 cursor-pointer border-0">
                            {isSaving ? <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" /> : <span>{formData.email !== user?.email ? 'Send Verification Code' : 'Save Changes'}</span>}
                          </button>
                        </div>
                      ) : <span>&nbsp;</span>}
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp}>
                    <div className="p-6 space-y-4 text-center max-w-sm mx-auto">
                      <span className="text-3xl block mb-1">🔑</span>
                      <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">Email Verification Pending</h4>
                      <p className="text-xs text-gray-400 dark:text-slate-400 leading-relaxed">Please check the inbox of your new address: <span className="font-bold text-slate-700 dark:text-slate-200">{formData.email}</span> and input the 6-digit confirmation token.</p>
                      
                      <input 
                        type="text" 
                        maxLength={6} 
                        placeholder="000000" 
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                        required
                        disabled={isSaving}
                        className="w-full text-center tracking-[0.5em] text-lg font-mono font-bold bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition shadow-inner" 
                      />
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/30 px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end space-x-3">
                      <button type="button" disabled={isSaving} onClick={() => { setIsOtpStep(false); setOtpCode(''); setActionMessage({ text: '', isError: false }); }} className="px-4 py-2 bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition cursor-pointer text-xs">Back</button>
                      <button type="submit" disabled={isSaving || otpCode.length < 6} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-md flex items-center justify-center space-x-1.5 cursor-pointer text-xs border-0">
                        {isSaving ? <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" /> : <span>Confirm & Update Email</span>}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}

            {/* TAB 2: CHANGE PASSWORD */}
            {activeTab === 'SECURITY' && (
              <>
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Change Password</h3>
                </div>
                <form onSubmit={handleUpdatePassword}>
                  <div className="p-6 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                      <label htmlFor="old_password" className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Current Password</label>
                      <div className="sm:col-span-2 relative">
                        <input type={showPasswords.old ? "text" : "password"} id="old_password" name="old_password" value={passwordData.old_password} onChange={handlePasswordChange} required disabled={isSaving} className="w-full bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 rounded-xl pl-4 pr-12 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition text-slate-800 shadow-inner" />
                        <button type="button" onClick={() => setShowPasswords(prev => ({ ...prev, old: !prev.old }))} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none transition cursor-pointer bg-transparent border-0 outline-none">{showPasswords.old ? (<i className="fa-regular fa-eye"></i>) : (<i className="fa-regular fa-eye-slash"></i>)}</button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                      <label htmlFor="new_password" className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">New Password</label>
                      <div className="sm:col-span-2 relative">
                        <input type={showPasswords.new ? "text" : "password"} id="new_password" name="new_password" value={passwordData.new_password} onChange={handlePasswordChange} required disabled={isSaving} className="w-full bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 rounded-xl pl-4 pr-12 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition text-slate-800 shadow-inner" />
                        <button type="button" onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none transition cursor-pointer bg-transparent border-0 outline-none">{showPasswords.new ? (<i className="fa-regular fa-eye"></i>) : (<i className="fa-regular fa-eye-slash"></i>)}</button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                      <label htmlFor="confirm_password" className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Confirm New Password</label>
                      <div className="sm:col-span-2 relative">
                        <input type={showPasswords.confirm ? "text" : "password"} id="confirm_password" name="confirm_password" value={passwordData.confirm_password} onChange={handlePasswordChange} required disabled={isSaving} className="w-full bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 rounded-xl pl-4 pr-12 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition text-slate-800 shadow-inner" />
                        <button type="button" onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none transition cursor-pointer bg-transparent border-0 outline-none">{showPasswords.confirm ? (<i className="fa-regular fa-eye"></i>) : (<i className="fa-regular fa-eye-slash"></i>)}</button>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 flex items-center justify-center">
                    <button type="submit" disabled={isSaving} className="px-5 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center space-x-2 cursor-pointer border-0">
                      {isSaving ? (<><div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" /><span>Updating Server Registry...</span></>) : <span>Update Password</span>}
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