import React, { useState, useEffect } from 'react';
import axiosInstance from '../../../api/Axiosinstance';
import AdminNavbar from './AdminNavbar';

export default function AdminDashboard() {
  // 1. STATE MANAGEMENT
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalDocuments: 0,
    pendingDocuments: 0,
    approvedDocuments: 0,
    rejectedDocuments: 0,
    ocrProcessed: 0,
    ocrFailed: 0,
  });
  const [adminEmail, setAdminEmail] = useState('admin@docverify.io'); // 🔥 Added state fallback
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 2. BACKEND CONNECTIONS MATRIX
  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        setLoading(true);
        setError('');

        // Fetch metrics
        const metricsResponse = await axiosInstance.get('documents/admin-dashboard/');
        setMetrics(metricsResponse.data);

        // 🔥 Fetch the actual logged-in user profile details for the navbar
        const profileResponse = await axiosInstance.get('users/profile/');
        if (profileResponse.data?.email) {
          setAdminEmail(profileResponse.data.email);
        }

      } catch (err) {
        console.error("Admin dashboard synchronization failure:", err);
        setError(err.response?.data?.detail || 'Failed to pull system compliance analytics.');
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col">
        {/* Pass email state down */}
        <AdminNavbar email={adminEmail} /> 
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
        </div>
      </div>
    );
  }

  const cardData = [
    { id: 1, title: 'Total Users', value: metrics.totalUsers, icon: '👥', color: 'text-blue-600 bg-blue-50 border-blue-100' },
    { id: 2, title: 'Total Documents', value: metrics.totalDocuments, icon: '📂', color: 'text-slate-700 bg-slate-100 border-slate-200' },
    { id: 3, title: 'Pending Documents', value: metrics.pendingDocuments, icon: '⏳', color: 'text-amber-600 bg-amber-50 border-amber-200 animate-pulse' },
    { id: 4, title: 'Approved Documents', value: metrics.approvedDocuments, icon: '✅', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { id: 5, title: 'Rejected Documents', value: metrics.rejectedDocuments, icon: '✕', color: 'text-rose-600 bg-rose-50 border-rose-200' },
    { id: 6, title: 'OCR Processed Docs', value: metrics.ocrProcessed, icon: '🧠', color: 'text-violet-600 bg-violet-50 border-violet-200' },
    { id: 7, title: 'OCR Failed Docs', value: metrics.ocrFailed, icon: '⚠️', color: 'text-red-600 bg-red-50 border-red-200' },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans antialiased">
      {/* 🔥 FIX: Pass down the dynamic email address value */}
      <AdminNavbar email={adminEmail} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* UPPER TITLE ROW */}
        <div className="mb-10 flex justify-between items-center">
          <div>
            <div className="inline-flex items-center space-x-2 bg-violet-50 text-violet-700 font-bold px-3 py-1 rounded-lg text-xs border border-violet-100 uppercase tracking-wider mb-2">
              <span>🛡️ Admin Dashboard</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">System Controls & Compliance Logs</h1>
            <p className="text-gray-500 mt-1">Global oversight across unique users, file validation nodes, and system-wide Tesseract OCR metrics.</p>
          </div>
        </div>

        {error && (
          <div className="p-4 mb-8 bg-rose-50 border border-rose-200 text-rose-700 font-semibold rounded-2xl max-w-xl text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* METRIC CARDS GRID SECTION */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {cardData.map((card) => (
            <div 
              key={card.id} 
              className={`bg-white border rounded-2xl p-6 shadow-sm flex items-center justify-between transition hover:shadow-md ${
                card.id === 3 ? 'border-amber-200 ring-2 ring-amber-500/5' : 'border-slate-200'
              }`}
            >
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{card.title}</p>
                <p className="text-3xl font-black text-slate-800 tracking-tight">{card.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center text-xl shadow-inner ${card.color}`}>
                {card.icon}
              </div>
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}