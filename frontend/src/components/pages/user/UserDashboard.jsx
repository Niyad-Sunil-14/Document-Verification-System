import React, { useState, useEffect } from 'react';
import Navbar from './Navbar'; 
import { Link, useNavigate } from 'react-router'; 
import axiosInstance from '../../../api/Axiosinstance';

export default function UserDashboard() {
  const navigate = useNavigate();

  // 1. STATE MANAGEMENT
  const [user, setUser] = useState();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [documents, setDocuments] = useState([]);
  const [filterType, setFilterType] = useState('ALL');

  // 🚀 NEW STATES: Track total entire database counts from paginated meta-data
  const [totalCount, setTotalCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);

  // 2. INGESTION MATRIX
  useEffect(() => {
    const fetchList = async () => {
      try {
        // Fetch all statuses to calculate overall metric summaries
        const response = await axiosInstance.get('documents/list/');
        
        if (response.data && response.data.results) {
          // 🚀 FIX: Store only the paginated results chunk array into documents
          setDocuments(response.data.results);
          
          // 🚀 FIX: Extract absolute unfiltered counts from the backend pagination envelope
          setTotalCount(response.data.count || 0);
        } else {
          // Fallback if backend pagination gets toggled off
          const dataArray = response.data || [];
          setDocuments(dataArray);
          setTotalCount(dataArray.length);
        }
      } catch (err) {
        console.error("Dashboard table collection fetch failed:", err);
      }
    };

    // 🚀 NEW METRIC TUNNEL: Fetches specific status total counts for the database view
    // (Since standard pagination filters the main count, fetching these guarantees accurate metrics)
    const fetchSummaryMetrics = async () => {
      try {
        const [approvedRes, pendingRes, rejectedRes] = await Promise.all([
          axiosInstance.get('documents/list/?status=APPROVED'),
          axiosInstance.get('documents/list/?status=PENDING'),
          axiosInstance.get('documents/list/?status=REJECTED')
        ]);
        
        setApprovedCount(approvedRes.data.count ?? approvedRes.data.length ?? 0);
        setPendingCount(pendingRes.data.count ?? pendingRes.data.length ?? 0);
        setRejectedCount(rejectedRes.data.count ?? rejectedRes.data.length ?? 0);
      } catch (err) {
        console.error("Failed pulling cross-sectional metrics loops:", err);
      }
    };

    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get('users/profile/'); 
        setUser(response.data);
      } catch (err) {
        console.error("Profile fetching failed:", err);
        setError(err.response?.data?.detail || 'Failed to establish connection to identity vault.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserProfile();
    fetchList();
    fetchSummaryMetrics();
  }, []);

  // 3. FILTER CONDITIONAL LOGIC (For the localized table preview)
  const filteredDocuments = documents.filter((doc) => {
    if (filterType === 'ALL') return true;
    return doc.status === filterType;
  });

  const generateDocumentLabel = (doc) => {
    if (!doc) return "Document Resource";
    const typeRaw = doc.document_type || "GENERAL";
    const cleanType = typeRaw
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());

    const isPdf = doc.file?.toLowerCase().includes('.pdf');
    const labelSuffix = isPdf ? "PDF" : "Document";

    return `${cleanType} ${labelSuffix}`;
  };

  const getStatusBadge = (status) => {
    const badges = {
      SUCCESS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
      REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
    };
    return `px-3 py-1 rounded-full text-xs font-semibold border ${badges[status] || badges.PENDING}`;
  };

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

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans antialiased">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* UPPER BANNER SECTION */}
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Welcome, {user?.fullname || 'User'}</h1>
          <p className="text-gray-500 mt-1">Upload your credentials, monitor ongoing audits, and view compliance status logs.</p>
        </div>

        {/* METRIC SUMMARIES */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Total Documents Uploaded</p>
            {/* 🚀 FIXED: Shows total count from full database instead of just page 1 array length */}
            <p className="text-3xl font-bold text-slate-800 mt-2">{totalCount}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Verified Secure</p>
            {/* 🚀 FIXED: Shows database-wide approved totals */}
            <p className="text-3xl font-bold text-emerald-600 mt-2">{approvedCount}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Pending</p>
            {/* 🚀 FIXED: Shows database-wide pending totals */}
            <p className="text-3xl font-bold text-amber-600 mt-2">{pendingCount}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Rejected</p>
            {/* 🚀 FIXED: Shows database-wide rejected totals */}
            <p className="text-3xl font-bold text-rose-600 mt-2">{rejectedCount}</p>
          </div>
        </div>

        {/* Upload Action Hub Button */}
        <div className="mt-10 mb-10 flex flex-col sm:flex-row justify-center lg:justify-start items-center gap-4">
          <Link 
            to="/upload"
            className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 active:translate-y-0.5 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all duration-150 text-center cursor-pointer"
          >
            Upload New Document
          </Link>
        </div>

        {/* DATA FILTERING BAR & RECENT REVIEWS CONTAINER */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          
          <div className="px-6 py-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
            <h3 className="text-base font-bold text-slate-900">Recent Activity (Latest 3)</h3>
          </div>

          {/* TABLE PLATFORM */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left">
              <thead className="bg-slate-50/70 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Document</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Uploaded at</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium">
                {filteredDocuments.slice(0, 3).map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4 text-slate-900 whitespace-nowrap flex items-center space-x-2">
                      <span className="truncate max-w-xs font-semibold text-slate-800">
                        {generateDocumentLabel(doc)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 font-mono text-xs">
                      {doc.document_type || 'GENERAL'}
                    </td>
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                      {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : 'Just Now'}
                    </td>
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
                        Details →
                      </button>
                    </td>
                  </tr>
                ))}

                {/* THE VIEW ALL ROW */}
                {totalCount > 0 && (
                  <tr className="bg-slate-50/30 hover:bg-slate-50 transition-colors">
                    <td colSpan="5" className="px-6 py-3.5 text-center">
                      <Link to='/documents'
                        className="inline-flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-violet-600 hover:text-violet-700 transition-colors"
                      >
                        <span>View All Documents ({totalCount})</span>
                        <span>→</span>
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredDocuments.length === 0 && (
            <div className="p-12 text-center text-gray-400 text-sm">
              No verification tasks found in your document log.
            </div>
          )}
        </div>

      </main>
    </div>
  );
}