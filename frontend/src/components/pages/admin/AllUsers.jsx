import React, { useEffect, useState } from 'react';
import axiosInstance from '../../../api/Axiosinstance';
import { useNavigate } from 'react-router';
import AdminNavbar from './AdminNavbar';

export default function AllUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adminEmail, setAdminEmail] = useState('admin@docverify.io');
  
  
  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState('ALL');

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
        const profileResponse = await axiosInstance.get('users/profile/');
        if (profileResponse.data?.email) {
          setAdminEmail(profileResponse.data.email);
        }
      } catch (err) {
        console.error("Failed fetching system users:", err);
        setError("Could not parse user directory profiles. Ensure you have admin clearances.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllUsers();
  }, []);

  // Reset pagination to page 1 whenever search or filter metrics change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handlePlanFilterChange = (e) => {
    setPlanFilter(e.target.value);
    setCurrentPage(1);
  };

  // 🔥 LIVE FILTER & SEARCH MATRIX CALCULATIONS
  const filteredUsers = users.filter((account) => {
    const name = account.fullname ? account.fullname.toLowerCase() : '';
    const email = account.email ? account.email.toLowerCase() : '';
    const matchSearch = name.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());

    let matchPlan = true;
    if (planFilter === 'PREMIUM') {
      matchPlan = account.is_subscribed === true;
    } else if (planFilter === 'PAY_AS_GO') {
      matchPlan = account.is_subscribed === false;
    }

    return matchSearch && matchPlan;
  });

  // Compute Pagination Boundaries based on filtered array pool
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  return (
    <>
      <AdminNavbar email={adminEmail} />
      <div className="bg-slate-50 min-h-[calc(100vh-4rem)] py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">All Users</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage accounts, check verification metrics, and view subscription plan configurations across the application.
            </p>
          </div>

          {/* CONTROLS BAR (Placed statically outside data loop to prevent cursor drop logs) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="w-full sm:max-w-md relative">
              <input
                type="text"
                placeholder="Search user name or email..."
                value={searchTerm} 
                onChange={handleSearchChange}
                className="w-full px-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 shadow-inner"
              />
            </div>

            <div className="w-full sm:w-auto flex items-center space-x-2 self-start sm:self-auto">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Subscription Plans:</label>
              <select
                value={planFilter}
                onChange={handlePlanFilterChange} 
                className="px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer font-semibold"
              >
                <option value="ALL">All Plans</option>
                <option value="PREMIUM">Premium Tier</option>
                <option value="PAY_AS_GO">Pay As Go</option>
              </select>
            </div>
          </div>

          {/* Conditional Layout Output Pipeline */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-600 border-t-transparent mx-auto mb-4" />
              <p className="text-sm font-medium text-gray-500">Retrieving system ledger indexes...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-semibold">
              {error}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
              <span className="text-5xl block mb-4">👥</span>
              <h3 className="text-lg font-bold text-slate-900">No Matching Users</h3>
              <p className="text-gray-400 text-sm mt-1">We couldn't locate any accounts matching your search inputs or active plan filter.</p>
              <button 
                onClick={() => { setSearchTerm(''); setPlanFilter('ALL'); setCurrentPage(1); }}
                className="mt-5 text-xs font-bold text-violet-600 hover:underline cursor-pointer bg-transparent border-0 outline-none p-0"
              >
                Reset Filters
              </button>
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
                      <th className="px-6 py-4">Current Plan</th>
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
                            View Profile
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
                  <span className="font-bold text-slate-700">{Math.min(indexOfLastItem, filteredUsers.length)}</span> of{' '}
                  <span className="font-bold text-slate-700">{filteredUsers.length}</span> total users
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