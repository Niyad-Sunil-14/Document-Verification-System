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
  const [filterStatus, setFilterStatus] = useState('ALL');

  // 2. FETCH ALL USER DOCUMENTS ON MOUNT
  useEffect(() => {
    const fetchAllDocuments = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await axiosInstance.get('documents/list/');
        setDocuments(response.data);
      } catch (err) {
        console.error("Failed fetching comprehensive document archive:", err);
        setError(err.response?.data?.detail || 'Could not connect to document repository.');
      } finally {
        setLoading(false);
      }
    };

    fetchAllDocuments();
  }, []);

  

  // Dynamic Badge Styling Utility Function
  const getStatusBadge = (status) => {
    const badges = {
      SUCCESS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
      REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
    };
    return `px-2.5 py-1 rounded-full text-xs font-bold border ${badges[status] || badges.PENDING}`;
  };

  // 🔥 NEW IMPROVEMENT: Generates a human-readable title card description text label
  const generateDocumentLabel = (doc) => {
    if (!doc) return "Document Resource";
    
    const typeRaw = doc.document_type || "GENERAL";
    
    // Formats uppercase snake_case (e.g., 'DRIVING_LICENSE' -> 'Driving License')
    const cleanType = typeRaw
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());

    const isPdf = doc.file?.toLowerCase().includes('.pdf');
    const labelSuffix = isPdf ? "PDF" : "Document";

    return `${cleanType} ${labelSuffix}`;
  };


  // 3. 🔥 FIXED LIVE FILTER & SEARCH LOGIC WITH CARD LABEL MATCHING
  const filteredDocuments = documents.filter((doc) => {
    // 1. Check status filter step
    const docStatus = doc.status || 'PENDING';
    const matchesStatus = filterStatus === 'ALL' || docStatus === filterStatus;
    
    // 2. Compute the exact card title being shown to the user
    const cardTitle = generateDocumentLabel(doc).toLowerCase();
    
    // 3. Safely gather other searchable content strings
    const textSnippet = doc.extracted_text?.toLowerCase() || '';
    const cleanQuery = searchQuery.toLowerCase();

    // 4. Combined Smart Search Matrix:
    // Matches if the user types anything belonging to the Title, the Storage Key ID, or parsed text!
    const matchesSearch = 
      cardTitle.includes(cleanQuery) || 
      `#${doc.id}`.includes(cleanQuery) ||
      textSnippet.includes(cleanQuery);

    return matchesStatus && matchesSearch;
  });

  // 4. ROUTER NAVIGATION ACTION
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

        {/* CONTROLS BAR */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4 mb-8 flex flex-col md:flex-row gap-4 justify-between items-center">
          
          {/* Live Text Search Box Container */}
          <div className="relative w-full md:w-80">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Search file path or parsed OCR text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 transition shadow-inner"
            />
          </div>

          {/* Filter Selection Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold text-gray-500 w-full md:w-auto overflow-x-auto">
            {['ALL', 'PENDING', 'SUCCESS', 'REJECTED'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`flex-1 md:flex-initial px-4 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  filterStatus === status 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'hover:text-slate-900'
                }`}
              >
                {status === 'SUCCESS' ? 'Success' : status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

        </div>

        {/* MAIN DATA FEED OUTPUT PORTAL */}
        {loading ? (
          <div className="flex justify-center items-center min-h-[350px]">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
          </div>
        ) : error ? (
          <div className="p-6 bg-rose-50 border border-rose-200 text-rose-700 font-semibold rounded-2xl max-w-md mx-auto text-center">
            ⚠️ {error}
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center max-w-xl mx-auto shadow-sm">
            <span className="text-5xl block mb-4">📂</span>
            <h3 className="text-lg font-bold text-slate-900">No Documents Found</h3>
            <p className="text-gray-400 text-sm mt-1">We couldn't locate any items matching your active search filters or keywords.</p>
            <button 
              onClick={() => { setSearchQuery(''); setFilterStatus('ALL'); }}
              className="mt-5 text-xs font-bold text-violet-600 hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocuments.map((doc) => (
              <div 
                key={doc.id} 
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden"
              >
                {/* Upper Card Grid Content Area */}
                <div className="p-5 flex-1 space-y-4">
                  <div className="flex items-start justify-between space-x-2">
                    <div className="flex items-center space-x-3 truncate">
                      <span className="text-3xl flex-shrink-0">
                        {doc.file?.toLowerCase().includes('.pdf') ? '📕' : '📄'}
                      </span>
                      <div className="truncate">
                        {/* 🔥 FIXED: Uses our formatted text generator instead of the hash filename */}
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
                      {doc.status_display || doc.status}
                    </span>
                  </div>

                  {/* Document Timestamp Details */}
                  <div className="text-xs font-medium text-gray-400 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>Uploaded: <span className="text-slate-700 font-semibold">{doc.uploaded_at || 'Just Now'}</span></div>
                    <div className="truncate">Storage Key: <span className="font-mono text-slate-600">#{doc.id}</span></div>
                  </div>
                </div>

                {/* Card Action Button Footer */}
                <div className="bg-slate-50 border-t border-slate-100 px-5 py-3 flex justify-center items-center text-xs font-bold">
                    <button 
                        onClick={() => viewDetail(doc.id)}
                        className="text-violet-600 hover:text-violet-800 transition flex items-center space-x-1 cursor-pointer bg-transparent border-0"
                    >
                        <span>View Analysis Details</span> 
                        <span>→</span>
                    </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}