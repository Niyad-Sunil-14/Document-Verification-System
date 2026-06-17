import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import axiosInstance from '../../../api/Axiosinstance';
import AdminNavbar from './AdminNavbar';

export default function AdminDashboard() {
  const navigate = useNavigate();

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
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 2. BACKEND CONNECTIONS MATRIX
  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        setLoading(true);
        setError('');

        // 🌟 Pull the complete verification log master list from your API
        // (Ensure your backend permissions allow staff access to this endpoint)
        const response = await axiosInstance.get('documents/list/');
        const docs = response.data;
        setDocuments(docs);

        // 🌟 CALCULATE CARD METRICS ON THE FLY FROM THE DB LOGS
        // Adjust these filters to match your backend model status fields exactly
        const pending = docs.filter(d => d.status === 'PENDING').length;
        const approved = docs.filter(d => d.status === 'APPROVED' || d.status === 'SUCCESS').length;
        const rejected = docs.filter(d => d.status === 'REJECTED').length;
        
        // OCR metrics look at whether text was extracted or if the pipeline hit an exception
        const processedOcr = docs.filter(d => d.extracted_text && d.extracted_text.trim().length > 0).length;
        const failedOcr = docs.filter(d => d.status === 'REJECTED' && (!d.extracted_text || d.extracted_text.trim() === '')).length;

        setMetrics({
          totalUsers: new Set(docs.map(d => d.user_id || d.user)).size, // Counts unique user accounts active in system
          totalDocuments: docs.length,
          pendingDocuments: pending,
          approvedDocuments: approved,
          rejectedDocuments: rejected,
          ocrProcessed: processedOcr,
          ocrFailed: failedOcr,
        });

      } catch (err) {
        console.error("Admin dashboard synchronization failure:", err);
        setError(err.response?.data?.detail || 'Failed to pull system compliance analytics.');
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  // 3. GRAPHIC BADGE CONFIGURATION
  const getStatusBadge = (status) => {
    const badges = {
      SUCCESS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
      REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
    };
    return `px-2.5 py-1 rounded-full text-xs font-bold border ${badges[status] || badges.PENDING}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col">
        <AdminNavbar />
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
        </div>
      </div>
    );
  }

  // 4. METRICS CARD STRUCTURAL SCHEMA
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
      <AdminNavbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* UPPER TITLE ROW */}
        <div className="mb-10 flex justify-between items-center">
          <div>
            <div className="inline-flex items-center space-x-2 bg-violet-50 text-violet-700 font-bold px-3 py-1 rounded-lg text-xs border border-violet-100 uppercase tracking-wider mb-2">
              <span>🛡️ Admin Central Command</span>
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

        {/* 🔥 THE REQUESTED METRIC CARDS GRID SECTION */}
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

        {/* ADMINISTRATIVE AUDIT LISTING DATA TABLE */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-900">Global Verification Stream (Latest Submissions)</h3>
            <span className="text-xs text-gray-400 font-mono">Real-time sync</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left">
              <thead className="bg-slate-50/70 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Storage Key ID</th>
                  <th className="px-6 py-4">Document Classification</th>
                  <th className="px-6 py-4">OCR Status Check</th>
                  <th className="px-6 py-4">Submission Date</th>
                  <th className="px-6 py-4">Audit Status</th>
                  <th className="px-6 py-4 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium">
                {documents.slice(0, 10).map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">#{doc.id}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">
                      <span className="mr-2">{doc.file?.toLowerCase().includes('.pdf') ? '📕' : '🖼️'}</span>
                      {doc.document_type || 'NOT SPECIFIED'}
                    </td>
                    <td className="px-6 py-4">
                      {doc.extracted_text && doc.extracted_text.trim().length > 0 ? (
                        <span className="text-xs font-semibold text-violet-600 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-md font-mono">
                          🧠 STRIPPED_OK
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                          ⚪ NO_TEXT_FOUND
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{doc.uploaded_at || 'Recent'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadge(doc.status)}>
                        {doc.status_display || doc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button 
                        onClick={() => navigate(`/documents/${doc.id}`)}
                        className="text-violet-600 hover:text-violet-900 font-bold transition-colors cursor-pointer"
                      >
                        Audit Details →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {documents.length === 0 && (
            <div className="p-12 text-center text-gray-400 text-sm">
              No files uploaded into the database ecosystem yet.
            </div>
          )}
        </div>

      </main>
    </div>
  );
}