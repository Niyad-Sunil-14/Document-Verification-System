import React, { useState, useEffect } from 'react';
import Navbar from './Navbar'; // The dashboard navbar we built previously

export default function UserDashboard() {
  // 1. STATE MANAGEMENT
  const [documents, setDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState({ text: '', isError: false });
  const [filterType, setFilterType] = useState('ALL');

  // 2. MOCK INGESTION: Simulating an API load from your Django endpoint
  useEffect(() => {
    // Replace this with your actual axios.get('http://127.0.0.1:8000/api/documents/lists/')
    const mockData = [
      { id: 1, filename: 'passport_scan_final.png', document_type: 'PASSPORT', status: 'APPROVED', uploaded_at: '2026-06-04 11:22' },
      { id: 2, filename: 'invoice_june_4.pdf', document_type: 'INVOICE', status: 'PENDING', uploaded_at: '2026-06-04 13:05' },
      { id: 3, filename: 'tax_return_2025.jpg', document_type: 'TAX_FORM', status: 'REJECTED', uploaded_at: '2026-05-29 09:45' },
    ];
    setDocuments(mockData);
  }, []);

  // 3. FILE UPLOAD HANDLER
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadMessage({ text: '', isError: false });

    // Mocking the multi-part request pipeline delay
    setTimeout(() => {
      const newDoc = {
        id: Date.now(),
        filename: file.name,
        document_type: 'DETECTING...',
        status: 'PENDING',
        uploaded_at: new Date().toISOString().replace('T', ' ').substring(0, 16),
      };

      setDocuments((prev) => [newDoc, ...prev]);
      setIsUploading(false);
      setUploadMessage({ text: '🎉 Document uploaded successfully and queued for verification!', isError: false });
    }, 1500);
  };

  // 4. FILTER CONDITIONAL LOGIC
  const filteredDocuments = documents.filter((doc) => {
    if (filterType === 'ALL') return true;
    return doc.status === filterType;
  });

  // Dynamic Badge Color Utility
  const getStatusBadge = (status) => {
    const badges = {
      APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
      REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
    };
    return `px-3 py-1 rounded-full text-xs font-semibold border ${badges[status] || badges.PENDING}`;
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans antialiased">
      {/* GLOBAL HEADER HEADER BAR */}
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* UPPER BANNER SECTION */}
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">User Workspace</h1>
          <p className="text-gray-500 mt-1">Upload your credentials, monitor ongoing audits, and view compliance status logs.</p>
        </div>

        {/* METRIC SUMMARIES */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Total Uploaded</p>
            <p className="text-3xl font-bold text-slate-800 mt-2">{documents.length}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Verified Secure</p>
            <p className="text-3xl font-bold text-emerald-600 mt-2">
              {documents.filter(d => d.status === 'APPROVED').length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Awaiting Audit</p>
            <p className="text-3xl font-bold text-amber-600 mt-2">
              {documents.filter(d => d.status === 'PENDING').length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Flagged / Rejected</p>
            <p className="text-3xl font-bold text-rose-600 mt-2">
              {documents.filter(d => d.status === 'REJECTED').length}
            </p>
          </div>
        </div>

        {/* MIDDLE ACTIONS: STREAMLINED FILE UPLOAD DROPZONE */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-10">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Upload Document Container</h2>
          <div className="border-2 border-dashed border-slate-200 hover:border-violet-400 rounded-xl p-8 bg-slate-50/50 transition relative flex flex-col items-center justify-center text-center">
            
            {isUploading ? (
              <div className="flex flex-col items-center space-y-3">
                {/* Spinner loading graphic anchor animation element */}
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
                <p className="text-sm font-medium text-slate-600">Extracting text and establishing secure pipeline instances...</p>
              </div>
            ) : (
              <>
                <svg className="w-10 h-10 text-gray-400 mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                </svg>
                <p className="text-sm font-semibold text-slate-800">Drag your document image here, or <span className="text-violet-600 hover:underline cursor-pointer">browse files</span></p>
                <p className="text-xs text-gray-400 mt-1">Supports PNG, JPG, or JPEG up to 10MB. OCR maps instantly.</p>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                />
              </>
            )}
          </div>
          {/* Real-time Toast Notifications Status Feed */}
          {uploadMessage.text && (
            <p className={`mt-3 text-sm font-medium ${uploadMessage.isError ? 'text-rose-600' : 'text-emerald-600'}`}>
              {uploadMessage.text}
            </p>
          )}
        </div>

        {/* DATA FILTERING BAR & RECENT REVIEWS CONTAINER */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          
          {/* Table Header Controls */}
          <div className="px-6 py-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
            <h3 className="text-base font-bold text-slate-900">Document Verification Queue</h3>
            
            {/* Quick Segment Filters */}
            <div className="flex bg-slate-200/60 p-1 rounded-xl text-xs font-semibold text-gray-600">
              {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-4 py-1.5 rounded-lg transition ${
                    filterType === type ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
                  }`}
                >
                  {type.charAt(0) + type.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* TABLE PLATFORM */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left">
              <thead className="bg-slate-50/70 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Filename</th>
                  <th className="px-6 py-4">Detected Class</th>
                  <th className="px-6 py-4">Submission Timestamp</th>
                  <th className="px-6 py-4">Audit Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4 text-slate-900 whitespace-nowrap flex items-center space-x-2">
                      <span className="text-lg">📄</span>
                      <span className="truncate max-w-xs">{doc.filename}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 font-mono text-xs">{doc.document_type}</td>
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{doc.uploaded_at}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadge(doc.status)}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button 
                        onClick={() => alert(`Opening secure detail view frame parameters for item ID: ${doc.id}`)}
                        className="text-violet-600 hover:text-violet-900 font-bold"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Zero Data State Handling */}
          {filteredDocuments.length === 0 && (
            <div className="p-12 text-center text-gray-400 text-sm">
              No matching verification tasks found in this query state layer.
            </div>
          )}
        </div>

      </main>
    </div>
  );
}