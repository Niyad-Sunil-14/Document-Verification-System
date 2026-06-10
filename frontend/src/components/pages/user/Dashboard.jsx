import React, { useState, useEffect } from 'react';
import Navbar from './Navbar'; // The dashboard navbar we built previously
import { Link } from 'react-router';
import axiosInstance from '../../../api/Axiosinstance';

export default function UserDashboard() {
  // 1. STATE MANAGEMENT
  const [user, setUser] = useState();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [documents, setDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState({ text: '', isError: false });
  const [filterType, setFilterType] = useState('ALL');

  // 2. MOCK INGESTION: Simulating an API load from your Django endpoint
  useEffect(() => {
    // Replace this with your actual axios.get('http://127.0.0.1:8000/api/documents/lists/')
    const fetchlist = async () => {
        const response =  await axiosInstance.get('documents/list')
        setDocuments(response.data)
    }

    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        // Hits your Django endpoint (e.g., users/me/ or users/profile/)
        const response = await axiosInstance.get('users/profile/'); 
        
        setUser(response.data);
      } catch (err) {
        console.error("Profile fetching failed:", err);
        setError(err.response?.data?.detail || 'Failed to establish connection to identity vault.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserProfile();
    fetchlist();
  }, []);

  // 4. FILTER CONDITIONAL LOGIC
  const filteredDocuments = documents.filter((doc) => {
    if (filterType === 'ALL') return true;
    return doc.status === filterType;
  });

  // Dynamic Badge Color Utility
  const getStatusBadge = (status) => {
    const badges = {
      APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
      REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
    };
    return `px-3 py-1 rounded-full text-xs font-semibold border ${badges[status] || badges.PENDING}`;
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans antialiased">
      {/* GLOBAL HEADER HEADER BAR */}
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* UPPER BANNER SECTION */}
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Welcome, {user?.fullname}</h1>
          <p className="text-gray-500 mt-1">Upload your credentials, monitor ongoing audits, and view compliance status logs.</p>
        </div>

        {/* METRIC SUMMARIES */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Total Document Uploaded</p>
            <p className="text-3xl font-bold text-slate-800 mt-2">{documents.length}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Verified Secure</p>
            <p className="text-3xl font-bold text-emerald-600 mt-2">
              {documents.filter(d => d.status === 'APPROVED').length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Pending</p>
            <p className="text-3xl font-bold text-amber-600 mt-2">
              {documents.filter(d => d.status === 'PENDING').length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Rejected</p>
            <p className="text-3xl font-bold text-rose-600 mt-2">
              {documents.filter(d => d.status === 'REJECTED').length}
            </p>
          </div>
        </div>

        {/* Upload Document button */}
          <div className="mt-10 mb-10 flex flex-col sm:flex-row justify-center lg:justify-start items-center gap-4">
            <Link 
              to="/upload"
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 active:translate-y-0.5 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all duration-150 text-center"
            >
              Upload New Document
            </Link>
          </div>

        {/* DATA FILTERING BAR & RECENT REVIEWS CONTAINER */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          
          {/* Table Header Controls */}
          <div className="px-6 py-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
            <h3 className="text-base font-bold text-slate-900">Recent Activity</h3>
          </div>

          {/* TABLE PLATFORM */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left">
              <thead className="bg-slate-50/70 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Filename</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Uploaded at</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium">
                {filteredDocuments.slice(0,3).map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4 text-slate-900 whitespace-nowrap flex items-center space-x-2">
                      <span className="text-lg">📄</span>
                      <span className="truncate max-w-xs">{doc.filename}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 font-mono text-xs">{doc.document_type}</td>
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{doc.uploaded_at}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadge(doc.status)}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button 
                        onClick={() => alert(`Opening secure detail view frame parameters for item ID: ${doc.id}`)}
                        className="text-violet-600 hover:text-violet-900 font-bold transition-colors"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}

                {/* 🔥 THE FIXED VIEW ALL ROW */}
                {filteredDocuments.length > 0 && (
                  <tr className="bg-slate-50/30 hover:bg-slate-50 transition-colors">
                    <td colSpan="5" className="px-6 py-3.5 text-center">
                      <Link to='/documents'
                        className="inline-flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-violet-600 hover:text-violet-700 transition-colors"
                      >
                        <span>View All Documents</span>
                        <span>→</span>
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Zero Data State Handling */}
          {filteredDocuments.length === 0 && (
            <div className="p-12 text-center text-gray-400 text-sm">
              No matching verification tasks found in this query state layer.
            </div>
          )}
        </div>

      </main>
    </div>
  );
}