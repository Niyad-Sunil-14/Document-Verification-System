import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode'; // Tracks user scope configuration roles
import Navbar from './Navbar';
import axiosInstance from '../../../api/Axiosinstance';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchAllNotifications = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const decoded = jwtDecode(token);
          setIsAdmin(decoded.is_superuser === true || decoded.is_staff === true || decoded.role === 'ADMIN');
        } catch (jwtErr) {
          console.error("Token decoding fault in notification center:", jwtErr);
        }
      }

      const response = await axiosInstance.get('documents/notifications/');
      setNotifications(response.data);
    } catch (err) {
      console.error("Error pulling notification history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await axiosInstance.patch('documents/notifications/');
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Failed to clear notifications:", err);
    }
  };

  // Dynamic Icon Generator optimized for both Document Statuses and Payment Statuses
  const renderNotificationIcon = (title) => {
    if (!title) return null;
    
    const titleLower = title.toLowerCase().trim();

    // --- 1. PAYMENT NOTIFICATION GROUPS ---
    const isPaymentSuccess = titleLower.includes('subscription activated') || titleLower.includes('payment success');
    const isPaymentFailed = titleLower.includes('payment failed') || titleLower.includes('cancelled') || titleLower.includes('declined');

    // --- 2. DOCUMENT COMPLIANCE GROUPS ---
    const isDocApproved = titleLower.includes('approved') && !isPaymentSuccess;
    const isDocRejected = titleLower.includes('rejected') && !isPaymentFailed;
    const isReuploaded = titleLower.includes('re-uploaded');

    // 🟢 OPTION A: Payment Success Icon (Credit Card Check)
    if (isPaymentSuccess) {
      return (
        <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center flex-shrink-0 shadow-xs">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
          </svg>
        </div>
      );
    }

    // 🔴 OPTION B: Payment Failure Icon (Credit Card Warning Alert)
    if (isPaymentFailed) {
      return (
        <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-300 text-rose-700 flex items-center justify-center flex-shrink-0 shadow-xs">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
      );
    }

    // 🟢 OPTION C: Document Approved Icon (Success Verification Shield)
    if (isDocApproved) {
      return (
        <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-200 text-green-600 flex items-center justify-center flex-shrink-0 shadow-sm">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
      );
    }

    // 🔴 OPTION D: Document Rejected Icon (Validation Standard Cross)
    if (isDocRejected) {
      return (
        <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center flex-shrink-0 shadow-sm">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      );
    }

    // 🔄 OPTION E: Document Re-uploaded Icon (The rotation tracking loop)
    if (isReuploaded) {
      return (
        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center flex-shrink-0 shadow-xs">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </div>
      );
    }

    // 🟣 DEFAULT: Generic message notification bubble fallback
    return (
      <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-200 text-violet-600 flex items-center justify-center flex-shrink-0 shadow-sm">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      </div>
    );
  };

  // Helper Parser to split main text from embedded feedback strings
  const parseDescriptionAndRemarks = (descString) => {
    if (!descString) return { mainDescription: '', adminRemarks: '' };
    const splitToken = ' Remarks:';
    if (descString.includes(splitToken)) {
      const parts = descString.split(splitToken);
      const mainDescription = parts[0].trim();
      const adminRemarks = parts[1].replace(/^[:\s"']+|["']+\s*$/g, '').trim();
      return { mainDescription, adminRemarks };
    }
    return { mainDescription: descString, adminRemarks: '' };
  };

  // Automatically routes users to the proper viewing interface target route mapping
  const handleCardRedirection = (documentId) => {
    if (!documentId) return;
    navigate(`/documents/${documentId}`);    
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 antialiased font-sans">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-10">
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Notification Center</h1>
            <p className="text-sm text-gray-500 mt-0.5">Stay updated with your document processing runs and compliance audits.</p>
          </div>
          {notifications.some(n => !n.is_read) && (
            <button 
              onClick={handleMarkAllRead}
              className="text-xs bg-white hover:bg-slate-50 text-slate-700 font-bold px-4 py-2 rounded-xl border border-slate-200 hover:shadow-sm cursor-pointer transition active:scale-[0.98]"
            >
              Mark All as Read
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notif) => {
              const { mainDescription, adminRemarks } = parseDescriptionAndRemarks(notif.description);
              const titleLower = notif.title.toLowerCase();
              const isRejected = titleLower.includes('rejected') || titleLower.includes('fail') || titleLower.includes('failure') || titleLower.includes('dropped') || titleLower.includes('declined');

              return (
                <div 
                  key={notif.id} 
                  className={`p-5 rounded-2xl border bg-white shadow-sm flex items-start space-x-4 relative transition duration-150 ${
                    notif.is_read ? 'border-slate-200' : 'border-violet-100 bg-gradient-to-r from-violet-50/10 to-transparent'
                  }`}
                >
                  {/* Dynamic Status Icon Component */}
                  {renderNotificationIcon(notif.title)}

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <p className="font-extrabold text-sm text-slate-900 truncate pr-6">
                        {notif.title.replace(/[^\x00-\x7F]/g, "").trim()}
                      </p>
                      {!notif.is_read && (
                        <span className="h-2 w-2 rounded-full bg-violet-600 animate-pulse flex-shrink-0" />
                      )}
                    </div>

                    <p className="text-sm text-slate-600 font-medium leading-relaxed break-words">
                      {mainDescription}
                    </p>

                    {adminRemarks && (
                      <div className={`mt-2 p-3 rounded-xl border text-xs leading-relaxed font-medium transition ${
                        isRejected 
                          ? 'bg-rose-50/40 border-rose-100 text-rose-800' 
                          : 'bg-slate-50 border-slate-100 text-slate-700'
                      }`}>
                        <span className="font-bold uppercase tracking-wider block text-[10px] text-gray-400 mb-0.5">
                          Admin Review Feedback
                        </span>
                        <p className="italic">"{adminRemarks}"</p>
                      </div>
                    )}

                    {/* BOTTOM INFORMATION ACTION FOOTER ROW */}
                    <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-100/60">
                      <p className="text-[10px] text-gray-400 font-mono font-bold tracking-wider uppercase block">
                        {notif.created_at_human}
                      </p>

                      {notif.document_id && (
                        <button
                          onClick={() => handleCardRedirection(notif.document_id)}
                          className="inline-flex items-center space-x-1 px-3 py-1 bg-slate-50 hover:bg-violet-600 text-slate-700 hover:text-white text-xs font-bold rounded-lg border border-slate-200 hover:border-violet-600 transition duration-150 cursor-pointer shadow-sm active:scale-[0.97]"
                        >
                          <span>View Document</span>
                          <span className="text-[10px]">↗</span>
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}

            {notifications.length === 0 && (
              <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl p-6 text-sm text-gray-400 shadow-sm">
                <span className="text-4xl block mb-3">📭</span>
                <p className="font-bold text-slate-700">Your layout log is empty</p>
                <p className="text-xs text-gray-400 mt-0.5">We will alert you here as soon as an administrator takes action on your uploaded items.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}