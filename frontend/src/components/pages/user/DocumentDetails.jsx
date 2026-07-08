import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import axiosInstance from '../../../api/Axiosinstance';

// -------------------------------------------------------------
// SUB-COMPONENT: TIMELINE LIFECYCLE TRACKER
// -------------------------------------------------------------
function StatusTracker({ status = 'PENDING', uploadedAt = 'Recent' }) {
  const steps = [
    {
      id: 1,
      title: 'Document Uploaded',
      description: `Uploaded on ${uploadedAt || 'Recent'}`,
      isComplete: true, 
      isCurrent: false,
      color: 'border-violet-600 bg-violet-600 text-white dark:border-violet-500 dark:bg-violet-500',
    },
    {
      id: 2,
      title: 'Automated Scan',
      description: status === 'PENDING' ? 'Extracting data...' : 'Data extracted cleanly.',
      isComplete: status !== 'PENDING',
      isCurrent: status === 'PENDING',
      color: status !== 'PENDING' ? 'border-violet-600 bg-violet-600 text-white dark:border-violet-500 dark:bg-violet-500' : 'border-violet-600 text-violet-600 bg-white dark:bg-slate-900 dark:text-violet-400 animate-pulse',
    },
    {
      id: 3,
      title: 'Verification Completed',
      description: status === 'PENDING' ? 'Awaiting evaluation...' : 'Validation complete.',
      isComplete: status !== 'PENDING',
      isCurrent: false, 
      color: status !== 'PENDING' ? 'border-violet-600 bg-violet-600 text-white dark:border-violet-500 dark:bg-violet-500' : 'border-slate-200 text-slate-400 bg-white dark:border-slate-700 dark:text-slate-500 dark:bg-slate-900',
    },
    {
      id: 4,
      title: status === 'REJECTED' ? 'Document Rejected' : 'Document Approved',
      description: status === 'PENDING' ? 'Final evaluation pending.' : status === 'APPROVED' ? 'Document verified secure.' : 'Failed clearance checks.',
      isComplete: status === 'APPROVED' || status === 'REJECTED',
      isCurrent: false,
      color: status === 'APPROVED' ? 'border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500' : status === 'REJECTED' ? 'border-rose-600 bg-rose-600 text-white dark:border-rose-500 dark:bg-rose-500' : 'border-slate-200 text-slate-400 bg-white dark:border-slate-700 dark:text-slate-500 dark:bg-slate-900',
    },
  ];

  return (
    /* 🚀 FIXED: Status tracker panel handles dark layout surface backgrounds cleanly */
    <div className="bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 shadow-sm rounded-2xl p-6 sm:p-8 mb-8 transition-colors duration-200">
      <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-6">Real-Time Processing Lifecycle</h3>
      <div className="relative">
        <div className="absolute left-4 top-1 bottom-1 w-0.5 bg-slate-100 dark:bg-slate-700 md:left-0 md:top-4 md:w-full md:h-0.5 md:bottom-auto z-0" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
          {steps.map((step, index) => (
            <div key={step.id} className="flex md:flex-col items-start gap-4 md:gap-0">
              <div className="md:mb-4 flex-shrink-0">
                <div className={`w-8 h-8 rounded-xl border-2 font-bold text-xs flex items-center justify-center transition-all shadow-sm ${step.color}`}>
                  {step.isComplete && index === 3 ? (status === 'REJECTED' ? '✕' : '✓') : step.isComplete ? '✓' : step.id}
                </div>
              </div>
              <div className="flex-1">
                <h4 className={`text-sm font-bold tracking-tight ${
                  step.isCurrent 
                    ? 'text-violet-600 dark:text-violet-400' 
                    : step.isComplete && status === 'REJECTED' && index === 3 
                    ? 'text-rose-600 dark:text-rose-400' 
                    : step.isComplete && status === 'APPROVED' && index === 3 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-slate-900 dark:text-slate-100'
                }`}>{step.title}</h4>
                <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// MAIN COMPONENT
// -------------------------------------------------------------
export default function DocumentDetails() {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchDocumentDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axiosInstance.get(`documents/detail/${id}/`);
      setDocument(response.data);
    } catch (err) {
      console.error("Ingestion fault:", err);
      setError(err.response?.data?.detail || 'Failed to pull document details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDocumentDetails();
  }, [id]);

  const handleFileReplacement = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    try {
      setUploading(true);
      setError('');
      setSuccessMessage(''); 

      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await axiosInstance.patch(`documents/detail/${id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setDocument(response.data);
      setSuccessMessage('Your document has been re-uploaded successfully and sent back to review!');
      
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);

    } catch (err) {
      console.error('File replacement patch exception:', err);
      setError(err.response?.data?.detail || 'Failed to replace the rejected document.');
    } finally {
      setUploading(false);
    }
  };

  const getDisplayFilename = (url) => {
    if (!url) return "Cloud_Document_Source.png";
    const segments = url.split('/');
    return decodeURIComponent(segments[segments.length - 1]);
  };

  const generateDocumentLabel = (doc) => {
    if (!doc) return "Document Resource";
    const typeRaw = doc.document_type || "GENERAL";
    return `${typeRaw.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())} ${doc.file?.toLowerCase().includes('.pdf') ? "PDF" : "Document"}`;
  };

  const getStatusBadge = (status) => {
    const badges = { 
      APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50', 
      SUCCESS: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50', 
      PENDING: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50', 
      REJECTED: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50' 
    };
    return `px-3 py-1 rounded-full text-xs font-bold border ${badges[status] || badges.PENDING}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 flex flex-col transition-colors duration-200">
        <Navbar />
        <div className="flex-1 flex justify-center items-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600 dark:border-violet-400" /></div>
      </div>
    );
  }

  const fileUrl = document?.file || '';
  const isPdf = fileUrl.toLowerCase().includes('.pdf');
  const activeFileName = getDisplayFilename(fileUrl);
  const isRejected = document?.status === 'REJECTED';

  return (
    /* 🚀 FIXED: Dynamic wrapper background tracking dark theme adjustments */
    <div className="min-h-screen bg-slate-50/50 text-slate-900 dark:bg-slate-900 dark:text-slate-100 font-sans antialiased transition-colors duration-200">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <button onClick={() => navigate(-1)} className="text-xs font-bold text-gray-400 hover:text-slate-800 dark:hover:text-slate-200 tracking-wider uppercase mb-2 cursor-pointer bg-transparent border-0 p-0 outline-none">← Back</button>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white truncate max-w-xl">{generateDocumentLabel(document)}</h1>
          </div>
        </div>

        {/* Emerald Action Banner Notice */}
        {successMessage && (
          <div className="p-4 mb-6 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-400 text-sm font-semibold rounded-2xl flex items-center space-x-2 shadow-sm animate-fade-in relative transition-colors">
            <span>✅</span>
            <span className="flex-1">{successMessage}</span>
            <button 
              onClick={() => setSuccessMessage('')} 
              className="text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-200 text-xs font-bold bg-transparent border-0 cursor-pointer px-1 outline-none"
            >
              ✕
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 mb-6 bg-rose-50 border border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 font-medium rounded-2xl text-sm max-w-xl flex items-center space-x-2 transition-colors">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <StatusTracker status={document?.status} uploadedAt={document?.uploaded_at} />

        {/* DYNAMIC COMPLIANCE BLOCK: REMARKS INFO + INLINE RE-UPLOAD CONSOLE */}
        {isRejected && (
          <div className="bg-gradient-to-r from-rose-50 to-white dark:from-rose-950/10 dark:to-slate-800 border border-rose-200 dark:border-rose-900/40 rounded-2xl p-5 mb-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in transition-colors">
            <div className="flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 flex items-center justify-center font-bold text-lg flex-shrink-0 mt-0.5 border border-rose-200 dark:border-rose-900/50 shadow-sm transition-colors">✕</div>
              <div className="space-y-1">
                <h3 className="text-sm font-black uppercase tracking-wider text-rose-800 dark:text-rose-400">Your Document has been Rejected</h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                  Reason : <span className="italic font-semibold text-slate-900 dark:text-white">"{document?.remarks || 'No detailed reason provided.'}"</span>
                </p>
              </div>
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileReplacement} 
              className="hidden" 
              accept="image/*,.pdf"
            />

            <button
              disabled={uploading}
              onClick={() => fileInputRef.current.click()}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition duration-150 cursor-pointer shadow-sm active:scale-[0.98] disabled:opacity-50 whitespace-nowrap self-stretch md:self-auto text-center border-0 outline-none"
            >
              {uploading ? 'Uploading...' : 'Re Upload File'}
            </button>
          </div>
        )}

        {/* METADATA OVERVIEW BAR */}
        {/* 🚀 FIXED: Summary parameter strips follow light/dark border layout metrics */}
        <div className="bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 shadow-sm rounded-2xl p-5 mb-8 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm font-semibold transition-colors duration-200">
          <div><span className="text-xs text-gray-400 dark:text-slate-400 block font-medium">Document Type</span><span className="text-slate-800 dark:text-slate-200 uppercase font-mono text-xs block mt-1">{document?.document_type || 'NOT SPECIFIED'}</span></div>
          <div><span className="text-xs text-gray-400 block font-medium">ID Reference</span><span className="text-slate-700 dark:text-slate-300 font-mono text-xs block mt-1">#{document?.id}</span></div>
          <div><span className="text-xs text-gray-400 block font-medium">Current Status</span><div className="mt-1"><span className={getStatusBadge(document?.status)}>{document?.status}</span></div></div>
          <div><span className="text-xs text-gray-400 block font-medium">Uploaded Date</span><span className="text-slate-600 dark:text-slate-400 block text-xs mt-1 truncate">{document?.uploaded_at || 'Recent'}</span></div>
        </div>

        {/* CORE WORKSPACE */}
        <div className="max-w-3xl mx-auto">
          <div className="bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 shadow-sm rounded-2xl overflow-hidden flex flex-col min-h-[350px] justify-between transition-colors duration-200">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30"><h3 className="text-sm font-bold text-slate-900 dark:text-white">File Resource</h3></div>
            <div className="p-8 flex flex-col items-center justify-center text-center space-y-5 flex-1">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm ${isRejected ? 'bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-400' : 'bg-violet-50 text-violet-600 dark:bg-violet-950/20 dark:text-violet-400'}`}>{isPdf ? '📕' : '🖼️'}</div>
              <div>
                <h4 className="text-base font-bold text-slate-800 dark:text-slate-200 truncate max-w-xs mx-auto">{document?.filename || activeFileName}</h4>
                <p className="text-xs text-gray-400 dark:text-slate-400 mt-1 uppercase font-mono tracking-wider">Format Type: {isPdf ? 'PDF' : 'Image File'}</p>
              </div>
              <div className="pt-2 w-full max-w-xs">
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className={`w-full inline-flex items-center justify-center px-6 py-3.5 font-bold text-sm rounded-xl shadow-md transition duration-150 text-center cursor-pointer select-none text-decoration-none ${isRejected ? 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900' : 'bg-violet-600 hover:bg-violet-700 text-white'}`}>
                  <span>Open Document</span><span className="ml-2 text-xs">↗</span>
                </a>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/20 px-5 py-3 border-t border-slate-100 dark:border-slate-700 text-[11px] text-gray-400 dark:text-slate-500 font-medium text-center transition-colors">Assets are loaded directly over secure Cloudinary CDN media servers.</div>
          </div>
        </div>
      </main>
    </div>
  );
}