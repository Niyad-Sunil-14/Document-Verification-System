import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../api/Axiosinstance';
import Navbar from './Navbar';
import { loadRazorpayScript } from '../../../utils/loadRazorpay';
import { useUser } from '../../../context/UserContext';

export default function SubscriptionManagement() {
  const navigate = useNavigate();
  const { refreshProfile } = useUser();

  const [subscription, setSubscription] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 🚀 Track the specific plan/item target for cancellation modal
  const [targetCancelItem, setTargetCancelItem] = useState(null);

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

  // 🚀 Updated: Pass specific identifier (id or plan_type) to the backend payload
  const handleConfirmCancel = async () => {
    if (!targetCancelItem) return;
    
    const itemToCancel = targetCancelItem;
    setTargetCancelItem(null);
    
    try {
      setActionLoading(true);
      setMessage('');
      
      // Call backend cancel endpoint
      await axiosInstance.post('documents/users/subscription-cancel/', {
        payment_id: itemToCancel.id,
        plan_type: itemToCancel.plan_type
      });

      setMessage(`${formatPlanDisplay(itemToCancel.plan_type)} renewal status was canceled successfully.`);
      
      // 🚀 Refresh both global user context and local list state
      if (refreshProfile) await refreshProfile();
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

            if (refreshProfile) {
              await refreshProfile();
            }

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

  // Helper check for 30-day limit per purchase
  const checkIsExpired = (createdAt) => {
    const purchaseTime = new Date(createdAt).getTime();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    return Date.now() > (purchaseTime + THIRTY_DAYS_MS);
  };

  // Filter out active running passes for top list summary
  const activePasses = paymentHistory.filter(
    pay => pay.status === 'SUCCESS' && !checkIsExpired(pay.created_at) && !pay.is_cancelled
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100 font-sans antialiased relative transition-colors duration-200">

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Page Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Your Subscriptions</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Manage active plans, review payment logs, and trigger renewals individually.</p>
        </div>

        {/* Dynamic Alerts Feedback */}
        {message && (
          <div className="p-4 mb-6 bg-emerald-50 border border-emerald-200/60 dark:bg-emerald-950/30 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-400 text-xs font-semibold rounded-xl flex items-center gap-2 animate-fadeIn">
            <span>✨</span> {message}
          </div>
        )}
        {error && (
          <div className="p-4 mb-6 bg-rose-50 border border-rose-200/60 dark:bg-rose-950/30 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-sm animate-fadeIn">
            <span>⚠️</span> {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 rounded-2xl p-20 text-center shadow-sm flex flex-col items-center justify-center transition-colors">
            <div className="animate-spin rounded-full h-9 w-9 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent mb-4" />
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Syncing database billing feeds...</p>
          </div>
        ) : (
          <div className="space-y-10">
            
            {/* 🚀 ACTIVE PLANS SUMMARY SECTION */}
            <div className="space-y-4">
              <span className="text-[10px] font-extrabold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase block">Active Plans Breakdown</span>
              
              {activePasses.length === 0 ? (
                <div className="bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 rounded-2xl p-6 text-center shadow-sm">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">No active plan passes running currently.</p>
                  <button
                    onClick={() => navigate('/pricing')}
                    className="mt-3 px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl shadow hover:bg-indigo-700 transition"
                  >
                    Activate Premium Pass
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {activePasses.map((activeItem) => (
                    <div 
                      key={activeItem.id} 
                      className="bg-white border border-slate-200/80 dark:bg-slate-800 dark:border-slate-700 shadow-md rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between gap-4 transition-colors"
                    >
                      <div className="space-y-1 z-10">
                        <div className="flex items-center justify-between">
                          <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                            {formatPlanDisplay(activeItem.plan_type)}
                          </h2>
                          <span className="px-2 py-0.5 text-[9px] font-black bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50 rounded-md uppercase tracking-wider">
                            Live
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Expires: {new Date(new Date(activeItem.created_at).getTime() + 30*24*60*60*1000).toLocaleDateString('en-IN')}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 z-10 flex justify-end">
                        <button
                          disabled={actionLoading}
                          onClick={() => setTargetCancelItem(activeItem)}
                          className="px-4 py-1.5 text-xs font-bold bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-700 dark:text-rose-400 rounded-xl transition cursor-pointer disabled:opacity-40 shadow-sm outline-none"
                        >
                          Cancel Plan
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* HISTORICAL & ALL PASSES SECTION */}
            <div className="space-y-4">
              <div className="pb-2 border-b border-slate-200 dark:border-slate-700">
                <h3 className="font-black text-slate-900 dark:text-white text-lg uppercase tracking-tight">Historical Passes & Logs</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Audit track containing every subscription iteration bound to this account framework.</p>
              </div>

              {paymentHistory.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700 p-14 text-center text-xs text-slate-400 font-semibold shadow-inner transition-colors">
                  No historical subscription logs located. Upgrade your active package.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {paymentHistory.map((pay) => {
                    const isRowTrulyExpired = checkIsExpired(pay.created_at);
                    const isRunningActive = pay.status === 'SUCCESS' && !isRowTrulyExpired && !pay.is_cancelled;
                    
                    return (
                      <div 
                        key={pay.id}
                        className="bg-white border border-slate-200/70 dark:bg-slate-800 dark:border-slate-700/80 rounded-2xl p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-150 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                      >
                        {/* Info Block Left */}
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <div className={`w-2 h-2 rounded-full shadow-sm ${
                              pay.status !== 'SUCCESS' 
                                ? 'bg-rose-500' 
                                : isRowTrulyExpired || pay.is_cancelled
                                ? 'bg-slate-300 dark:bg-slate-600' 
                                : 'bg-emerald-500 animate-pulse'
                            }`} />

                            <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
                              {formatPlanDisplay(pay.plan_type)}
                            </h4>
                            <span className="font-mono text-slate-400 dark:text-slate-400 text-[10px] bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-700">
                              #{pay.razorpay_order_id ? pay.razorpay_order_id.substring(6, 16) : pay.id}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-5 text-xs text-slate-400 dark:text-slate-400 font-medium">
                            <p>Purchased: <span className="text-slate-600 dark:text-slate-300 font-semibold">{new Date(pay.created_at).toLocaleDateString('en-IN')}</span></p>
                            <p>Price: <span className="text-indigo-600 dark:text-indigo-400 font-black">{formatToINR(pay.amount)}</span></p>
                          </div>
                        </div>

                        {/* Status / Trigger Blocks Right */}
                        <div className="flex items-center sm:justify-end gap-3 border-t sm:border-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-700 w-full sm:w-auto">
                          {pay.status !== 'SUCCESS' ? (
                            <div className="flex items-center gap-2.5 w-full sm:w-auto">
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/40">
                                Failed
                              </span>
                              <button
                                disabled={actionLoading}
                                onClick={() => handleRenewSubscription(pay.plan_type.toLowerCase())}
                                className="w-full sm:w-auto px-4 py-1.5 text-xs font-bold bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 hover:border-indigo-200 rounded-xl transition duration-150 cursor-pointer disabled:opacity-40 outline-none"
                              >
                                Try Again
                              </button>
                            </div>
                          ) : pay.is_cancelled ? (
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40">
                              Canceled
                            </span>
                          ) : isRowTrulyExpired ? (
                            <div className="flex items-center gap-2.5 w-full sm:w-auto">
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-400 border border-slate-200/60 dark:bg-slate-700/50 dark:text-slate-400 dark:border-transparent">
                                Expired
                              </span>
                              <button
                                disabled={actionLoading}
                                onClick={() => handleRenewSubscription(pay.plan_type.toLowerCase())}
                                className="w-full sm:w-auto px-4 py-1.5 text-xs font-bold bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-xl transition duration-150 cursor-pointer disabled:opacity-40 outline-none shadow-sm border-0"
                              >
                                Renew Membership
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-transparent animate-pulse">
                                Running Active
                              </span>
                              <button
                                disabled={actionLoading}
                                onClick={() => setTargetCancelItem(pay)}
                                className="px-3 py-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                              >
                                Cancel
                              </button>
                            </div>
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

      {/* CANCELLATION MODAL */}
      {targetCancelItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-100 dark:bg-slate-800 dark:border-slate-700 p-6 max-w-sm w-full shadow-2xl space-y-4 rounded-2xl transition-colors">
            <div className="flex items-center space-x-3 text-rose-500">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">Cancel Specific Plan?</h3>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              Are you sure you want to cancel the renewal for <strong className="text-slate-900 dark:text-slate-100">{formatPlanDisplay(targetCancelItem?.plan_type)}</strong> (Order #{targetCancelItem?.razorpay_order_id ? targetCancelItem.razorpay_order_id.substring(6, 16) : targetCancelItem?.id})?
            </p>

            <div className="flex space-x-3 pt-2 text-xs font-bold">
              <button
                onClick={() => setTargetCancelItem(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition cursor-pointer outline-none border-0"
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