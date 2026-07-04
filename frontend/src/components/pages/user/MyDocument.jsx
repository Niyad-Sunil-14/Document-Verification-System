import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import Navbar from './Navbar';
import axiosInstance from '../../../api/Axiosinstance';

export default function MyDocument() {
  const navigate = useNavigate();

  // 1. STATE MANAGEMENT
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typedSearch, setTypedSearch] = useState(''); // 🚀 Fluid immediate state for text typing
  const [filterStatus, setFilterStatus] = useState('ALL');

  // PAGINATION STATES
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  
  const ITEMS_PER_PAGE = 12;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE) || 1;

  // 🚀 DEBOUNCE EFFECT FOR SEARCH INPUT
  // Delays pushing changes to searchQuery by 400ms while user is actively typing
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearchQuery(typedSearch);
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [typedSearch]);

  // 2. FETCH USER DOCUMENTS (RE-FIRES ON FILTER, SEARCH, OR PAGE CHANGES)
  useEffect(() => {
    const fetchUserDocuments = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Build query string combining pagination, filter status, and debounced search
        const url = `documents/list/?status=${filterStatus}&search=${encodeURIComponent(searchQuery)}&page=${currentPage}`;
        const response = await axiosInstance.get(url);
        
        // Populate states dynamically using backend counts
        setDocuments(response.data.results || []);
        setTotalCount(response.data.count || 0);
        setHasNext(!!response.data.next);
        setHasPrevious(!!response.data.previous);
        
      } catch (err) {
        console.error("Error loading documents:", err);
        setError("Failed to load your documents configuration.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserDocuments();
  }, [filterStatus, searchQuery, currentPage]); 

  // Tab switch handler
  const handleFilterChange = (status) => {
    setFilterStatus(status);
    setCurrentPage(1); // Reset to page 1 for the new selection pool
  };

  // Text input change handler
  const handleSearchChange = (e) => {
    setTypedSearch(e.target.value);
    setCurrentPage(1); // Reset to page 1 when starting a new search
  };

  // Dynamic Badge Styling Utility Function
  const getStatusBadge = (status) => {
    const badges = {
      APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
      REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
    };
    return `px-2.5 py-1 rounded-full text-xs font-bold border ${badges[status] || badges.PENDING}`;
  };

  // Generates a human-readable title card description text label
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

  const viewDetail = (id) => {
    navigate(`/documents/${id}`);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans antialiased">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* HEADER TITLE ROW */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">My Documents</h1>
            <p className="text-gray-500 mt-1">Review, search, and manage your complete document history.</p>
          </div>
        </div>

        {/* CONTROLS BAR (Placed statically outside conditional loops to maintain typing focus) */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4 mb-8 flex flex-col md:flex-row gap-4 justify-between items-center">
          
          {/* Text Search Box */}
          <div className="relative w-full md:w-80">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Search document type or details..."
              value={typedSearch} 
              onChange={handleSearchChange}
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 transition shadow-inner"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold text-gray-500 w-full md:w-auto overflow-x-auto">
            {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((status) => (
              <button
                key={status}
                onClick={() => handleFilterChange(status)}
                className={`flex-1 md:flex-initial px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  filterStatus === status 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'hover:text-slate-900'
                }`}
              >
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

        </div>

        {/* MAIN CONTENT FEED AREA */}
        {loading ? (
          <div className="flex justify-center items-center min-h-[350px]">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
          </div>
        ) : error ? (
          <div className="p-6 bg-rose-50 border border-rose-200 text-rose-700 font-semibold rounded-2xl max-w-md mx-auto text-center">
            ⚠️ {error}
          </div>
        ) : documents.length === 0 ? (
          /* 🚀 Clean Empty State container isolated below the search bar to preserve keyboard focus */
          <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center max-w-xl mx-auto shadow-sm">
            <span className="text-5xl block mb-4">📂</span>
            <h3 className="text-lg font-bold text-slate-900">No Documents Found</h3>
            <p className="text-gray-400 text-sm mt-1">We couldn't locate any items matching your active search filters or keywords.</p>
            <button 
              onClick={() => { setTypedSearch(''); setSearchQuery(''); setFilterStatus('ALL'); setCurrentPage(1); }}
              className="mt-5 text-xs font-bold text-violet-600 hover:underline cursor-pointer bg-transparent border-none p-0 outline-none"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          /* Dynamic Grid Feed */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc) => (
              <div 
                key={doc.id} 
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden"
              >
                <div className="p-5 flex-1 space-y-4">
                  <div className="flex items-start justify-between space-x-2">
                    <div className="flex items-center space-x-3 truncate">
                      <span className="text-3xl flex-shrink-0">
                        {doc.file?.toLowerCase().includes('.pdf') ? '📕' : '📄'}
                      </span>
                      <div className="truncate">
                        <h3 className="text-sm font-bold text-slate-900 truncate max-w-[180px]" title={generateDocumentLabel(doc)}>
                          {generateDocumentLabel(doc)}
                        </h3>
                        {doc.extracted_text && (
                          <p className="text-[10px] text-gray-400 block truncate max-w-[180px] italic mt-0.5">
                            "{doc.extracted_text.slice(0, 30)}..."
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={getStatusBadge(doc.status)}>
                      {doc.status}
                    </span>
                  </div>

                  <div className="text-xs font-medium text-gray-400 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>Uploaded: <span className="text-slate-700 font-semibold">{doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : 'Just Now'}</span></div>
                    <div className="truncate">Storage Key: <span className="font-mono text-slate-600">#{doc.id}</span></div>
                  </div>
                </div>

                <div className="bg-slate-50 border-t border-slate-100 px-5 py-3 flex justify-center items-center text-xs font-bold">
                    <button 
                        onClick={() => viewDetail(doc.id)}
                        className="text-violet-600 hover:text-violet-800 transition flex items-center space-x-1 cursor-pointer bg-transparent border-0 outline-none"
                    >
                        <span>View Analysis Details</span> 
                        <span>→</span>
                    </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* DYNAMIC PAGINATION CONTROLLER PANEL */}
        {!loading && totalCount > ITEMS_PER_PAGE && (
          <div className="px-6 py-4 bg-white border border-slate-200 mt-6 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
            <span className="text-xs font-semibold text-gray-400">
              Showing page <span className="text-slate-700 font-bold">{currentPage}</span> of <span className="text-slate-700 font-bold">{totalPages}</span> — (<span className="text-slate-800 font-bold">{totalCount}</span> documents)
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

      </main>
    </div>
  );
}