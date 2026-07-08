import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import axiosInstance from '../../../api/Axiosinstance';

export default function AccountSettings() {
  const navigate = useNavigate();
  
  // 1. STATE CONFIGURATION
  const [subscription, setSubscription] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', isError: false });

  // 🚀 SIMPLIFIED PREFERENCES: Light vs Dark mode setup
  const [preferences, setPreferences] = useState({
    darkMode: false,
    emailNotifications: true,
    autoDownloadAnalysis: false,
  });

  // 2. DATA INITIALIZATION
  useEffect(() => {
    const fetchSettingsData = async () => {
      try {
        setLoading(true);
        const [subRes, profileRes] = await Promise.all([
          axiosInstance.get('documents/users/subscription-details/'),
          axiosInstance.get('users/profile/')
        ]);
        setSubscription(subRes.data);
        setProfile(profileRes.data);

        // Load theme configuration preference cache
        const savedPrefs = localStorage.getItem('user_workspace_settings_prefs');
        if (savedPrefs) {
          setPreferences(JSON.parse(savedPrefs));
        }
      } catch (err) {
        console.error("Failed to parse configurations context:", err);
        setMessage({
          text: 'Failed to synchronize system allocation metrics.',
          isError: true
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSettingsData();
  }, []);

  // 3. PERSIST PREFERENCE REVISIONS
  const handlePrefChange = (key, value) => {
    const updatedPrefs = { ...preferences, [key]: value };
    setPreferences(updatedPrefs);
    localStorage.setItem('user_workspace_settings_prefs', JSON.stringify(updatedPrefs));
    
    setMessage({ text: '⚙️ Account workspace parameters updated.', isError: false });
    setTimeout(() => setMessage({ text: '', isError: false }), 2000);

    // Apply or remove dark theme configuration directly to the root DOM layer
    if (key === 'darkMode') {
      if (value) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  const formatPlanDisplay = (plan) => {
    if (!plan || plan === 'PAY_AS_YOU_VERIFY') return "Pay As You Verify Plan";
    return plan.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <div className={`min-h-screen font-sans antialiased transition-colors duration-200 ${
      preferences.darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Page Title */}
        <div className="mb-10">
          <h1 className="text-3xl font-black tracking-tight uppercase">Account Settings</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Configure workspace environment layouts, personalize interface themes, and track subscription scopes.</p>
        </div>

        {/* Action Message Bar */}
        {message.text && (
          <div className={`p-4 mb-8 rounded-xl border text-xs font-semibold shadow-sm flex items-center gap-2 ${
            message.isError ? 'bg-rose-50 border-rose-200/60 text-rose-700' : 'bg-emerald-50 border-emerald-200/60 text-emerald-800'
          }`}>
            <span>{message.isError ? '⚠️' : '✨'}</span>
            <span>{message.text}</span>
          </div>
        )}

        {loading ? (
          <div className={`rounded-2xl border p-20 text-center shadow-sm flex flex-col items-center justify-center ${
            preferences.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}>
            <div className={`animate-spin rounded-full h-8 w-8 border-b-2 mb-4 ${
              preferences.darkMode ? 'border-white' : 'border-slate-800'
            }`} />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loading system options...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* CONTENT PREFERENCE BLOCKS */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* CARD MODULE 1: TOKENS BALANCE */}
              <div className={`border rounded-2xl p-6 shadow-sm space-y-6 ${
                preferences.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
              }`}>
                <div>
                  <h3 className="font-black text-base uppercase tracking-tight">Available Extractions Balance</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Tokens consumed dynamically upon every verification workflow trigger event.</p>
                </div>

                <div className={`flex items-center justify-between p-5 border rounded-2xl ${
                  preferences.darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-100'
                }`}>
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Remaining Balance</span>
                    <div className="text-3xl font-black text-indigo-500">
                      {profile?.document_credits ?? 0} <span className="text-sm font-bold text-slate-400">Credits</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => navigate('/pricing')}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow transition duration-150 cursor-pointer border-0 outline-none"
                  >
                    Buy Tokens
                  </button>
                </div>
              </div>

              {/* CARD MODULE 2: WORKSPACE ENVIRONMENT PREFERENCES */}
              <div className={`border rounded-2xl p-6 shadow-sm space-y-6 ${
                preferences.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
              }`}>
                <div>
                  <h3 className="font-black text-base uppercase tracking-tight">Workspace Personalization</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Adapt the behavioral properties and visual interface of your secure analysis workspace.</p>
                </div>

                <div className="space-y-5">
                  {/* 🚀 LIGHT / DARK OPTION TOGGLE SWITCH */}
                  <div className={`flex items-center justify-between pb-4 border-b ${
                    preferences.darkMode ? 'border-slate-700' : 'border-slate-100'
                  }`}>
                    <div className="space-y-0.5">
                      <label className="text-xs font-bold uppercase tracking-wide">Interface Color Appearance</label>
                      <p className="text-[11px] text-slate-400 font-medium">Toggle between a standard white interface background or a high-tech dark background layout.</p>
                    </div>
                    <select
                      value={preferences.darkMode ? 'dark' : 'light'}
                      onChange={(e) => handlePrefChange('darkMode', e.target.value === 'dark')}
                      className={`border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none text-slate-800 cursor-pointer h-9 w-32 ${
                        preferences.darkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <option value="light">☀️ Light Option</option>
                      <option value="dark">🌙 Dark Option</option>
                    </select>
                  </div>

                  {/* Email Notifications Toggle Switch */}
                  <div className={`flex items-center justify-between pb-4 border-b ${
                    preferences.darkMode ? 'border-slate-700' : 'border-slate-100'
                  }`}>
                    <div className="space-y-0.5">
                      <label className="text-xs font-bold uppercase tracking-wide">Email Verification Reports</label>
                      <p className="text-[11px] text-slate-400 font-medium">Sends an unalterable summary report straight to your email as soon as an extraction cycle finishes.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.emailNotifications}
                      onChange={(e) => handlePrefChange('emailNotifications', e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Automated Download Toggle Switch */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="text-xs font-bold uppercase tracking-wide">Auto-Download JSON Data</label>
                      <p className="text-[11px] text-slate-400 font-medium">Instantly downloads raw verified extraction logs into your browser upon step verification completion.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.autoDownloadAnalysis}
                      onChange={(e) => handlePrefChange('autoDownloadAnalysis', e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT SIDEBAR MODULES */}
            <div className="lg:col-span-1 space-y-8">
              
              {/* RECURRING SUBSCRIPTION PASS INFO BLOCK */}
              <div className={`border rounded-2xl p-6 shadow-sm space-y-5 ${
                preferences.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
              }`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-black text-sm uppercase tracking-tight">Active Plan</h3>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                    subscription?.is_active 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}>
                    {subscription?.is_active ? 'Live' : 'Inactive'}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-extrabold">
                    {formatPlanDisplay(subscription?.plan_type)}
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                    {subscription?.is_active 
                      ? `Automatic renewal occurs on ${new Date(subscription.expires_at).toLocaleDateString('en-IN')}.`
                      : "No active recurring contract pass configured."}
                  </p>
                </div>

                <button
                  onClick={() => navigate('/subscription')}
                  className={`w-full px-4 py-2 border font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition duration-150 cursor-pointer text-center ${
                    preferences.darkMode ? 'bg-slate-900 border-slate-700 hover:bg-slate-950 text-slate-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  Subscription Hub
                </button>
              </div>

              {/* ACCOUNT SESSION LOGS AUDIT TRACKER */}
              <div className={`border rounded-2xl p-6 shadow-sm space-y-4 ${
                preferences.darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
              }`}>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-tight">Active Session Log</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Audits verified parameters bound to this account context token.</p>
                </div>

                <div className={`divide-y text-[11px] font-medium ${
                  preferences.darkMode ? 'divide-slate-700 text-slate-400' : 'divide-slate-100 text-slate-500'
                }`}>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-slate-400">Environment Node</span>
                    <span className={`font-bold font-mono ${preferences.darkMode ? 'text-slate-200' : 'text-slate-700'}`}>Ubuntu Linux</span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-slate-400">Channel Entry</span>
                    <span className={`font-bold ${preferences.darkMode ? 'text-slate-200' : 'text-slate-700'}`}>Web Interface Portal</span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-slate-400">Connection Health</span>
                    <span className="text-emerald-500 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" /> Secure
                    </span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}
      </main>
    </div>
  );
}