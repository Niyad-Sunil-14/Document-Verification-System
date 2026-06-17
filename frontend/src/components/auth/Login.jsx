import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import axiosInstance from '../../api/Axiosinstance';
import { Link, useNavigate } from 'react-router';

const Login = () => {
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false); // 🔥 FIXED: Boolean configuration instead of a blank string

  const onSubmit = async (data) => {
    setServerError(""); 
    try {
      // Alternative approach inside try block if backend doesn't output info on login:
  const response = await axiosInstance.post('auth/login/', data);

  // Temporarily attach token to fetch profile data
  localStorage.setItem('access_token', response.data.access);

  const profileResponse = await axiosInstance.get('users/profile/');
  if (profileResponse.data.is_staff || profileResponse.data.is_superuser) {
    localStorage.clear(); // Drop the token immediately
    setServerError("Access Denied: Administrators must use the secure Staff Gateway portal.");
    return;
  }

  // Valid user, store refresh token and proceed
  localStorage.setItem('refresh_token', response.data.refresh);
navigate('/user-dashboard', { replace: true });
    } catch (err) {
      const errorMsg = err.response?.data?.detail || "Invalid Email or Password";
      setServerError(errorMsg);
    }
  };

  const eyes = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="bg-white rounded-3xl shadow-2xl flex flex-col md:flex-row max-w-4xl w-full overflow-hidden min-h-[500px]">
        
        <div className="md:w-1/2 bg-[#f2eafa] flex items-center justify-center p-8">
          <img 
            src="/login.png" 
            alt="Security Illustration" 
            className="w-full h-auto object-contain max-w-[300px]"
          />
        </div>

        <div className="md:w-1/2 bg-white p-10 flex flex-col justify-center">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Welcome Back</h2>
          <p className="text-xs text-gray-400 text-center mb-8"></p>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            
            {serverError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm font-medium">
                {serverError}
              </div>
            )}

            <div>
              <input
                {...register("email", { required: "Email is required" })}
                type="email"
                placeholder="Email"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all placeholder-gray-400 ${
                  errors.email || serverError ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.email && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.email.message}</p>}
            </div>

            <div className="relative">
              <input
                {...register("password", { required: "Password is required" })}
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all placeholder-gray-400 ${
                  errors.password || serverError ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              />
              <button onClick={eyes} type="button" className="absolute right-3 top-3.5 text-gray-400 cursor-pointer">
                {
                  showPassword ? (<i className="fa-regular fa-eye"></i>) : (<i className="fa-regular fa-eye-slash"></i>)
                }                                  
              </button>
              {errors.password && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.password.message}</p>}
            </div>

            <div className="flex items-center justify-between text-xs font-medium">
              <label className="flex items-center text-gray-600 cursor-pointer">
                <input type="checkbox" className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                Remember me
              </label>
              <Link to='/forgot-password' className="text-blue-600 hover:underline">Forgot password?</Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 rounded-lg text-white font-semibold transition-all shadow-lg cursor-pointer ${
                isSubmitting ? 'bg-gray-400' : 'bg-[#4F00FF] hover:bg-[#3D00CC] active:scale-[0.98]'
              }`}
            >
              {isSubmitting ? 'Checking...' : 'Login'}
            </button>

            <p className="text-center text-xs text-gray-600 mt-4">
              Don't have an account? <Link to='/register' className="text-blue-600 font-bold hover:underline">Register</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;