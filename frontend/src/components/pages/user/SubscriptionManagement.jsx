import React, { useState, useEffect } from 'react';
import axiosInstance from '../../../api/Axiosinstance';
import Navbar from './Navbar';

export default function SubscriptionManagement() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 1. DATA INGESTION: Read active status criteria
  const fetchSubscriptionDetails = async () => {
    try {
      setLoading(true);
      setError('');
      // Hits path('users/subscription-details/', SubscriptionDetailsView.as_view())
      const response = await axiosInstance.get('documents/users/subscription-details/');
      setSubscription(response.data);
    } catch (err) {
      console.error("Subscription retrieval fault:", err);
      setError(err.response?.data?.detail || "Failed to download active subscription data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionDetails();
  }, []);

  // 2. CANCELLATION HANDLER
  const handleCancelSubscription = async () => {
    if (!window.confirm("Are you sure you want to turn off your premium continuous recurring membership limits?")) return;
    
    try {
      setActionLoading(true);
      setMessage('');
      // Hits path('users/subscription-cancel/', CancelSubscriptionView.as_view())
      const response = await axiosInstance.post('documents/users/subscription-cancel/');
      setMessage(response.data.detail || "Your tier configuration has been downgraded successfully.");
      await fetchSubscriptionDetails();
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

      // Hits path('payments/create-subscription/', CreateSubscriptionView.as_view())
      const response = await axiosInstance.post('documents/payments/create-subscription/', {
        plan_type: chosenTier
      });
      
      const { order_id, amount, currency, key_id, user_details } = response.data;

      const options = {
        key: key_id,
        amount: amount,
        currency: currency,
        name: "DocVerify Services",
        description: `Purchase or reactivation of ${chosenTier.replace(/_/g, ' ')}`,
        order_id: order_id,
        handler: async function (paymentResponse) {
          try {
            setLoading(true);
            // Hits path('payments/verify-subscription/', VerifySubscriptionView.as_view())
            await axiosInstance.post('documents/payments/verify-subscription/', {
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_order_id: paymentResponse.razorpay_order_id,
              razorpay_signature: paymentResponse.razorpay_signature,
            });
            setMessage("Transaction verified! Welcome to your upgraded system features.");
            await fetchSubscriptionDetails();
          } catch (verErr) {
            setError("Signature handshake rejected. Please contact account audit nodes.");
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

  // Formatter mapping helpers
  const formatPlanDisplay = (plan) => {
    if (!plan || plan === 'PAY_AS_YOU_VERIFY') return "Pay As You Verify";
    return plan.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans antialiased">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Subscription Management</h1>
          <p className="text-gray-500 mt-1">Review your current plan bounds, verify rolling expiration windows, or purchase upgrades.</p>
        </div>

        {message && (
          <div className="p-4 mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold rounded-xl text-xs animate-fadeIn">
            ✅ {message}
          </div>
        )}
        {error && (
          <div className="p-4 mb-6 bg-rose-50 border border-rose-200 text-rose-700 font-semibold rounded-xl text-xs animate-fadeIn">
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-600 border-t-transparent mb-4" />
            <p className="text-xs font-semibold text-gray-400">Syncing database billing data indices...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            
            {/* LEFT AREA: CURRENT METRIC INDEX STATUS */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 relative overflow-hidden">
                <span className="text-[10px] font-black tracking-widest text-violet-600 uppercase block mb-1">Active Plan Registry</span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  {formatPlanDisplay(subscription?.plan_type)}
                </h2>

                <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100 text-xs font-medium">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Account State</span>
                    <span className={`inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase border ${
                      subscription?.is_active 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {subscription?.is_active ? "Premium Active" : "Standard Tier"}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Plan Expiration</span>
                    <span className="text-slate-800 font-bold block mt-1">
                      {subscription?.expires_at ? new Date(subscription.expires_at).toLocaleDateString('en-IN') : 'Expired / None'}
                    </span>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-100 flex flex-wrap gap-3 text-xs font-bold">
                  {subscription?.is_active ? (
                    <button
                      disabled={actionLoading}
                      onClick={handleCancelSubscription}
                      className="px-4 py-2.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-xl transition cursor-pointer disabled:opacity-40"
                    >
                      Cancel Plan Immediate
                    </button>
                  ) : (
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        disabled={actionLoading}
                        onClick={() => handleRenewSubscription('starter_pack')}
                        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition cursor-pointer disabled:opacity-40"
                      >
                        Activate Starter (₹99)
                      </button>
                      <button
                        disabled={actionLoading}
                        onClick={() => handleRenewSubscription('monthly_premium')}
                        className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow transition cursor-pointer disabled:opacity-40"
                      >
                        Activate Premium (₹299)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT SIDE PANEL: FEATURE CHECKBOX BENEFITS */}
            <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-xs font-black tracking-widest text-violet-400 uppercase">System Plan Specs</h3>
              <ul className="space-y-3 text-slate-300 text-[11px] font-medium leading-relaxed">
                <li className="flex items-center space-x-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Starter Pack adds 3 high-speed extraction loops</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Premium Pass unlocks 12 automated pipeline checks</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Continuous 30-day structural security access track</span>
                </li>
              </ul>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}