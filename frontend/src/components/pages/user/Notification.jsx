import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import axiosInstance from '../../../api/Axiosinstance';

export default function Notification() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAllNotifications = async () => {
    try {
      setLoading(true);
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
      // Map existing array locally to instantly update UI read states
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Failed to clear notifications:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 antialiased font-sans">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-10">
        
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Notification Center</h1>
            <p className="text-sm text-gray-500 mt-0.5">Stay updated with your document processing runs and compliance audits.</p>
          </div>
          {notifications.some(n => !n.is_read) && (
            <button 
              onClick={handleMarkAllRead}
              className="text-xs bg-violet-50 text-violet-700 font-bold px-3 py-2 rounded-xl border border-violet-100 hover:bg-violet-100 cursor-pointer transition"
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
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div 
                key={notif.id} 
                className={`p-4 rounded-xl border transition bg-white shadow-sm flex items-start justify-between ${
                  !notif.is_read ? 'border-violet-200 bg-violet-50/10' : 'border-slate-200'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <p className="font-bold text-sm text-slate-900">{notif.title}</p>
                    {!notif.is_read && <span className="h-1.5 w-1.5 rounded-full bg-violet-600" />}
                  </div>
                  <p className="text-sm text-slate-600 font-medium">{notif.description}</p>
                  <p className="text-[11px] text-gray-400 font-mono font-medium">{notif.created_at_human}</p>
                </div>
              </div>
            ))}

            {notifications.length === 0 && (
              <div className="text-center py-16 bg-white border border-slate-200 rounded-xl p-6 text-sm text-gray-400">
                📭 Your notifications log is currently empty.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}