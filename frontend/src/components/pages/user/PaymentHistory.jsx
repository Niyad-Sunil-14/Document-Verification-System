import React, { useEffect, useState } from 'react';
import axiosInstance from '../../../api/Axiosinstance';
import Navbar from './Navbar';

export default function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPaymentRecords = async () => {
      try {
        setLoading(true);
        // Fetches your documents list from backend 
        const response = await axiosInstance.get('documents/list/');
        
        // Filter out only items that completed the verified payment block loop
        const verifiedPayments = response.data.filter(doc => doc.payment_verified);
        setPayments(verifiedPayments);
      } catch (err) {
        console.error("Failed loading payment logs:", err);
        setError("Could not parse transaction records. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentRecords();
  }, []);

  return (
    <>
        <Navbar/>
        <div className="bg-slate-50 min-h-[calc(100vh-4rem)] py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
                
                {/* Title Block */}
                <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payment History</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Review detailed execution logs and transaction ID signatures mapped to your verified documents.
                </p>
                </div>

                {/* Content States Management */}
                {loading ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-600 border-t-transparent mx-auto mb-4" />
                    <p className="text-sm font-medium text-gray-500">Syncing database billing ledgers...</p>
                </div>
                ) : error ? (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-semibold">
                    {error}
                </div>
                ) : payments.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mx-auto mb-4 text-gray-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    </div>
                    <p className="text-sm font-bold text-slate-800">No transactions recorded yet</p>
                    <p className="text-xs text-gray-400 mt-0.5">When you upload premium files, your payment histories will show up here.</p>
                </div>
                ) : (
                /* Ledger Table Grid Core */
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                        <tr className="bg-slate-50/70 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-gray-400">
                            <th className="px-6 py-4">Document Details</th>
                            <th className="px-6 py-4">Razorpay Order Reference</th>
                            <th className="px-6 py-4">Payment ID Tracking</th>
                            <th className="px-6 py-4">Fee Charged</th>
                            <th className="px-6 py-4">Status</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                        {payments.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/50 transition">
                            
                            {/* Filename details */}
                            <td className="px-6 py-4">
                                <p className="font-semibold text-slate-800 max-w-[200px] truncate" title={item.filename}>
                                {item.filename || 'Unnamed Document'}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5 uppercase tracking-tight font-medium">
                                {item.document_type}
                                </p>
                            </td>

                            {/* Razorpay Order Reference */}
                            <td className="px-6 py-4 font-mono text-xs text-gray-500 break-all">
                                {item.razorpay_order_id || 'N/A'}
                            </td>

                            {/* Razorpay Payment ID Tracking */}
                            <td className="px-6 py-4 font-mono text-xs text-slate-600 break-all">
                                {item.razorpay_payment_id || 'Manual_Override'}
                            </td>

                            {/* Price Point */}
                            <td className="px-6 py-4 font-bold text-slate-800">
                                ₹49.00
                            </td>

                            {/* Dynamic Badge Verification Metric */}
                            <td className="px-6 py-4">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-green-50 text-green-700 border border-green-200/60">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5" />
                                Success
                                </span>
                            </td>

                            </tr>
                        ))}
                        </tbody>
                    </table>
                    </div>
                    
                    {/* Footer metrics tag counter */}
                    <div className="bg-slate-50/50 px-6 py-3.5 border-t border-slate-100 text-right text-xs text-gray-400 font-semibold">
                    Total Managed Operations: {payments.length}
                    </div>
                </div>
                )}

            </div>
        </div>
    </>

  );
}