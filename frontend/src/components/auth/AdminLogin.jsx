import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import axiosInstance from '../../api/Axiosinstance';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../../context/UserContext';

const AdminLogin = () => {
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const { user, setUser, fetchProfile } = useUser();

  const targetPath = location.state?.from?.pathname && location.state.from.pathname !== '/admin-login'
    ? location.state.from.pathname
    : '/admin-dashboard';

  // If already authenticated as admin, redirect to admin dashboard
  useEffect(() => {
    const isStaff = user?.is_staff || user?.is_superuser || user?.role === 'ADMIN';
    if (user && isStaff) {
      navigate(targetPath, { replace: true });
    }
  }, [user, navigate, targetPath]);

  const eyes = () => {
    setShowPassword(!showPassword);
  };

  const onSubmit = async (data) => {
    setServerError("");
    try {
      const response = await axiosInstance.post('auth/admin-login/', data);
      
      // Store tokens
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);

      // Update User Context
      if (response.data.user) {
        setUser(response.data.user);
      } else if (fetchProfile) {
        await fetchProfile();
      }

      // Navigate after state sync
      navigate(targetPath, { replace: true, state: null });
    } catch (err) {
      const errorMsg = err.response?.data?.detail || "Admin authentication failed.";
      setServerError(errorMsg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900">
      <div className="bg-white rounded-3xl shadow-2xl flex flex-col md:flex-row max-w-4xl w-full overflow-hidden min-h-[500px]">
        
        {/* Branding Area */}
        <div className="md:w-1/2 bg-slate-800 flex flex-col items-center justify-center p-8 text-white text-center">
          <div className="mb-7 p-2.5 bg-slate-700 rounded-full shadow-inner">
            <img src="/logo.png" alt="icon" className="w-full h-auto object-contain max-w-[110px]"/>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">DocVerify Admin Portal</h1>
          <p className="mt-4 text-slate-400 text-sm max-w-xs">
            Unauthorized access is strictly prohibited. Restricted to system administrators only.
          </p>
        </div>

        {/* Form Area */}
        <div className="md:w-1/2 bg-white p-10 flex flex-col justify-center">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mt-2">Admin Sign-In</h2>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {serverError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm font-medium animate-pulse">
                {serverError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1 uppercase">Admin Email</label>
              <input
                {...register("email", { required: "Admin email is required" })}
                type="email"
                placeholder="Email"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all placeholder-gray-400 ${
                  errors.email || serverError ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.email && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.email.message}</p>}
            </div>

            <div className="relative">
              <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1 uppercase">Password</label>
              <div className="relative">
                <input
                  {...register("password", { required: "Password is required" })}
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  className={`w-full pl-4 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all placeholder-gray-400 ${
                    errors.password || serverError ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                />
                
                <button 
                  onClick={eyes} 
                  type="button" 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition cursor-pointer flex items-center justify-center"
                >
                  {showPassword ? (
                    <i className="fa-regular fa-eye"></i>
                  ) : (
                    <i className="fa-regular fa-eye-slash"></i>
                  )}                                  
                </button>
              </div>

              {errors.password && (
                <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 rounded-lg text-white font-bold transition-all shadow-lg mt-4 ${
                isSubmitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-900 active:scale-[0.98]'
              }`}
            >
              {isSubmitting ? 'Logging in...' : 'Login'}
            </button>

            <div className="text-center mt-6">
              <button 
                type="button"
                onClick={() => navigate('/login')}
                className="text-xs text-blue-600 font-semibold hover:underline bg-transparent border-0 cursor-pointer"
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