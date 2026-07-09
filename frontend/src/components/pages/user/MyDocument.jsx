import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import Navbar from './Navbar';
import axiosInstance from '../../../api/Axiosinstance';

export default function MyDocument() {
  const navigate = useNavigate();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(false); 
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typedSearch, setTypedSearch] = useState(''); 
  const [filterStatus, setFilterStatus] = useState('ALL');

  // PAGINATION STATES
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  
  const ITEMS_PER_PAGE = 12;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE) || 1;

  // DEBOUNCE EFFECT FOR SEARCH INPUT
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearchQuery(typedSearch);
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [typedSearch]);

  // 2. FETCH USER DOCUMENTS
  useEffect(() => {
    const fetchUserDocuments = async () => {
      try {
        if (currentPage === 1) {
          setLoading(true);
        } else {
          setBackgroundLoading(true);
        }
        setError('');
        
        const url = `documents/list/?status=${filterStatus}&search=${encodeURIComponent(searchQuery)}&page=${currentPage}`;
        const response = await axiosInstance.get(url);
        
        setDocuments(response.data.results || []);
        setTotalCount(response.data.count || 0);
        setHasNext(!!response.data.next);
        setHasPrevious(!!response.data.previous);
        
      } catch (err) {
        console.error("Error loading documents:", err);
        setError("Failed to load your documents configuration.");
      } finally {
        setLoading(false);
        setBackgroundLoading(false); 
      }
    };

    fetchUserDocuments();
  }, [filterStatus, searchQuery, currentPage]); 

  const handleFilterChange = (e, status) => {
    e.preventDefault();
    setFilterStatus(status);
    setCurrentPage(1); 
  };

  const handleSearchChange = (e) => {
    setTypedSearch(e.target.value);
    setCurrentPage(1); 
  };

  const handlePageSelect = (e, pageNum) => {
    e.preventDefault(); 
    setCurrentPage(pageNum);
  };

  const handleNextPage = (e) => {
    e.preventDefault();
    if (hasNext) setCurrentPage(prev => prev + 1);
  };

  const handlePrevPage = (e) => {
    e.preventDefault();
    if (hasPrevious) setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  // 🚀 UPDATED BADGES: Enhanced contrasting variants for dark layout mode surfaces
  const getStatusBadge = (status) => {
    const badges = {
      APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50',
      PENDING: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50',
      REJECTED: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50',
    };
    return `px-2.5 py-1 rounded-full text-xs font-bold border ${badges[status] || badges.PENDING}`;
  };

  const generateDocumentLabel = (doc) => {
    if (!doc) return "Document Resource";
    const typeRaw = doc.document_type || "GENERAL";
    const cleanType = typeRaw
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());

    const isPdf = doc.file?.toLowerCase().includes('.pdf');
    return `${cleanType} ${isPdf ? "PDF" : "Document"}`;
  };

  const viewDetail = (id) => {
    navigate(`/documents/${id}`);
  };

  return (
    /* 🚀 FIXED: Appended viewport context tracking light/dark theme shifts toggles */
    <div className="min-h-screen bg-slate-50/50 text-slate-900 dark:bg-slate-900 dark:text-slate-100 font-sans antialiased transition-colors duration-200">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* HEADER TITLE ROW */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">My Documents</h1>
            <p className="text-gray-500 dark:text-slate-400 mt-1">Review, search, and manage your complete document history.</p>
          </div>
        </div>

        {/* CONTROLS BAR */}
        {/* 🚀 FIXED: Search bars and category filter container adapt layout surface values dynamically */}
        <div className="bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 shadow-sm rounded-2xl p-4 mb-8 flex flex-col md:flex-row gap-4 justify-between items-center transition-colors duration-200">
          <div className="relative w-full md:w-80">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Search document type or details..."
              value={typedSearch} 
              onChange={handleSearchChange}
              className="w-full bg-slate-50/50 border border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition shadow-inner"
            />
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-xs font-bold text-gray-500 dark:text-slate-400 w-full md:w-auto overflow-x-auto transition-colors">
            {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((status) => (
              <button
                key={status}
                type="button" 
                onClick={(e) => handleFilterChange(e, status)}
                className={`flex-1 md:flex-initial px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  filterStatus === status 
                    ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm' 
                    : 'hover:text-slate-900 dark:hover:text-slate-200'
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
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600 dark:border-violet-400" />
          </div>
        ) : error ? (
          <div className="p-6 bg-rose-50 border border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 font-semibold rounded-2xl max-w-md mx-auto text-center">
            ⚠️ {error}
          </div>
        ) : documents.length === 0 ? (
          <div className="bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 rounded-2xl p-16 text-center max-w-xl mx-auto shadow-sm transition-colors">
            <span className="text-5xl block mb-4">📂</span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Documents Found</h3>
            <p className="text-gray-400 dark:text-slate-400 text-sm mt-1">We couldn't locate any items matching your active search filters.</p>
            <button 
              type="button"
              onClick={(e) => { e.preventDefault(); setTypedSearch(''); setSearchQuery(''); setFilterStatus('ALL'); setCurrentPage(1); }}
              className="mt-5 text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer bg-transparent border-none p-0 outline-none"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          /* Grid Wrapper maintains structure opacity with a background dark/light mode overlay protection system */
          <div className={`relative transition-opacity duration-200 ${backgroundLoading ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
            
            {backgroundLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400" />
              </div>
            )}

            {/* 🚀 FIXED: Individual Document Grid Cards completely converted for dark theme presentation */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map((doc) => (
                <div 
                  key={doc.id} 
                  className="bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden"
                >
                  <div className="p-5 flex-1 space-y-4">
                    <div className="flex items-start justify-between space-x-2">
                      <div className="flex items-center space-x-3 truncate">
                        <span className="text-3xl flex-shrink-0">
                          {doc.file?.toLowerCase().includes('.pdf') ? '📕' : '📄'}
                        </span>
                        <div className="truncate">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[180px]" title={generateDocumentLabel(doc)}>
                            {generateDocumentLabel(doc)}
                          </h3>
                          {doc.extracted_text && (
                            <p className="text-[10px] text-gray-400 dark:text-slate-400 block truncate max-w-[180px] italic mt-0.5">
                              "{doc.extracted_text.slice(0, 30)}..."
                            </p>
                          )}
                        </div>
                      </div>
                      <span className={getStatusBadge(doc.status)}>
                        {doc.status}
                      </span>
                    </div>

                    <div className="text-xs font-medium text-gray-400 dark:text-slate-400 space-y-1 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-700/60">
                      <div>Uploaded: <span className="text-slate-700 dark:text-slate-300 font-semibold">{doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : 'Just Now'}</span></div>
                      <div className="truncate">Storage Key: <span className="font-mono text-slate-600 dark:text-slate-400">#{doc.id}</span></div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border-t border-slate-100 dark:bg-slate-900/20 dark:border-slate-700 px-5 py-3 flex justify-center items-center text-xs font-bold">
                      <button 
                          type="button"
                          onClick={() => viewDetail(doc.id)}
                          className="text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 transition flex items-center space-x-1 cursor-pointer bg-transparent border-0 outline-none"
                      >
                          <span>View Analysis Details</span> 
                          <span>→</span>
                      </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DYNAMIC PAGINATION CONTROLLER PANEL */}
        {/* 🚀 FIXED: Updated structural layout cards for multi-mode matching layouts */}
        {!loading && totalCount > ITEMS_PER_PAGE && (
          <div className="px-6 py-4 bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 mt-6 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm transition-colors duration-200">
            <span className="text-xs font-semibold text-gray-400 dark:text-slate-400">
              Showing page <span className="text-slate-700 dark:text-slate-300 font-bold">{currentPage}</span> of <span className="text-slate-700 dark:text-slate-300 font-bold">{totalPages}</span> — (<span className="text-slate-800 dark:text-slate-200 font-bold">{totalCount}</span> documents)
            </span>

            <div className="flex items-center space-x-2">
              <button
                type="button" 
                disabled={!hasPrevious || backgroundLoading}
                onClick={handlePrevPage} 
                className="px-3.5 py-2 bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-lg shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed select-none cursor-pointer"
              >
                ← Previous
              </button>
              
              <div className="hidden md:flex items-center space-x-1">
                {[...Array(totalPages)].map((_, index) => {
                  const pageNum = index + 1;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      disabled={backgroundLoading}
                      onClick={(e) => handlePageSelect(e, pageNum)} 
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition flex items-center justify-center border cursor-pointer ${
                        currentPage === pageNum
                          ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 border-transparent'
                          : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={!hasNext || backgroundLoading}
                onClick={handleNextPage} 
                className="px-3.5 py-2 bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-lg shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed select-none cursor-pointer"
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