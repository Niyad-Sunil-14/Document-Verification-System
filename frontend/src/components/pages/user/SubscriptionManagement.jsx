import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // 🚀 Added navigation routing
import axiosInstance from '../../../api/Axiosinstance';
import Navbar from './Navbar';

export default function SubscriptionManagement() {
  const navigate = useNavigate(); // 🚀 Hook instantiation for component redirects
  const [subscription, setSubscription] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 1. DATA INGESTION: Read active status & complete transaction histories
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

  // 2. CANCELLATION HANDLER
  const handleCancelSubscription = async () => {
    if (!window.confirm("Are you sure you want to turn off your premium continuous recurring membership limits?")) return;
    
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

  // 3. RENEWAL HANDLER (Razorpay Integrated)
  const handleRenewSubscription = async (chosenTier = 'monthly_premium') => {
    try {
      setActionLoading(true);
      setMessage('');
      setError('');

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
    <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans antialiased">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Subscription Hub</h1>
          <p className="text-gray-500 mt-1">Review active tiers, view a detailed audit history of past subscriptions, or execute immediate contract renewals.</p>
        </div>

        {message && (
          <div className="p-4 mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold rounded-xl text-xs animate-fadeIn">
            ✅ {message}
          </div>
        )}
        {error && (
          <div className="p-4 mb-6 bg-rose-50 border border-rose-200 text-rose-700 font-semibold rounded-xl text-xs shadow-sm animate-fadeIn">
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-600 border-t-transparent mb-4" />
            <p className="text-xs font-semibold text-gray-400">Syncing complete data ledger feeds...</p>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* TOP POSITION: CURRENT SUBSCRIPTION MEMBERSHIP CARD STATUS */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 relative overflow-hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-50 to-transparent rounded-bl-full -z-0 opacity-60" />
              
              <div className="space-y-1 relative z-10">
                <span className="text-[10px] font-black tracking-widest text-violet-600 uppercase block">Current Active Account State</span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  {formatPlanDisplay(subscription?.plan_type)}
                  {subscription?.is_active && (
                    <span className="px-2 py-0.5 text-[9px] font-extrabold bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md uppercase tracking-wider">
                      Live
                    </span>
                  )}
                </h2>
                <p className="text-xs font-medium text-gray-400">
                  {subscription?.is_active
                    ? `Your continuous access window is healthy and updates on ${new Date(subscription.expires_at).toLocaleDateString('en-IN')}.`
                    : "Your profile is sitting on basic standard operational limitations."}
                </p>
              </div>

              <div className="flex items-center gap-4 relative z-10 border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-100">
                {subscription?.is_active ? (
                  <button
                    disabled={actionLoading}
                    onClick={handleCancelSubscription}
                    className="px-4 py-2 text-xs font-bold bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-xl transition cursor-pointer disabled:opacity-40"
                  >
                    Cancel Plan Immediate
                  </button>
                ) : (
                  <button
                    disabled={actionLoading}
                    onClick={() => navigate('/pricing')} // 🚀 Redirects cleanly to pricing layout
                    className="px-5 py-2.5 text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow transition cursor-pointer disabled:opacity-40"
                  >
                    Activate Premium Pass
                  </button>
                )}
              </div>
            </div>

            {/* SUBSCRIPTION CARD LEDGER LOG LIST (LINE-BY-LINE BLOCK ITEMS) */}
            <div className="space-y-4">
              <div className="pb-2 border-b border-slate-200">
                <h3 className="font-extrabold text-slate-800 text-base">Historical Subscription Passes</h3>
                <p className="text-xs text-gray-400 mt-0.5">Audit track containing every premium contract block bound to this account entity.</p>
              </div>

              {paymentHistory.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-gray-400 font-medium shadow-sm">
                  No subscription records found. Upgrade your plan using the options above.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {paymentHistory.map((pay) => {
                    const isRowExpired = new Date(pay.created_at).getTime() + (30 * 24 * 60 * 60 * 1000) < Date.now();
                    
                    return (
                      <div 
                        key={pay.id}
                        className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                      >
                        {/* Left Info Deck */}
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-slate-800 text-sm">
                              {formatPlanDisplay(pay.plan_type)}
                            </h4>
                            <span className="font-mono text-slate-400 text-[10px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                              ID: #{pay.razorpay_order_id ? pay.razorpay_order_id.substring(6, 16) : pay.id}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs font-medium text-gray-400">
                            <p>Purchased: <span className="text-slate-600 font-semibold">{new Date(pay.created_at).toLocaleDateString('en-IN')}</span></p>
                            <p>Price: <span className="text-slate-900 font-extrabold text-xs">{formatToINR(pay.amount)}</span></p>
                          </div>
                        </div>

                        {/* Right Status Actions Track */}
                        <div className="flex items-center sm:justify-end gap-3 border-t sm:border-0 pt-3 sm:pt-0 border-slate-100">
                          {/* 🚀 FIXED: Expired, Canceled, or Failed items can now all be renewed inline directly */}
                          {pay.status !== 'SUCCESS' ? (
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100">
                                Dropped
                              </span>
                              <button
                                disabled={actionLoading}
                                onClick={() => handleRenewSubscription(pay.plan_type.toLowerCase())}
                                className="w-full sm:w-auto px-4 py-2 text-xs font-bold bg-slate-150 hover:bg-violet-50 text-slate-700 hover:text-violet-600 border border-slate-200 hover:border-violet-200 rounded-xl transition cursor-pointer disabled:opacity-40"
                              >
                                Try Again
                              </button>
                            </div>
                          ) : isRowExpired ? (
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <span className="hidden sm:inline px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500">
                                Expired
                              </span>
                              <button
                                disabled={actionLoading}
                                onClick={() => handleRenewSubscription(pay.plan_type.toLowerCase())}
                                className="w-full sm:w-auto px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-violet-50 text-slate-700 hover:text-violet-600 border border-slate-200 hover:border-violet-200 rounded-xl transition cursor-pointer disabled:opacity-40"
                              >
                                Renew Membership
                              </button>
                            </div>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
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
    </div>
  );
}