import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../../../api/Axiosinstance';
import Navbar from './Navbar';

export default function PaymentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPaymentDetails = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get(`documents/payments/${id}/`);
        setPayment(response.data);
      } catch (err) {
        console.error("Error pulling transaction entry details:", err);
        setError("Unable to locate specified transaction ledger record.");
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentDetails();
  }, [id]);

  const formatPlanType = (type) => {
    switch (type) {
      case 'STARTER_PACK': return 'Starter Pack';
      case 'MONTHLY_PREMIUM': return 'Monthly Premium Pass';
      case 'PAY_AS_YOU_VERIFY': return 'Pay As You Verify';
      default: return type ? type.replace(/_/g, ' ') : 'Verification Route';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col transition-colors duration-200">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-600 dark:border-violet-400 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col transition-colors duration-200">
        <Navbar />
        <div className="max-w-md mx-auto mt-20 px-4">
          <div className="bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900/40 text-red-700 dark:text-red-400 p-6 rounded-2xl text-center shadow-sm transition-colors">
            <p className="font-bold text-base mb-2">Lookup Error</p>
            <p className="text-sm text-red-600/90 dark:text-red-400 mb-4">{error || "Record missing."}</p>
            <button onClick={() => navigate('/payments')} className="inline-flex px-4 py-2 bg-white dark:bg-slate-800 border border-red-200 dark:border-slate-700 rounded-xl text-xs font-bold text-red-700 dark:text-red-400 hover:bg-red-100/50 dark:hover:bg-slate-700/50 transition cursor-pointer outline-none">
              Return to History Ledger
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isSuccess = payment.status === 'SUCCESS';

  return (
    /* 🚀 FIXED: Wrapped layout context tracking Tailwind v4 dark modifiers updates */
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100 font-sans antialiased transition-colors duration-200">
      <Navbar />
      <div className="py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          
          {/* Top navigation breadcrumb bar control */}
          <div className="mb-6">
            <Link to="/payment-history" className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400 transition gap-1.5 text-decoration-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Payment Logs
            </Link>
          </div>

          {/* Main Statement Wrapper Block */}
          {/* 🚀 FIXED: Ledger sheets transition beautifully across adaptive slate structures */}
          <div className="bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 shadow-sm rounded-2xl overflow-hidden transition-colors duration-200">
            
            {/* Context Header Strip banner */}
            <div className={`px-6 py-8 border-b border-slate-100 dark:border-slate-700 text-center ${
              isSuccess 
                ? 'bg-gradient-to-b from-green-50/30 to-white dark:from-green-950/10 dark:to-slate-800' 
                : 'bg-gradient-to-b from-rose-50/30 to-white dark:from-rose-950/10 dark:to-slate-800'
            }`}>
              <div className="mb-3">
                {isSuccess ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900/50">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5" />
                    Payment Successful
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 mr-1.5" />
                    Payment Failed
                  </span>
                )}
              </div>
              <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">₹{payment.amount.toFixed(2)}</h2>
              <p className="text-xs text-gray-400 dark:text-slate-400 mt-1 font-semibold tracking-wide uppercase">
                {formatPlanType(payment.plan_type)}
              </p>
            </div>

            {/* Core Ledger Parameter Breakdown Grid */}
            <div className="p-6 sm:p-8 space-y-6">
              
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Verification ID's</h3>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/60 dark:bg-slate-900/40 dark:border-slate-700/60 font-mono text-xs text-slate-600 dark:text-slate-300 space-y-2.5 transition-colors">
                  <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-4 pb-2 border-b border-slate-200/40 dark:border-slate-700/40">
                    <span className="text-gray-400 font-semibold font-sans">Razorpay Order ID:</span>
                    <span className="break-all text-right">{payment.razorpay_order_id}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-4">
                    <span className="text-gray-400 font-semibold font-sans">Razorpay Payment ID:</span>
                    <span className="break-all text-slate-800 dark:text-slate-200 font-bold text-right">{payment.razorpay_payment_id || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <hr className="border-slate-100 dark:border-slate-700" />

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                  Transaction Overview
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Credit / File Info Box */}
                  <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-4 bg-white dark:bg-slate-900/20 shadow-2xs transition-colors">
                    {payment.status === 'FAILED' ? (
                      <div>
                        <p className="text-xs text-gray-400 font-semibold">Credits Provided</p>
                        <p className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1.5">
                          0 credits added
                        </p>
                      </div>
                    ) : payment.plan_type === 'PAY_AS_YOU_VERIFY' ? (
                      payment.document_id ? (
                        <Link 
                          to={`/documents/${payment.document_id}`} 
                          className="block hover:bg-slate-50/80 dark:hover:bg-slate-800/40 p-1 rounded-lg transition group/file text-decoration-none"
                        >
                          <p className="text-xs text-gray-400 font-semibold flex items-center gap-1 group-hover/file:text-violet-600 dark:group-hover/file:text-violet-400 transition">
                            Allocated File Name
                          </p>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1 truncate group-hover/file:text-violet-600 dark:group-hover/file:text-violet-400 group-hover/file:underline transition" title={payment.filename}>
                            {payment.filename}
                          </p>
                        </Link>
                      ) : (
                        <div>
                          <p className="text-xs text-gray-400 font-semibold">Allocated File Name</p>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1 truncate" title={payment.filename}>
                            {payment.filename}
                          </p>
                        </div>
                      )
                    ) : (
                      <div>
                        <p className="text-xs text-gray-400 font-semibold">Credits Provided</p>
                        <p className="text-sm font-bold text-green-600 dark:text-green-400 mt-1 flex items-center gap-1.5">
                          {payment.plan_type === 'STARTER_PACK' ? '+3 credits added' : '+12 credits added'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Date & Time Card */}
                  <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-4 bg-white dark:bg-slate-900/20 shadow-2xs transition-colors">
                    <p className="text-xs text-gray-400 font-semibold">Date & Time</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-1">
                      {payment.created_at}
                    </p>
                  </div>
                  
                </div>
              </div>

            </div>

            {/* Footer context message panel */}
            <div className="bg-slate-50/70 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-700 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-gray-400 dark:text-slate-500 transition-colors">
              <span>Currency standard: {payment.currency}</span>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}