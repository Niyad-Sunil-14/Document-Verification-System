import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import Navbar from './Navbar';
import axiosInstance from '../../../api/Axiosinstance';

export default function Upload() {
  const navigate = useNavigate();

  // 1. STATE MANAGEMENT
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isPdf, setIsPdf] = useState(false); // New state flag to track file extension type
  const [documentType, setDocumentType] = useState('INVOICE');
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });

  // 2. DETECT FILE TYPE & MANAGE PREVIEW BLOB
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      setIsPdf(false);
      return;
    }

    // Check if the uploaded file is a PDF
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      setIsPdf(true);
      setPreviewUrl(null); // Clear out graphic image preview URLs
    } else {
      setIsPdf(false);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // Clean up graphic memory allocation hooks
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [file]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage({ text: '', isError: false });
    }
  };

  // 3. MULTI-PART API SUBMISSION SUBMIT HANDLER
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setMessage({ text: 'Please select or drag a valid document file first.', isError: true });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);

    try {
      setIsUploading(true);
      setMessage({ text: '', isError: false });

      await axiosInstance.post('documents/upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setMessage({ text: 'Document uploaded successfully!', isError: false });
      setFile(null); 

      setTimeout(() => {
        navigate('/user-dashboard'); 
      }, 2000);

    } catch (err) {
      console.error("File ingestion pipeline fault:", err);
      setMessage({ 
        text: err.response?.data?.detail || 'File compilation failed. Please verify document formatting metrics.', 
        isError: true 
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans antialiased">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        
        {/* HEADER SECTION */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Upload Your Document</h1>
            <p className="text-gray-500 mt-1">Fast, encrypted, and automated document analysis.</p>
          </div>
          <button 
            onClick={() => navigate(-1)} 
            className="text-sm font-semibold text-gray-500 hover:text-slate-800 flex items-center space-x-1 transition"
          >
            <span>←</span> <span>Back</span>
          </button>
        </div>

        {/* CORE FORM MODULE */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* CLASSIFICATION CONFIG */}
            <div>
              <label htmlFor="docType" className="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">
                Document Classification Type
              </label>
              <select
                id="docType"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition text-slate-800 shadow-sm"
              >
                <option value="PASSPORT">🛂 Personal Passport Scan</option>
                <option value="DRIVERS_LICENSE">🚗 Driver's License</option>
                <option value="ID_CARD">🪪 Government Issued ID Card</option>
                <option value="INVOICE">🧾 Commercial Invoice</option>
                <option value="RECEIPT">🛒 Retail Sales Receipt</option>
                <option value="PAYSLIP">💵 Payroll Earnings Statement</option>
                <option value="BANK_STATEMENT">🏦 Official Bank Statement</option>
                <option value="UTILITY_BILL">⚡ Utility Proof of Address</option>
                <option value="CONTRACT">📜 Signed Business Contract</option>
                <option value="TAX_FORM">📊 Corporate Tax Filing Docs</option>
              </select>
            </div>

            {/* DROPZONE SELECTION CONTAINER WITH DYNAMIC IMAGE/PDF HANDLING */}
            <div>
              <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">
                File Binary Attachment
              </label>
              
              <div className="border-2 border-dashed border-slate-200 hover:border-violet-400 rounded-2xl p-8 bg-slate-50/40 transition relative flex flex-col items-center justify-center text-center min-h-[260px]">
                
                {file ? (
                  <div className="space-y-4 w-full flex flex-col items-center relative z-10">
                    
                    {/* DYNAMIC CONDITIONAL PREVIEW PORTAL */}
                    {isPdf ? (
                      /* If the file is a PDF, show a sleek document icon preview card instead of a broken graphic img */
                      <div className="w-32 h-40 bg-rose-50 border border-rose-200 rounded-xl shadow-md flex flex-col items-center justify-center p-4">
                        <span className="text-4xl">📕</span>
                        <span className="text-[10px] font-black text-rose-600 tracking-wider uppercase mt-2 bg-rose-100 px-2 py-0.5 rounded">PDF DOCUMENT</span>
                      </div>
                    ) : (
                      /* If it's an image, render the thumbnail preview element standardly */
                      <div className="relative group max-w-xs rounded-xl overflow-hidden shadow-md border border-slate-200 bg-white p-1.5">
                        <img 
                          src={previewUrl} 
                          alt="Upload preview" 
                          className="max-h-48 w-full object-contain rounded-lg"
                        />
                      </div>
                    )}
                    
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-800 truncate max-w-sm mx-auto">{file.name}</p>
                      <p className="text-xs text-gray-400 font-semibold mt-0.5">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>

                    <button 
                      type="button" 
                      onClick={() => setFile(null)}
                      className="text-xs font-bold text-rose-500 hover:text-rose-700 underline transition cursor-pointer"
                    >
                      Remove and swap file
                    </button>
                  </div>
                ) : (
                  <>
                    <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                    </svg>
                    <p className="text-sm font-semibold text-slate-800">
                      Drag your file container here, or <span className="text-violet-600 hover:underline cursor-pointer">browse filesystem</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Accepts PDF documents or raw images up to 10MB.</p>
                  </>
                )}

                {/* 🔥 CHANGED: Adjusted input "accept" parameter to include PDFs alongside standard images */}
                <input 
                  type="file" 
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* CENTERED NOTIFICATION MESSAGING CONTAINER */}
            {message.text && (
              <div className="flex justify-center items-center pt-2">
                <div className={`w-full max-w-md p-4 rounded-xl border text-sm font-bold text-center shadow-sm flex items-center justify-center space-x-2 ${
                  message.isError 
                    ? 'bg-rose-50 border-rose-200 text-rose-700' 
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}>
                  <span>{message.text}</span>
                </div>
              </div>
            )}

            {/* FORM SUBMIT ACTION BUTTON ROW */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isUploading}
                className="w-full py-4 px-6 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-bold text-base rounded-xl shadow-md shadow-violet-200/50 transition-all active:scale-[0.99] disabled:scale-100 flex items-center justify-center space-x-2 cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  </>
                ) : (
                  <span>Upload</span>
                )}
              </button>
            </div>

          </form>
        </div>

      </main>
    </div>
  );
}