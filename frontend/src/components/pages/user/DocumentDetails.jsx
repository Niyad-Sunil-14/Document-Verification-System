import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import Navbar from './Navbar';
import axiosInstance from '../../../api/Axiosinstance';

// -------------------------------------------------------------
// SUB-COMPONENT: REAL-TIME TIMELINE LIFECYCLE TRACKER
// -------------------------------------------------------------
function StatusTracker({ status = 'PENDING', uploadedAt = 'Recent' }) {
  const steps = [
    {
      id: 1,
      title: 'Document Uploaded',
      description: `Successfully uploaded on ${uploadedAt || 'Recent'}`,
      isComplete: true, 
      isCurrent: false,
      color: 'border-violet-600 bg-violet-600 text-white',
    },
    {
      id: 2,
      title: 'Automated Scan',
      description: status === 'PENDING' ? 'Extracting data...' : 'Data extracted cleanly.',
      isComplete: status !== 'PENDING',
      isCurrent: status === 'PENDING',
      color: status !== 'PENDING' 
        ? 'border-violet-600 bg-violet-600 text-white' 
        : 'border-violet-600 text-violet-600 bg-white animate-pulse',
    },
    {
      id: 3,
      title: 'Verification Completed',
      description: status === 'PENDING' ? 'Awaiting automated verification check...' : 'Validation complete.',
      isComplete: status !== 'PENDING',
      isCurrent: false, 
      color: status !== 'PENDING'
        ? 'border-violet-600 bg-violet-600 text-white'
        : 'border-slate-200 text-slate-400 bg-white',
    },
    {
      id: 4,
      title: status === 'REJECTED' ? 'Document Rejected' : 'Document Approved',
      description: status === 'PENDING' 
        ? 'Final evaluation pending.' 
        : status === 'SUCCESS' || status === 'APPROVED'
          ? 'Document verified secure.' 
          : 'Failed security clearance checks.',
      isComplete: status === 'APPROVED' || status === 'SUCCESS' || status === 'REJECTED',
      isCurrent: false,
      color: status === 'APPROVED' || status === 'SUCCESS'
        ? 'border-emerald-600 bg-emerald-600 text-white'
        : status === 'REJECTED'
          ? 'border-rose-600 bg-rose-600 text-white'
          : 'border-slate-200 text-slate-400 bg-white',
    },
  ];

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 sm:p-8 mb-8">
      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-6">
        Real-Time Processing Lifecycle
      </h3>
      <div className="relative">
        <div className="absolute left-4 top-1 bottom-1 w-0.5 bg-slate-100 md:left-0 md:top-4 md:w-full md:h-0.5 md:bottom-auto z-0" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
          {steps.map((step, index) => (
            <div key={step.id} className="flex md:flex-col items-start gap-4 md:gap-0">
              <div className="md:mb-4 flex-shrink-0">
                <div className={`w-8 h-8 rounded-xl border-2 font-bold text-xs flex items-center justify-center transition-all shadow-sm ${step.color}`}>
                  {step.isComplete && status !== 'REJECTED' && index === 3 ? (
                    <span>✓</span>
                  ) : step.isComplete && status === 'REJECTED' && index === 3 ? (
                    <span>✕</span>
                  ) : step.isComplete ? (
                    <span>✓</span>
                  ) : (
                    <span>{step.id}</span>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <h4 className={`text-sm font-bold tracking-tight ${
                  step.isCurrent 
                    ? 'text-violet-600' 
                    : step.isComplete && status === 'REJECTED' && index === 3
                      ? 'text-rose-600'
                      : step.isComplete && (status === 'APPROVED' || status === 'SUCCESS') && index === 3
                        ? 'text-emerald-600'
                        : 'text-slate-900'
                }`}>
                  {step.title}
                </h4>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// MAIN EXPORT INTERFACE MODULE
// -------------------------------------------------------------
export default function DocumentDetails() {
  const { id } = useParams(); 
  const navigate = useNavigate();

  // 1. STATE MANAGEMENT
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // 2. FETCH SINGLE DOCUMENT METADATA
  useEffect(() => {
    const fetchDocumentDetails = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await axiosInstance.get(`documents/detail/${id}/`);
        setDocument(response.data);
      } catch (err) {
        console.error("Failure inside detail ingestion layer:", err);
        setError(err.response?.data?.detail || 'Failed to pull document details.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchDocumentDetails();
  }, [id]);

  // Clipboard Handler
  const handleCopyToClipboard = () => {
    if (!document?.extracted_text) return;
    navigator.clipboard.writeText(document.extracted_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); 
  };

  // Helper filename text parser
  const getDisplayFilename = (url) => {
    if (!url) return "Cloud_Document_Source.png";
    const segments = url.split('/');
    const lastSegment = segments[segments.length - 1];
    return decodeURIComponent(lastSegment);
  };

  // 🔥 NEW GENERATOR: Dynamic Human-Readable Title Builder
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

  const getStatusBadge = (status) => {
    const badges = {
      SUCCESS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
      REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
    };
    return `px-3 py-1 rounded-full text-xs font-bold border ${badges[status] || badges.PENDING}`;
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

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-md mx-auto pt-20 px-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
            <span className="text-4xl block mb-2">⚠️</span>
            <h3 className="text-lg font-bold text-slate-900">Failed to load details.</h3>
            <p className="text-gray-400 text-sm mt-1">{error}</p>
            <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition">
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const fileUrl = document?.file || '';
  const isPdf = fileUrl.toLowerCase().includes('.pdf');
  const showAdminOcrPanel = document && Object.hasOwn(document, 'extracted_text');
  const activeFileName = getDisplayFilename(fileUrl);

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans antialiased">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* BACK NAVIGATION AND TITLE */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <button 
              onClick={() => navigate(-1)}
              className="text-xs font-bold text-gray-400 hover:text-slate-800 tracking-wider uppercase flex items-center space-x-1 mb-2 transition cursor-pointer bg-transparent border-0 p-0"
            >
              <span>← Back</span>
            </button>
            {/* 🔥 FIXED: Now displays our structured humantext label instead of just raw snake_case type */}
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 truncate max-w-xl">
              {generateDocumentLabel(document)}
            </h1>
          </div>
        </div>

        <StatusTracker status={document?.status} uploadedAt={document?.uploaded_at} />

        {/* METADATA OVERVIEW OVERLAY BAR */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 mb-8 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm font-semibold">
          <div className="border-r border-slate-100 last:border-0 pr-2">
            <span className="text-xs text-gray-400 block font-medium">Document Type</span>
            <span className="text-slate-800 uppercase font-mono text-xs block mt-1">{document?.document_type || 'NOT SPECIFIED'}</span>
          </div>
          <div className="sm:border-r border-slate-100 last:border-0 pr-2">
            <span className="text-xs text-gray-400 block font-medium">ID Reference</span>
            <span className="text-slate-700 font-mono text-xs block mt-1">#{document?.id}</span>
          </div>
          <div className="sm:border-r border-slate-100 last:border-0 pr-2">
            <span className="text-xs text-gray-400 block font-medium">Current Status</span>
            <div className="flex items-center space-x-3 mt-1">
              <span className={getStatusBadge(document?.status)}>
                {document?.status_display || document?.status}
              </span>
            </div>
          </div>
          <div>
            <span className="text-xs text-gray-400 block font-medium">Uploaded Date</span>
            <span className="text-slate-600 block text-xs mt-1 truncate">{document?.uploaded_at || 'Recent'}</span>
          </div>
        </div>

        {/* CORE WORKSPACE GRID */}
        <div className={`grid grid-cols-1 gap-8 items-start ${showAdminOcrPanel ? 'lg:grid-cols-2' : 'max-w-3xl mx-auto'}`}>
          
          {/* LEFT COLUMN: UNIVERSAL ACTION CARD LINK OUT */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden flex flex-col min-h-[350px] justify-between">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900">File Resource</h3>
            </div>
            
            <div className="p-8 flex flex-col items-center justify-center text-center space-y-5 flex-1">
              <div className="w-16 h-16 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center text-3xl shadow-sm">
                {isPdf ? '📕' : '🖼️'}
              </div>
              
              <div>
                {/* 🔥 HINT: Keeping activeFileName here handles hover/tooltips nicely if users still want to check the native storage hash name */}
                <h4 className="text-base font-bold text-slate-800 truncate max-w-xs mx-auto" title={activeFileName}>
                  {generateDocumentLabel(document)}
                </h4>
                <p className="text-xs text-gray-400 mt-1 uppercase font-mono tracking-wider">
                  Format Type: {isPdf ? 'PDF' : 'Image File'}
                </p>
              </div>

              {/* THE SINGLE ACCESS HUB BUTTON POINT */}
              <div className="pt-2 w-full max-w-xs">
                <a 
                  href={fileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-full inline-flex items-center justify-center px-6 py-3.5 bg-violet-600 hover:bg-violet-700 active:translate-y-0.5 text-white font-bold text-sm rounded-xl shadow-md shadow-violet-200/50 transition duration-150 text-center cursor-pointer select-none"
                >
                  <span>Open Document</span>
                  <span className="ml-2 text-xs">↗</span>
                </a>
              </div>
            </div>

            <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 text-[11px] text-gray-400 font-medium text-center">
              Assets are loaded directly over secure Cloudinary CDN media servers.
            </div>
          </div>

          {/* RIGHT COLUMN: RAW OCR LOG WINDOW PANEL */}
          {showAdminOcrPanel && (
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden flex flex-col min-h-[350px] max-h-[350px] lg:max-h-[350px] animate-fade-in">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-900">Extracted OCR Metadata Output Block (Staff Logs)</h3>
                {document?.extracted_text && (
                  <button
                    onClick={handleCopyToClipboard}
                    className="px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition shadow-sm active:scale-[0.98] cursor-pointer"
                  >
                    {copied ? '✅ Stream Copied!' : '📋 Copy Plaintext'}
                  </button>
                )}
              </div>

              <div className="p-6 flex-1 bg-slate-950 font-mono text-xs leading-relaxed text-emerald-400 select-text overflow-y-auto shadow-inner relative">
                {document?.extracted_text ? (
                  <pre className="whitespace-pre-wrap break-all pr-2 font-mono selection:bg-violet-600 selection:text-white">
                    {document.extracted_text}
                  </pre>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-gray-500 font-sans p-6">
                    <span className="text-3xl mb-2">🔍</span>
                    <p className="font-bold text-gray-400">No Characters Discovered</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

      </main>
    </div>
  );
}