import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../api/Axiosinstance';
import AdminNavbar from '../admin/AdminNavbar';

export default function AllDocuments() {
  const navigate = useNavigate();

  // 1. STATE CONFIGURATION
  const [documents, setDocuments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typedSearch, setTypedSearch] = useState(''); 
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adminEmail, setAdminEmail] = useState('admin@docverify.io');

  // PAGINATION STATES
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  const ITEMS_PER_PAGE = 10;

  // DEBOUNCE EFFECT FOR SEARCH INPUT
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearchTerm(typedSearch);
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [typedSearch]);

  // 2. DATA SYNCHRONIZATION HOOK
  useEffect(() => {
    const fetchDocumentsData = async () => {
      try {
        setLoading(true);
        setError('');

        // Build the URL including active states
        const url = `documents/list/?status=${statusFilter}&search=${encodeURIComponent(searchTerm)}&page=${currentPage}`;

        const docsResponse = await axiosInstance.get(url);
        
        // Populate states dynamically using backend counts
        setDocuments(docsResponse.data.results || []);
        setTotalCount(docsResponse.data.count || 0);
        setHasNext(!!docsResponse.data.next);
        setHasPrevious(!!docsResponse.data.previous);

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
  }, [statusFilter, searchTerm, currentPage]); 

  // Dynamically computes total pages based on the exact filter result pool length
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE) || 1;

  const handleFilterChange = (newStatus) => {
    setStatusFilter(newStatus);
    setCurrentPage(1); // Reset to page 1 so fresh pools start at index 1
  };

  const handleSearchChange = (e) => {
    setTypedSearch(e.target.value); 
    setCurrentPage(1); 
  };

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

  const getAccuracyBadgeStyles = (score) => {
    if (score >= 80) return 'bg-emerald-50 text-emerald-700 border-emerald-200'; 
    if (score >= 60) return 'bg-amber-50 text-amber-700 border-amber-200';     
    return 'bg-rose-50 text-rose-700 border-rose-200';                        
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 antialiased font-sans">
      <AdminNavbar email={adminEmail} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">All Documents</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor document uploads, track processing status, and manage actions.</p>
        </div>

        {error && (
          <div className="p-4 mb-6 bg-rose-50 border border-rose-200 text-rose-700 font-medium rounded-xl text-sm max-w-xl">
            ⚠️ {error}
          </div>
        )}

        {/* CONTROLS BAR (Maintains active focus because it's detached from empty rendering checks) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="w-full sm:max-w-md relative">
            <input
              type="text"
              placeholder="Search user fullname or document type..."
              value={typedSearch} 
              onChange={handleSearchChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800 placeholder-gray-400"
            />
          </div>

          <div className="w-full sm:w-auto flex items-center space-x-2 self-start sm:self-auto">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Filter Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange(e.target.value)} 
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-800 cursor-pointer"
            >
              <option value="ALL">All Documents</option>
              <option value="PENDING">Pending Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="FAILED">OCR Failed</option>
            </select>
          </div>
        </div>

        {/* DATA CONTAINER PORTAL */}
        {loading && documents.length === 0 ? (
          <div className="flex justify-center items-center min-h-[350px]">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-800" />
          </div>
        ) : documents.length === 0 ? (
          /* Isolated Empty State Box */
          <div className="bg-white border border-slate-200 rounded-xl p-16 text-center shadow-sm">
            <span className="text-5xl block mb-4">📂</span>
            <h3 className="text-lg font-bold text-slate-900">No Matching Records Found</h3>
            <p className="text-gray-400 text-sm mt-1">We couldn't locate any records matching your active filter choices or search keywords.</p>
            <button 
              onClick={() => { setTypedSearch(''); setSearchTerm(''); setStatusFilter('ALL'); setCurrentPage(1); }}
              className="mt-5 text-xs font-bold text-slate-800 hover:underline cursor-pointer bg-transparent border-0 outline-none p-0"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          /* RESULTS DATA TABLE CONTAINER */
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden relative">
            {loading && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800 animate-pulse" />
            )}
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left">
                <thead className="bg-slate-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">User Full Name</th>
                    <th className="px-6 py-4">Document Type</th>
                    <th className="px-6 py-4">OCR Status</th>
                    <th className="px-6 py-4">OCR Accuracy</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Uploaded Date</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/50 transition duration-75">
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {doc.username || doc.fullname || 'Anonymous User'}
                      </td>
                      <td className="px-6 py-4 uppercase tracking-wider text-xs font-bold text-slate-600">
                        {(doc.document_type || 'Unclassified').replace(/_/g, ' ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getBadgeStyles(doc.ocr_status || 'PENDING', 'OCR')}>
                          {doc.ocr_status || 'PENDING'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${getAccuracyBadgeStyles(doc.ocr_accuracy)}`}>
                          {doc.ocr_accuracy !== undefined && doc.ocr_accuracy !== null ? `${doc.ocr_accuracy}%` : '0.0%'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getBadgeStyles(doc.status, 'STATUS')}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                        {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : 'Recent'}
                      </td>
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

            {/* DYNAMIC PAGINATION FOOTER */}
            {totalCount > ITEMS_PER_PAGE && (
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                <span className="text-xs font-semibold text-gray-400">
                  Showing page <span className="text-slate-700 font-bold">{currentPage}</span> of <span className="text-slate-700 font-bold">{totalPages}</span> — (<span className="text-slate-800 font-bold">{totalCount}</span> total items)
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    disabled={!hasPrevious}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-lg shadow-sm transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed select-none cursor-pointer"
                  >
                    ← Previous
                  </button>
                  
                  <div className="hidden md:flex items-center space-x-1">
                    {[...Array(totalPages)].map((_, index) => {
                      const pageNum = index + 1;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition flex items-center justify-center border cursor-pointer ${
                            currentPage === pageNum
                              ? 'bg-slate-800 text-white border-transparent'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    disabled={!hasNext}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-lg shadow-sm transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed select-none cursor-pointer"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}