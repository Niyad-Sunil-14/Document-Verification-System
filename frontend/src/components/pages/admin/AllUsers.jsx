import React, { useEffect, useState } from 'react';
import axiosInstance from '../../../api/Axiosinstance';
import { useNavigate } from 'react-router';
import AdminNavbar from './AdminNavbar';

export default function AllUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // Max users shown per row list block
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        setLoading(true);
        // Assumes your backend routing contains an admin utility fetch endpoint
        const response = await axiosInstance.get('admin/users/');
        setUsers(response.data);
      } catch (err) {
        console.error("Failed fetching system users:", err);
        setError("Could not parse user directory profiles. Ensure you have admin clearances.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllUsers();
  }, []);

  // Compute Pagination Boundaries
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = users.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(users.length / itemsPerPage);

  return (
    <>
      <AdminNavbar />
      <div className="bg-slate-50 min-h-[calc(100vh-4rem)] py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System User Directory</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage accounts, check verification metrics, and view subscription tier configurations across the application platform.
            </p>
          </div>

          {/* Conditional States */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-600 border-t-transparent mx-auto mb-4" />
              <p className="text-sm font-medium text-gray-500">Retrieving system ledger indexes...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-semibold">
              {error}
            </div>
          ) : users.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
              <p className="text-sm font-bold text-slate-800">No managed user entries returned</p>
            </div>
          ) : (
            /* Table Index */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-gray-400">
                      <th className="px-6 py-4">Account Holder</th>
                      <th className="px-6 py-4">Email Address</th>
                      <th className="px-6 py-4">Remaining Credits</th>
                      <th className="px-6 py-4">Tier Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {currentUsers.map((account) => (
                      <tr key={account.id} className="hover:bg-slate-50 transition group">
                        <td className="px-6 py-4 font-semibold text-slate-800 group-hover:text-violet-600 transition">
                          {account.fullname || 'Anonymous User'}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-gray-500">
                          {account.email}
                        </td>
                        <td className="px-6 py-4 font-extrabold text-slate-700">
                          {account.document_credits} tokens
                        </td>
                        <td className="px-6 py-4">
                          {account.is_subscribed ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-violet-50 text-violet-700 border border-violet-200/60">
                              Premium Tier
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200/60">
                              Pay As Go
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => navigate(`/admin/users/${account.id}`)}
                            className="text-xs font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition cursor-pointer"
                          >
                            Manage Profile
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="bg-slate-50/70 px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-4">
                <div className="text-xs text-gray-500 font-medium">
                  Showing <span className="font-bold text-slate-700">{indexOfFirstItem + 1}</span> to{' '}
                  <span className="font-bold text-slate-700">{Math.min(indexOfLastItem, users.length)}</span> of{' '}
                  <span className="font-bold text-slate-700">{users.length}</span> registry members
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer disabled:cursor-not-allowed"
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