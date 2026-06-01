import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import axiosInstance from '../../api/Axiosinstance';
import { useNavigate } from 'react-router';

const AdminLogin = () => {
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    setServerError("");
    try {
      const response = await axiosInstance.post('auth/admin-login/', data);
      
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);

      navigate('/admin-dashboard');
    } catch (err) {
      const errorMsg = err.response?.data?.detail || "Admin authentication failed.";
      setServerError(errorMsg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900">
      {/* Main Container Card - Uses Slate-800 for a more "Secure/Admin" feel */}
      <div className="bg-white rounded-3xl shadow-2xl flex flex-col md:flex-row max-w-4xl w-full overflow-hidden min-h-[500px]">
        
        {/* Left Side: Darker Branding Area */}
        <div className="md:w-1/2 bg-slate-800 flex flex-col items-center justify-center p-8 text-white text-center">
          <div className="mb-6 p-4 bg-slate-700 rounded-full shadow-inner">
            <svg className="h-12 w-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Portal</h1>
          <p className="mt-4 text-slate-400 text-sm max-w-xs">
            Unauthorized access is strictly prohibited. Restricted to system administrators only.
          </p>
        </div>

        {/* Right Side: Form Area */}
        <div className="md:w-1/2 bg-white p-10 flex flex-col justify-center">
          <div className="mb-8">
            <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
              Secure Access
            </span>
            <h2 className="text-2xl font-bold text-gray-900 mt-2">Administrator Sign-In</h2>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            
            {/* Inline Server Error Message */}
            {serverError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm font-medium animate-pulse">
                {serverError}
              </div>
            )}

            {/* Email Input */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1 uppercase">Admin Email</label>
              <input
                {...register("email", { required: "Admin email is required" })}
                type="email"
                placeholder="admin@docverify.com"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all placeholder-gray-400 ${
                  errors.email || serverError ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.email && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.email.message}</p>}
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1 uppercase">Secure Key</label>
              <input
                {...register("password", { required: "Password is required" })}
                type="password"
                placeholder="••••••••"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all placeholder-gray-400 ${
                  errors.password || serverError ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.password && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 rounded-lg text-white font-bold transition-all shadow-lg mt-4 ${
                isSubmitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-900 active:scale-[0.98]'
              }`}
            >
              {isSubmitting ? 'Verifying Credentials...' : 'Authenticate'}
            </button>

            <div className="text-center mt-6">
              <button 
                type="button"
                onClick={() => navigate('/login')}
                className="text-xs text-blue-600 font-semibold hover:underline"
              >
                Return to Standard User Login
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
