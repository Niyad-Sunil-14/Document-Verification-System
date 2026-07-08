import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import axiosInstance from '../../../api/Axiosinstance';

export default function Upload() {
  const navigate = useNavigate();

  // 1. STATE MANAGEMENT
  const [user, setUser] = useState(null); 
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isPdf, setIsPdf] = useState(false); 
  const [documentType, setDocumentType] = useState('INVOICE');
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });
  
  // Tracks specific sub-stages of checkout vs file transmission
  const [paymentStage, setPaymentStage] = useState('IDLE'); // IDLE, INITIATED, SUCCESS

  // Fetch identity profile on mount to check credits balance availability
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axiosInstance.get('users/profile/');
        setUser(response.data);
      } catch (err) {
        console.error("Failed fetching credits context profile:", err);
      }
    };
    fetchProfile();
  }, []);

  // Helper function to load Razorpay SDK dynamically via Promises
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // 2. DETECT FILE TYPE & MANAGE PREVIEW BLOB
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      setIsPdf(false);
      return;
    }

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      setIsPdf(true);
      setPreviewUrl(null); 
    } else {
      setIsPdf(false);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [file]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage({ text: '', isError: false });
      setPaymentStage('IDLE');
    }
  };

  // 3. OPTIMIZED PAYMENT & FILE TRANSMISSION WORKFLOW
  const handlePaymentAndUpload = async (e) => {
    e.preventDefault();

    if (!file) {
      setMessage({ text: 'Please select or drag a valid document file first.', isError: true });
      return;
    }

    // 🚀 BYPASS GATEWAY OPTIMIZATION: Check if user has available credits
    if (user && user.document_credits > 0) {
      try {
        setIsUploading(true);
        setMessage({ text: '', isError: false });
        setPaymentStage('SUCCESS'); // Jump right into submission parsing stage

        const formData = new FormData();
        formData.append('file', file);
        formData.append('document_type', documentType);
        formData.append('use_credit', 'true'); // Flag letting backend know to subtract a credit token

        await axiosInstance.post('documents/upload/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        setMessage({ text: '🎉 Document processed instantly using account credit!', isError: false });
        setFile(null); 

        setTimeout(() => {
          navigate('/user-dashboard'); 
        }, 2000);

      } catch (uploadErr) {
        console.error("Credit extraction pipeline crash:", uploadErr);
        setMessage({ 
          text: uploadErr.response?.data?.detail || 'Server storage verification registration timed out.', 
          isError: true 
        });
        setIsUploading(false);
        setPaymentStage('IDLE');
      }
      return; // Stop function loop early to skip payment module setup
    }

    // 💳 FALLBACK ROADMAP: Standard Pay-As-You-Verify process when credits run empty
    try {
      setIsUploading(true);
      setMessage({ text: '', isError: false });
      setPaymentStage('INITIATED');

      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        setMessage({ text: 'Razorpay SDK failed to download. Check your network configuration.', isError: true });
        setIsUploading(false);
        setPaymentStage('IDLE');
        return;
      }

      const orderResponse = await axiosInstance.post('documents/payments/create-order/', {
        document_type: documentType,
      });

      const { order_id, amount, currency, razorpay_key_id, user_details } = orderResponse.data;

      const options = {
        key: razorpay_key_id,
        amount: amount,
        currency: currency,
        name: 'DocVerify System',
        description: `${documentType.replace(/_/g, ' ')} Processing Fee`,
        order_id: order_id,
        notes: {
          plan_type: "pay_as_you_verify" 
        },
        handler: async function (paymentInfo) {
          try {
            setPaymentStage('SUCCESS');
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('document_type', documentType);
            formData.append('razorpay_payment_id', paymentInfo.razorpay_payment_id);
            formData.append('razorpay_order_id', paymentInfo.razorpay_order_id);
            formData.append('razorpay_signature', paymentInfo.razorpay_signature);

            await axiosInstance.post('documents/upload/', formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });

            setMessage({ text: '🎉 Payment authorized and document uploaded successfully!', isError: false });
            setFile(null); 

            setTimeout(() => {
              navigate('/user-dashboard'); 
            }, 2000);

          } catch (uploadErr) {
            console.error("File upload sequence crash after payment confirmation:", uploadErr);
            setMessage({ 
              text: uploadErr.response?.data?.detail || 'Payment was captured, but server storage verification registration timed out.', 
              isError: true 
            });
            setIsUploading(false);
          }
        },
        prefill: {
          name: user_details?.fullname || '',
          email: user_details?.email || '',
        },
        theme: {
          color: '#4f46e5', 
        },
        modal: {
          ondismiss: async function () {
            setIsUploading(false);
            setPaymentStage('IDLE');
            setMessage({ text: '❌ Payment window exited. Document creation suspended.', isError: true });
            try {
              await axiosInstance.post('documents/payments/log-failure/', {
                razorpay_order_id: order_id,
                plan_type: 'PAY_AS_YOU_VERIFY'
              });
            } catch (err) {
              console.error("Failed to register payment drop on server:", err);
            }
          }
        }
      };

      const rzpWindow = new window.Razorpay(options);
      rzpWindow.open();

    } catch (err) {
      console.error("File ingestion pipeline clearing rails error:", err);
      setMessage({ 
        text: err.response?.data?.detail || 'Failed to initialize payment infrastructure order parameters.', 
        isError: true 
      });
      setIsUploading(false);
      setPaymentStage('IDLE');
    }
  };

  return (
    /* 🚀 FIXED: Dynamic viewport color transitions for dark mode support */
    <div className="min-h-screen bg-slate-50/50 text-slate-900 dark:bg-slate-900 dark:text-slate-100 font-sans antialiased transition-colors duration-200">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        
        {/* HEADER SECTION */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Upload Your Document</h1>
            <p className="text-gray-500 dark:text-slate-400 mt-1">Fast, encrypted, and automated document analysis.</p>
          </div>
          <button 
            onClick={() => navigate(-1)} 
            className="text-sm font-semibold text-gray-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center space-x-1 transition cursor-pointer bg-transparent border-0 outline-none"
          >
            <span>←</span> <span>Back</span>
          </button>
        </div>

        {/* CORE FORM MODULE */}
        {/* 🚀 FIXED: Re-styled card body elements for dual styling states */}
        <div className="bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 shadow-sm rounded-2xl p-6 sm:p-8 transition-colors duration-200">
          
          {/* Visual Credits Indicator Badge */}
          {user && user.document_credits > 0 ? (
            <div className="mb-6 p-3 bg-violet-50 border border-violet-100 dark:bg-violet-950/30 dark:border-violet-900/50 rounded-xl flex justify-between items-center text-xs text-violet-700 dark:text-violet-400 font-medium transition-colors">
              <span>Available Document Upload Balance:</span>
              <span className="bg-violet-600 dark:bg-violet-500 text-white font-bold px-2.5 py-1 rounded-md">
                {user.document_credits} Credits
              </span>
            </div>
          ): ""}

          <form onSubmit={handlePaymentAndUpload} className="space-y-6">
            
            {/* CLASSIFICATION CONFIG */}
            <div>
              <label htmlFor="docType" className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Document Classification Type
              </label>
              <select
                id="docType"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                disabled={isUploading}
                className="w-full bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition text-slate-800 shadow-sm cursor-pointer h-11"
              >
                <option value="PASSPORT"> Passport Scan</option>
                <option value="DRIVERS LICENSE"> Drivers License</option>
                <option value="ID CARD"> Government Issued ID Card</option>
                <option value="INVOICE"> Commercial Invoice</option>
                <option value="RECEIPT"> Retail Sales Receipt</option>
                <option value="PAYSLIP"> Payroll Earnings Statement</option>
                <option value="BANK STATEMENT"> Official Bank Statement</option>
                <option value="UTILITY BILL"> Utility Proof of Address</option>
                <option value="CONTRACT"> Signed Business Contract</option>
                <option value="TAX FORM"> Corporate Tax Filing Docs</option>
              </select>
            </div>

            {/* DROPZONE SELECTION CONTAINER */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                File Binary Attachment
              </label>
              
              {/* 🚀 FIXED: File drop container adapts cleanly to dark layouts */}
              <div className="border-2 border-dashed border-slate-200 hover:border-violet-400 dark:border-slate-700 dark:hover:border-violet-500 rounded-2xl p-8 bg-slate-50/40 dark:bg-slate-900/30 transition relative flex flex-col items-center justify-center text-center min-h-[260px]">
                
                {file ? (
                  <div className="space-y-4 w-full flex flex-col items-center relative z-10">
                    
                    {/* DYNAMIC CONDITIONAL PREVIEW PORTAL */}
                    {isPdf ? (
                      <div className="w-32 h-40 bg-rose-50 border border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/40 rounded-xl shadow-md flex flex-col items-center justify-center p-4">
                        <span className="text-4xl">📕</span>
                        <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 tracking-wider uppercase mt-2 bg-rose-100 dark:bg-rose-950/40 px-2 py-0.5 rounded">PDF DOCUMENT</span>
                      </div>
                    ) : (
                      <div className="relative group max-w-xs rounded-xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5">
                        <img 
                          src={previewUrl} 
                          alt="Upload preview" 
                          className="max-h-48 w-full object-contain rounded-lg"
                        />
                      </div>
                    )}
                    
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate max-w-sm mx-auto">{file.name}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500 font-semibold mt-0.5">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>

                    <button 
                      type="button" 
                      onClick={() => setFile(null)}
                      disabled={isUploading}
                      className="text-xs font-bold text-rose-500 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 underline transition cursor-pointer disabled:opacity-40 bg-transparent border-0 outline-none"
                    >
                      Remove and swap file
                    </button>
                  </div>
                ) : (
                  <>
                    <svg className="w-12 h-12 text-gray-400 dark:text-slate-500 mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                    </svg>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-300">
                      Drag your file container here, or <span className="text-violet-600 dark:text-violet-400 hover:underline cursor-pointer">browse filesystem</span>
                    </p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Accepts PDF documents or raw images up to 10MB.</p>
                  </>
                )}

                <input 
                  type="file" 
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* NOTIFICATION MESSAGING CONTAINER */}
            {message.text && (
              <div className="flex justify-center items-center pt-2">
                <div className={`w-full max-w-md p-4 rounded-xl border text-sm font-bold text-center shadow-sm flex items-center justify-center space-x-2 ${
                  message.isError 
                    ? 'bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/40 text-rose-700 dark:text-rose-400' 
                    : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400'
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
                className="w-full py-4 px-6 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 dark:disabled:bg-violet-800 text-white font-bold rounded-xl shadow-md shadow-violet-200/50 dark:shadow-none transition-all active:scale-[0.99] disabled:scale-100 flex items-center justify-center space-x-2 cursor-pointer uppercase tracking-wider text-sm"
              >
                {isUploading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    <span>
                      {paymentStage === 'INITIATED' && 'Contacting Payment Gateway...'}
                      {paymentStage === 'SUCCESS' && 'Verifying & Saving Document Records...'}
                    </span>
                  </div>
                ) : (
                  <span>
                    {user && user.document_credits > 0 ? 'Use 1 Credit' : 'Pay ₹49 and get Verified'}
                  </span>
                )}
              </button>
            </div>

          </form>
        </div>

      </main>
    </div>
  );
}