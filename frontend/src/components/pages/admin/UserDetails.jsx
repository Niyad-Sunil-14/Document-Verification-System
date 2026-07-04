import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import axiosInstance from '../../../api/Axiosinstance';
import AdminNavbar from './AdminNavbar';

export default function UserDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUserProfileDetails = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get(`admin/users/${id}/`);
        setProfile(response.data);
      } catch (err) {
        console.error("Profile parsing error:", err);
        setError("Failed to construct profile record indicators. Check route permissions.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfileDetails();
  }, [id]);

  return (
    <>
      <AdminNavbar />
      <div className="bg-slate-50 min-h-[calc(100vh-4rem)] py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Back Action Header */}
          <button
            onClick={() => navigate('/all-users')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-slate-900 transition mb-6 cursor-pointer"
          >
            ← Return to All Users
          </button>

          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-600 border-t-transparent mx-auto" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-semibold">
              {error}
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Account Meta Metric Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900">{profile.fullname}</h2>
                    {profile.is_subscribed && (
                      <span className="px-2 py-0.5 rounded bg-violet-100 text-[10px] font-extrabold text-violet-700 uppercase tracking-wide">
                        Premium
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-mono text-gray-400 mt-0.5">{profile.email}</p>
                </div>

                {/* Tokens display badge metrics */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-left sm:text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Available Vault Tokens</p>
                  <p className="text-xl font-extrabold text-slate-800">{profile.document_credits} Credits</p>
                </div>
              </div>

              {/* Uploaded Files Matrix Section */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-bold text-slate-800 text-sm">Uploaded Document Ingestion Logs</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Historical verification tracks processed by this profile entity.</p>
                </div>

                {!profile.documents || profile.documents.length === 0 ? (
                  <p className="p-8 text-center text-xs font-medium text-gray-400">No documents uploaded by this user yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/30 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                          <th className="px-6 py-3">File Title</th>
                          <th className="px-6 py-3">Category</th>
                          <th className="px-6 py-3">OCR Confidence</th>
                          <th className="px-6 py-3 text-right">Pipeline Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {profile.documents.map((doc) => (
                          <tr key={doc.id} className="hover:bg-slate-50/60 transition">
                            <td className="px-6 py-3.5 font-semibold text-slate-800 truncate max-w-[200px]" title={doc.filename}>
                              {doc.filename}
                            </td>
                            <td className="px-6 py-3.5 text-gray-500 font-medium uppercase tracking-tight">
                              {doc.document_type.replace(/_/g, ' ')}
                            </td>
                            <td className="px-6 py-3.5 font-mono font-bold text-slate-600">
                              {doc.ocr_accuracy ? `${doc.ocr_accuracy}%` : '0.00%'}
                            </td>
                            <td className="px-6 py-3.5 text-right">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                doc.status === 'APPROVED' 
                                  ? 'bg-green-50 text-green-700 border border-green-100' 
                                  : doc.status === 'REJECTED' 
                                  ? 'bg-red-50 text-red-700 border border-red-100' 
                                  : 'bg-amber-50 text-amber-700 border border-amber-100'
                              }`}>
                                {doc.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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