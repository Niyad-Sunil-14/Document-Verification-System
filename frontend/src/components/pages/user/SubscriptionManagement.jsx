import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../api/Axiosinstance';
import Navbar from './Navbar';

export default function SubscriptionManagement() {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 🚀 ADDED: Custom Pop-up Modal State Toggle
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const fetchSubscriptionDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [subResponse, historyResponse] = await Promise.all([
        axiosInstance.get('documents/users/subscription-details/'),
        axiosInstance.get('documents/payments/history/')
      ]);
      
      setSubscription(subResponse.data);
      const subLogs = (historyResponse.data || []).filter(item => 
        item.plan_type === 'STARTER_PACK' || item.plan_type === 'MONTHLY_PREMIUM'
      );
      setPaymentHistory(subLogs);
    } catch (err) {
      console.error("Subscription retrieval fault:", err);
      setError(err.response?.data?.detail || "Failed to download complete billing system records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionDashboardData();
  }, []);

  // 🚀 MODIFIED: This function executes only AFTER modal confirmation trigger
  const handleConfirmCancel = async () => {
    setIsCancelModalOpen(false); // Close the modal container overlay
    
    try {
      setActionLoading(true);
      setMessage('');
      await axiosInstance.post('documents/users/subscription-cancel/');
      setMessage("Your plan auto-renewal status was modified successfully.");
      await fetchSubscriptionDashboardData();
    } catch (err) {
      console.error("Cancellation error:", err);
      setError(err.response?.data?.detail || "Failed to process plan cancel request.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRenewSubscription = async (chosenTier = 'monthly_premium') => {
    try {
      setActionLoading(true);
      setMessage('');
      setError('');

      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        setError("Failed to initialize payment gateway. Check your network configuration.");
        setActionLoading(false);
        return;
      }

      const response = await axiosInstance.post('documents/payments/create-subscription/', {
        plan_type: chosenTier
      });
      
      const { order_id, amount, currency, key_id, user_details } = response.data;

      const options = {
        key: key_id,
        amount: amount,
        currency: currency,
        name: "DocVerify Services",
        description: `Activation tier setup for ${chosenTier.replace(/_/g, ' ')}`,
        order_id: order_id,
        handler: async function (paymentResponse) {
          try {
            setLoading(true);
            await axiosInstance.post('documents/payments/verify-subscription/', {
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_order_id: paymentResponse.razorpay_order_id,
              razorpay_signature: paymentResponse.razorpay_signature,
            });
            setMessage("Transaction verified! Welcome to your upgraded system features.");
            await fetchSubscriptionDashboardData();
          } catch (verErr) {
            setError("Signature validation handshaking dropped. Please contact account audit support.");
            setLoading(false);
          }
        },
        prefill: {
          name: user_details?.fullname || '',
          email: user_details?.email || ''
        },
        theme: { color: "#4f46e5" }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (err) {
      console.error("Razorpay generation crash:", err);
      setError(err.response?.data?.detail || "Could not instantiate Razorpay financial gateway pipelines.");
    } finally {
      setActionLoading(false);
    }
  };

  const formatPlanDisplay = (plan) => {
    if (!plan || plan === 'PAY_AS_YOU_VERIFY') return "Pay As You Verify Plan";
    return plan.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatToINR = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased relative">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Page Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Your Subscription</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Manage your subscriptions, review historical subscriptions, and deploy renewals.</p>
        </div>

        {/* Dynamic Alerts Feedback */}
        {message && (
          <div className="p-4 mb-6 bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-fadeIn">
            <span>✨</span> {message}
          </div>
        )}
        {error && (
          <div className="p-4 mb-6 bg-rose-50 border border-rose-200/60 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-sm animate-fadeIn">
            <span>⚠️</span> {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-20 text-center shadow-sm flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-9 w-9 border-2 border-indigo-600 border-t-transparent mb-4" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Syncing database billing feeds...</p>
          </div>
        ) : (
          <div className="space-y-10">
            
            {/* PREMIUM HERO CONTAINER STATE CARD */}
            <div className="bg-white border border-slate-200/80 shadow-md rounded-2xl p-6 relative overflow-hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-50/60 via-purple-50/30 to-transparent rounded-bl-full -z-0 opacity-80" />
              
              <div className="space-y-1.5 relative z-10">
                <span className="text-[10px] font-extrabold tracking-widest text-indigo-600 uppercase block">Active Plan</span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                  {formatPlanDisplay(subscription?.plan_type)}
                  {subscription?.is_active && (
                    <span className="px-2 py-0.5 text-[9px] font-black bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md uppercase tracking-wider">
                      Live
                    </span>
                  )}
                </h2>
                <p className="text-xs font-medium text-slate-500 max-w-md leading-relaxed">
                  {subscription?.is_active
                    ? `Premium benefits are fully enabled on this account. Your continuous processing privileges will refresh on ${new Date(subscription.expires_at).toLocaleDateString('en-IN')}.`
                    : "You are currently using the Pay-As-You-Verify plan. Upgrade or buy a package to reset your active processing credits."}
                </p>
              </div>

              <div className="flex items-center gap-4 relative z-10 border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-100">
                {subscription?.is_active ? (
                  <button
                    disabled={actionLoading}
                    onClick={() => setIsCancelModalOpen(true)} // 🚀 Triggers custom modal pop-up
                    className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-xl transition duration-150 cursor-pointer disabled:opacity-40 select-none shadow-sm"
                  >
                    Cancel Membership
                  </button>
                ) : (
                  <button
                    disabled={actionLoading}
                    onClick={() => navigate('/pricing')}
                    className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-100 transition duration-150 cursor-pointer disabled:opacity-40 select-none"
                  >
                    Activate Premium Pass
                  </button>
                )}
              </div>
            </div>

            {/* HISTORICAL LIST SECTION */}
            <div className="space-y-4">
              <div className="pb-2 border-b border-slate-200">
                <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">Historical Passes</h3>
                <p className="text-xs text-slate-400 mt-0.5">Audit track containing every subscription iteration bound to this account framework.</p>
              </div>

              {paymentHistory.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-14 text-center text-xs text-slate-400 font-semibold shadow-inner">
                  No historical subscription logs located. Upgrade your active package.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {paymentHistory.map((pay, index) => {
                    
                    const purchaseTime = new Date(pay.created_at).getTime();
                    const expirationThresholdTime = purchaseTime + (30 * 24 * 60 * 60 * 1000);
                    const isTimeExpired = Date.now() > expirationThresholdTime;

                    const isNotTheLatestActiveRow = index !== 0 || !subscription?.is_active;
                    const isRowTrulyExpired = isTimeExpired || isNotTheLatestActiveRow;
                    
                    return (
                      <div 
                        key={pay.id}
                        className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-sm hover:border-slate-300 transition-all duration-150 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                      >
                        {/* Info Block Left */}
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-200 flex items-center justify-center text-[8px]" />
                            <h4 className="font-extrabold text-slate-800 text-sm">
                              {formatPlanDisplay(pay.plan_type)}
                            </h4>
                            <span className="font-mono text-slate-400 text-[10px] bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                              #{pay.razorpay_order_id ? pay.razorpay_order_id.substring(6, 16) : pay.id}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-5 text-xs text-slate-400 font-medium">
                            <p>Purchased: <span className="text-slate-600 font-semibold">{new Date(pay.created_at).toLocaleDateString('en-IN')}</span></p>
                            <p>Price: <span className="text-indigo-600 font-black">{formatToINR(pay.amount)}</span></p>
                          </div>
                        </div>

                        {/* Status / Trigger Blocks Right */}
                        <div className="flex items-center sm:justify-end gap-3 border-t sm:border-0 pt-3 sm:pt-0 border-slate-100">
                          {pay.status !== 'SUCCESS' ? (
                            <div className="flex items-center gap-2.5 w-full sm:w-auto">
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100">
                                Failed
                              </span>
                              <button
                                disabled={actionLoading}
                                onClick={() => handleRenewSubscription(pay.plan_type.toLowerCase())}
                                className="w-full sm:w-auto px-4 py-1.5 text-xs font-bold bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-xl transition duration-150 cursor-pointer disabled:opacity-40 outline-none"
                              >
                                Try Again
                              </button>
                            </div>
                          ) : isRowTrulyExpired ? (
                            <div className="flex items-center gap-2.5 w-full sm:w-auto">
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-400 border border-slate-200/60">
                                Expired
                              </span>
                              <button
                                disabled={actionLoading}
                                onClick={() => handleRenewSubscription(pay.plan_type.toLowerCase())}
                                className="w-full sm:w-auto px-4 py-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition duration-150 cursor-pointer disabled:opacity-40 outline-none shadow-sm"
                              >
                                Renew Membership
                              </button>
                            </div>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 animate-pulse">
                              Running Active
                            </span>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}
      </main>

      {/* 🚀 PREMIUM MODAL OVERLAY COMPONENT DIALOG PANEL */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-500">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-tight">Cancel Subscription?</h3>
            </div>
            
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Are you sure you want to turn off your {formatPlanDisplay(subscription.plan_type)} subscription?
            </p>

            <div className="flex space-x-3 pt-2 text-xs font-bold">
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer outline-none border-0"
              >
                Keep Plan
              </button>
              <button
                onClick={handleConfirmCancel}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow transition cursor-pointer outline-none border-0"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}