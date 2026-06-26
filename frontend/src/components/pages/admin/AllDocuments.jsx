import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../api/Axiosinstance';
import AdminNavbar from '../admin/AdminNavbar';

export default function AllDocuments() {
  const navigate = useNavigate();

  // 1. STATE CONFIGURATION
  const [documents, setDocuments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adminEmail, setAdminEmail] = useState('admin@docverify.io');

  // 2. DATA SYNCHRONIZATION HOOK
  useEffect(() => {
    const fetchDocumentsData = async () => {
      try {
        setLoading(true);
        setError('');

        const docsResponse = await axiosInstance.get('documents/list/');
        setDocuments(docsResponse.data);

        const profileResponse = await axiosInstance.get('users/profile/');
        if (profileResponse.data?.email) {
          setAdminEmail(profileResponse.data.email);
        }
      } catch (err) {
        console.error("Failed to pull document registry records:", err);
        setError(err.response?.data?.detail || 'Failed to populate document records.');
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentsData();
  }, []);

  // 3. COLOR PALETTE MAP FOR BADGES
  const getBadgeStyles = (status, type) => {
    if (type === 'STATUS') {
      const badges = {
        APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        SUCCESS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
        REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
      };
      return `px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badges[status] || 'bg-slate-100 text-slate-600'}`;
    } else {
      const ocrBadges = {
        PROCESSED: 'bg-violet-50 text-violet-700 border-violet-200',
        FAILED: 'bg-red-50 text-red-700 border-red-200',
        PENDING: 'bg-slate-50 text-slate-500 border-slate-200',
      };
      return `px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${ocrBadges[status] || 'bg-slate-100 text-slate-500'}`;
    }
  };

  // 🔥 NEW: Color-coded styling utility for the global text quality accuracy column
  const getAccuracyBadgeStyles = (score) => {
    if (score >= 90) return 'bg-emerald-50 text-emerald-700 border-emerald-200'; // High Quality
    if (score >= 70) return 'bg-amber-50 text-amber-700 border-amber-200';     // Medium Quality Warning
    return 'bg-rose-50 text-rose-700 border-rose-200';                        // Low Quality Alarm
  };

  // 4. FILTERING COMPUTATION
  const filteredDocuments = documents.filter((doc) => {
    const usernameStr = doc.username || doc.user?.username || doc.user_username || '';
    
    const matchesSearch = 
      usernameStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.document_type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(doc.id).includes(searchTerm);

    const matchesStatus = statusFilter === 'ALL' || doc.status === statusFilter || doc.ocr_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <AdminNavbar email={adminEmail} />
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 antialiased font-sans">
      <AdminNavbar email={adminEmail} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* HEADER SECTION */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">All Documents</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor document uploads, track processing status, and manage actions.</p>
        </div>

        {error && (
          <div className="p-4 mb-6 bg-rose-50 border border-rose-200 text-rose-700 font-medium rounded-xl text-sm max-w-xl">
            ⚠️ {error}
          </div>
        )}

        {/* CONTROLS BAR */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="w-full sm:max-w-md relative">
            <input
              type="text"
              placeholder="Search by username or document type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800 placeholder-gray-400"
            />
          </div>

          <div className="w-full sm:w-auto flex items-center space-x-2 self-start sm:self-auto">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Filter Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-800"
            >
              <option value="ALL">All Documents</option>
              <option value="PENDING">Pending Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="FAILED">OCR Failed</option>
            </select>
          </div>
        </div>

        {/* RESULTS DATA TABLE CONTAINER */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left">
              <thead className="bg-slate-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Username</th>
                  <th className="px-6 py-4">Document Type</th>
                  <th className="px-6 py-4">OCR Status</th>
                  {/* 🔥 NEW THEAD TH: Accuracy Column Title Header */}
                  <th className="px-6 py-4">OCR Accuracy</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Uploaded Date</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/50 transition duration-75">
                    
                    {/* USERNAME */}
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {doc.username || doc.user?.username || doc.user_username || 'Unknown User'}
                    </td>
                    
                    {/* DOCUMENT TYPE */}
                    <td className="px-6 py-4 uppercase tracking-wider text-xs font-bold text-slate-600">
                      {(doc.document_type || 'Unclassified').replace(/_/g, ' ')}
                    </td>
                    
                    {/* OCR STATUS */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getBadgeStyles(doc.ocr_status || 'PENDING', 'OCR')}>
                        {doc.ocr_status || 'PENDING'}
                      </span>
                    </td>

                    {/* 🔥 NEW TD: Render dynamic accuracy evaluation tags */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${getAccuracyBadgeStyles(doc.ocr_accuracy)}`}>
                        {doc.ocr_accuracy !== undefined && doc.ocr_accuracy !== null ? `${doc.ocr_accuracy}%` : '0.0%'}
                      </span>
                    </td>
                    
                    {/* STATUS */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getBadgeStyles(doc.status, 'STATUS')}>
                        {doc.status}
                      </span>
                    </td>

                    {/* UPLOADED DATE */}
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                      {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : 'Recent'}
                    </td>
                    
                    {/* SIMPLIFIED VIEW ACTION */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => navigate(`/admin/documents/${doc.id}`)}
                        className="text-xs bg-slate-100 hover:bg-slate-800 hover:text-white px-3 py-1.5 rounded-md font-semibold transition border border-transparent cursor-pointer"
                      >
                        View
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* EMPTY STATE */}
          {filteredDocuments.length === 0 && (
            <div className="p-16 text-center text-gray-400 text-sm">
              No documents matched the selected criteria.
            </div>
          )}
        </div>

      </main>
    </div>
  );
}