import React, { useEffect, useState } from 'react';
import axiosInstance from '../../../api/Axiosinstance';
import Navbar from './Navbar';
import { Link, useNavigate } from 'react-router';

export default function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); 
  
  // 🚀 PAGINATION STATES
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6; // Change this number to adjust rows per page view
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPaymentRecords = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get('documents/payments/history/');
        setPayments(response.data);
      } catch (err) {
        console.error("Failed loading payment logs:", err);
        setError("Could not parse financial transaction records. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentRecords();
  }, []);

  // Helper function to format readable labels for your 3 payment channels
  const formatPlanType = (type) => {
    switch (type) {
      case 'STARTER_PACK':
        return 'Starter Pack';
      case 'MONTHLY_PREMIUM':
        return 'Monthly Premium Pass';
      case 'PAY_AS_YOU_VERIFY':
        return 'Pay As You Verify';
      default:
        return type.replace(/_/g, ' ');
    }
  };

  // 🚀 Handle Filter Shift + Reset Page index to start
  const handleFilterChange = (filterType) => {
    setStatusFilter(filterType);
    setCurrentPage(1);
  };

  // 🚀 STEP 1: Filter payment list dynamically
  const filteredPayments = payments.filter((item) => {
    if (statusFilter === 'ALL') return true;
    return item.status === statusFilter;
  });

  // 🚀 STEP 2: Slice the filtered array to segment out the current page view rows
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPayments.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);

  return (
    <>
        <Navbar/>
        <div className="bg-slate-50 min-h-[calc(100vh-4rem)] py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
                
                {/* Title Block & Filter Buttons Row Layout */}
                <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8 gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payment History</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Review detailed execution logs and transaction ID signatures of your transactions.
                    </p>
                  </div>

                  {/* Interactive Filter Action Pill Buttons */}
                  <div className="flex items-center gap-1.5 bg-slate-200/60 p-1 rounded-xl self-start">
                    <button
                      onClick={() => handleFilterChange('ALL')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        statusFilter === 'ALL'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-gray-500 hover:text-slate-800'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => handleFilterChange('SUCCESS')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        statusFilter === 'SUCCESS'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-gray-500 hover:text-emerald-600'
                      }`}
                    >
                      Success
                    </button>
                    <button
                      onClick={() => handleFilterChange('FAILED')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        statusFilter === 'FAILED'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-gray-500 hover:text-rose-600'
                      }`}
                    >
                      Failed
                    </button>
                  </div>
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
                ) : filteredPayments.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mx-auto mb-4 text-gray-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    </div>
                    <p className="text-sm font-bold text-slate-800">No matching transactions found</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {statusFilter === 'ALL' 
                        ? "When you purchase a subscription pack or pay per verify loop, your receipts will show up here."
                        : `There are currently zero logs flagged as '${statusFilter.toLowerCase()}' in your ledger list.`
                      }
                    </p>
                </div>
                ) : (
                /* Ledger Table Grid Core */
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                        <tr className="bg-slate-50/70 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-gray-400">
                            <th className="px-6 py-4">Transaction Details</th>
                            <th className="px-6 py-4">Order Reference ID</th>
                            <th className="px-6 py-4">Payment Tracking Code</th>
                            <th className="px-6 py-4">Date Collected</th>
                            <th className="px-6 py-4">Fee Charged</th>
                            <th className="px-6 py-4">Status</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                        {/* 🚀 Render slice group 'currentItems' instead of full array */}
                        {currentItems.map((item) => (
                            <tr 
                            key={item.id} 
                            onClick={() => navigate(`/payments/${item.id}`)}
                            className="hover:bg-slate-50 transition cursor-pointer group"
                            >
                            
                            {/* Account Transaction Details */}
                            <td className="px-6 py-4">
                                <p className="font-semibold text-slate-800 max-w-[200px] truncate group-hover:text-violet-600 transition" title={item.filename}>
                                    {item.filename || 'Direct Billing Line'}
                                </p>
                                <p className="text-xs text-violet-600 mt-0.5 uppercase tracking-tight font-bold">
                                    {formatPlanType(item.plan_type)}
                                </p>
                            </td>

                            {/* Razorpay Order Reference */}
                            <td className="px-6 py-4 font-mono text-xs text-gray-500 break-all">
                                {item.razorpay_order_id}
                            </td>

                            {/* Razorpay Payment ID Tracking */}
                            <td className="px-6 py-4 font-mono text-xs text-slate-600 break-all">
                                {item.razorpay_payment_id || <span className="text-gray-300 italic">none</span>}
                            </td>

                            {/* Date Field Display */}
                            <td className="px-6 py-4 text-xs text-gray-500 font-medium whitespace-nowrap">
                                {item.created_at}
                            </td>

                            {/* Price Point */}
                            <td className="px-6 py-4 font-extrabold text-slate-800">
                                ₹{item.amount.toFixed(2)}
                            </td>

                            {/* STATUS BADGE BLOCK */}
                            <td className="px-6 py-4">
                                {item.status === 'SUCCESS' ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-green-50 text-green-700 border border-green-200/60">
                                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5" />
                                    Success
                                </span>
                                ) : (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/60">
                                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 mr-1.5" />
                                    Failed
                                </span>
                                )}
                            </td>

                            </tr>
                        ))}
                        </tbody>
                    </table>
                    </div>
                    
                    {/* 🚀 PAGINATION FOOTER CONTROL PANEL BAR */}
                    <div className="bg-slate-50/70 px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-4">
                      <div className="text-xs text-gray-500 font-medium">
                        Showing <span className="font-bold text-slate-700">{indexOfFirstItem + 1}</span> to{' '}
                        <span className="font-bold text-slate-700">
                          {Math.min(indexOfLastItem, filteredPayments.length)}
                        </span>{' '}
                        of <span className="font-bold text-slate-700">{filteredPayments.length}</span> logs
                      </div>

                      {/* Pagination Actions Buttons (Rendered only if data spans multiple pages) */}
                      {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition cursor-pointer disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>
                          
                          <div className="flex items-center gap-1">
                            {[...Array(totalPages)].map((_, idx) => (
                              <button
                                key={idx + 1}
                                onClick={() => setCurrentPage(idx + 1)}
                                className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                                  currentPage === idx + 1
                                    ? 'bg-violet-600 text-white shadow-xs'
                                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                {idx + 1}
                              </button>
                            ))}
                          </div>

                          <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition cursor-pointer disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </div>
                </div>
                )}

            </div>
        </div>
    </>
  );
}