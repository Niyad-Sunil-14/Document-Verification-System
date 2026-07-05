import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminNavbar from '../admin/AdminNavbar';
import axiosInstance from '../../../api/Axiosinstance';

export default function AdminDocumentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  // 1. STATE CONFIGURATION
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [adminEmail, setAdminEmail] = useState('admin@docverify.io');
  const [remarks, setRemarks] = useState('');

  // 🚀 CUSTOM MODAL CONFIRMATION STATES
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);

  // 2. DATA SYNCHRONIZATION HOOK
  useEffect(() => {
    const fetchAdminDetails = async () => {
      try {
        setLoading(true);
        setError('');
        
        const [docResponse, profileResponse] = await Promise.all([
          axiosInstance.get(`documents/detail/${id}/`),
          axiosInstance.get('users/profile/')
        ]);

        setDocument(docResponse.data);
        if (docResponse.data?.remarks) {
          setRemarks(docResponse.data.remarks);
        }
        if (profileResponse.data?.email) setAdminEmail(profileResponse.data.email);
      } catch (err) {
        console.error("Admin asset loader fault:", err);
        setError(err.response?.data?.detail || 'Asset resolution error across secure data nodes.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchAdminDetails();
  }, [id]);

  // Opens the confirmation drawer
  const triggerStatusConfirmation = (statusType) => {
    setPendingStatus(statusType);
    setIsModalOpen(true);
  };

  // 3. SECURE COMPLIANCE UPDATE ACTION MATRIX CALLS
  const handleConfirmStatusUpdate = async () => {
    if (!pendingStatus) return;
    setIsModalOpen(false);
    
    try {
      setActionLoading(true);
      const response = await axiosInstance.patch(`documents/detail/${id}/`, { 
        status: pendingStatus,
        remarks: remarks 
      });
      setDocument(response.data);
    } catch (err) {
      console.error("Failed to commit verification status adjustment:", err);
      setError('Database reject exception: Lacks permissions or incorrect endpoint layout.');
    } finally {
      setActionLoading(false);
      setPendingStatus(null);
    }
  };

  const handleCopyToClipboard = () => {
    if (!document?.extracted_text) return;
    navigator.clipboard.writeText(document.extracted_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getAccuracyBadgeStyles = (score) => {
    if (score >= 85) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (score >= 60) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-rose-50 text-rose-700 border-rose-200';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col">
        <AdminNavbar email={adminEmail} />
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-800" />
        </div>
      </div>
    );
  }

  const fileUrl = document?.file || '';
  const isPdf = fileUrl.toLowerCase().includes('.pdf');

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans antialiased relative">
      <AdminNavbar email={adminEmail} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* UPPER TITLE ROW */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <button onClick={() => navigate(-1)} className="text-xs font-bold text-gray-400 hover:text-slate-800 uppercase tracking-wider bg-transparent border-0 p-0 cursor-pointer mb-1">
              ← Back to Documents
            </button>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Document Review</h1>
          </div>
        </div>

        {error && (
          <div className="p-4 mb-6 bg-rose-50 border border-rose-200 text-rose-700 font-medium rounded-xl text-sm max-w-xl">
            ⚠️ {error}
          </div>
        )}

        {/* METADATA REGISTRY OVERVIEW GRID */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 mb-8 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm font-semibold">
          <div>
            <span className="text-xs text-gray-400 block font-medium">Username</span>
            <span className="text-slate-800 font-bold block mt-1 truncate">{document?.username || 'Unknown User'}</span>
          </div>
          <div>
            <span className="text-xs text-gray-400 block font-medium">Document Type</span>
            <span className="text-slate-800 uppercase font-mono text-xs block mt-1 truncate">{(document?.document_type || 'NOT SPECIFIED').replace(/_/g, ' ')}</span>
          </div>
          <div>
            <span className="text-xs text-gray-400 block font-medium">OCR Status Check</span>
            <div className="mt-1">
              <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${
                document?.ocr_status === 'PROCESSED' ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                {document?.ocr_status || 'PENDING'}
              </span>
            </div>
          </div>
          <div>
            <span className="text-xs text-gray-400 block font-medium">Status</span>
            <div className="mt-1">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                document?.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                document?.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {document?.status || 'PENDING'}
              </span>
            </div>
          </div>
          <div>
            <span className="text-xs text-gray-400 block font-medium">OCR Accuracy</span>
            <div className="mt-1 flex items-center space-x-1.5">
              <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${getAccuracyBadgeStyles(document?.ocr_accuracy)}`}>
                {document?.ocr_accuracy ? `${document.ocr_accuracy}%` : '0.0%'}
              </span>
            </div>
          </div>
        </div>

        {/* CORE WORKSPACE SPLIT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* LEFT CONTENT */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden min-h-[140px] flex flex-col justify-between">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">File Resource</h3>
                <span className="text-xs text-gray-400 font-mono">ID Ref: #{document?.id}</span>
              </div>

              <div className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4 flex-1">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center text-2xl border border-slate-200 shadow-inner">
                    {isPdf ? '📕' : '🖼️'}
                  </div>
                  <div className="truncate max-w-[280px] sm:max-w-md">
                    <h4 className="text-sm font-bold text-slate-900 truncate">{document?.filename || 'System_Asset_File'}</h4>
                    <p className="text-xs text-gray-400 uppercase font-mono tracking-wider mt-0.5">{isPdf ? 'PDF' : 'Image File'}</p>
                  </div>
                </div>
                <a href={fileUrl} target="_blank" rel="noreferrer" className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg shadow text-decoration-none cursor-pointer whitespace-nowrap">
                  Open Original File ↗
                </a>
              </div>
            </div>

            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden flex flex-col min-h-[300px]">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Extracted OCR Data</h3>
                {document?.extracted_text && (
                  <button onClick={handleCopyToClipboard} className="px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 shadow-sm cursor-pointer">
                    {copied ? '✅ Copied!' : '📋 Copy Plaintext'}
                  </button>
                )}
              </div>
              <div className="p-6 flex-1 bg-slate-950 font-mono text-xs leading-relaxed text-emerald-400 overflow-y-auto max-h-[320px]">
                {document?.extracted_text ? (
                  <pre className="whitespace-pre-wrap break-all font-mono selection:bg-slate-800">{document.extracted_text}</pre>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 font-sans py-12">
                    <span className="text-2xl mb-2">🔍</span>
                    <p className="font-semibold text-gray-400">No text characters discovered by OCR.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">Verification Actions</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Compliance Remarks</label>
                  <textarea
                    rows="4"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Provide detailed compliance reasons or notes..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 placeholder-gray-400 font-medium resize-none bg-slate-50/50"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <button 
                    disabled={actionLoading || document?.status === 'APPROVED'}
                    onClick={() => triggerStatusConfirmation('APPROVED')} // 🚀 Modal Confirmation Trigger
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow transition duration-100 cursor-pointer"
                  >
                    {actionLoading ? 'Processing...' : 'Verify & Approve Document'}
                  </button>

                  <button 
                    disabled={actionLoading || document?.status === 'REJECTED'}
                    onClick={() => triggerStatusConfirmation('REJECTED')} // 🚀 Modal Confirmation Trigger
                    className="w-full py-2.5 bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 disabled:opacity-40 text-xs font-bold rounded-xl transition duration-100 cursor-pointer"
                  >
                    {actionLoading ? 'Processing...' : 'Reject & Send Remarks'}
                  </button>

                </div>
              </div>
            </div>

            {/* 🚀 COMPLIANCE GUIDE OVERHAUL PANEL */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-xl">
              <h4 className="text-xs font-black text-violet-400 uppercase tracking-widest mb-2">Audit Compliance Guide</h4>
              <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                Review extracted data pools against file originals before making a compliance evaluation. 
                Saving remarks independently allows notes to be captured during ongoing auditing phases without changing active system permissions.
              </p>
            </div>
          </div>

        </div>

      </main>

      {/* 🚀 TAILWIND MODAL DIALOG COMPONENT PANEL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-amber-500">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-base font-extrabold text-slate-900">Confirm Verification Status</h3>
            </div>
            
            <p className="text-xs text-gray-500 font-medium leading-relaxed">
              Are you sure you want to change this document's status to{' '}
              <span className={`font-bold uppercase ${pendingStatus === 'APPROVED' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {pendingStatus}
              </span>?
            </p>

            <div className="flex space-x-3 pt-2 text-xs font-bold">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer outline-none border-0"
              >
                No, Cancel
              </button>
              <button
                onClick={handleConfirmStatusUpdate}
                className={`flex-1 py-2.5 text-white rounded-xl shadow transition cursor-pointer outline-none border-0 ${
                  pendingStatus === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Yes, Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}