import React, { useState } from 'react'; // Added useState
import { useForm } from 'react-hook-form';
import axiosInstance from '../../api/Axiosinstance';
import { Link, useNavigate } from 'react-router';

const Register = () => {
  const [serverError, setServerError] = useState(""); // State for backend errors
  const [isSuccess, setIsSuccess] = useState(false); // State for success message

  const { 
    register, 
    handleSubmit, 
    watch, 
    formState: { errors, isSubmitting } 
  } = useForm();
  
  const navigate = useNavigate();
  const password = watch("password", "");

  const onSubmit = async (data) => {
    setServerError(""); // Clear previous errors
    try {
      await axiosInstance.post('auth/register/', {
        email: data.email,
        fullname: data.fullname,
        password: data.password,
        role: "USER"
      });
      
      setIsSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
      
    } catch (err) {
      // Check if the backend sent a specific error message
      if (err.response && err.response.data) {
        // Django/FastAPI usually send errors in 'detail' or 'message'
        const backendMessage = err.response.data.detail || err.response.data.message;
        setServerError(backendMessage || "This email is already registered.");
      } else {
        setServerError("Network error. Please try again later.");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="bg-white rounded-3xl shadow-2xl flex flex-col md:flex-row max-w-4xl w-full overflow-hidden min-h-[600px]">
        
        {/* Left Side: Illustration */}
        <div className="md:w-1/2 bg-[#f2eafa] flex items-center justify-center p-8">
          <img 
            src="/login.png" 
            alt="Registration Illustration" 
            className="w-full h-auto object-contain max-w-[350px]"
          />
        </div>

        {/* Right Side: Form Area */}
        <div className="md:w-1/2 bg-white p-10 flex flex-col justify-center">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">Create Account</h2>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            
            {/* Server-Side Error Message */}
            {serverError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm font-medium animate-pulse">
                {serverError}
              </div>
            )}

            {/* Success Message */}
            {isSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm font-medium">
                Account created! Redirecting to login...
              </div>
            )}

            <div>
              <input
                {...register("fullname", { required: "Full name is required" })}
                type="text"
                placeholder="Full Name"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all ${errors.fullname ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.fullname && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.fullname.message}</p>}
            </div>

            <div>
              <input
                {...register("email", { 
                  required: "Email is required",
                  pattern: { value: /^\S+@\S+$/i, message: "Invalid email format" }
                })}
                type="email"
                placeholder="Email Address"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all ${
                  errors.email || serverError.toLowerCase().includes('email') ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              />
              
              {/* Client-side validation error */}
              {errors.email && (
                <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.email.message}</p>
              )}

              {/* Backend "Email Exists" error */}
              {serverError && serverError.toLowerCase().includes('email') && (
                <div className="flex items-center gap-1 mt-1 ml-1 text-red-600">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-[10px] font-bold">{serverError}</p>
                </div>
              )}
            </div>

            <div className="relative">
              <input
                {...register("password", { 
                  required: "Password is required",
                  minLength: { value: 6, message: "Minimum 6 characters" }
                })}
                type="password"
                placeholder="Password"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.password && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.password.message}</p>}
            </div>

            <div>
              <input
                {...register("confirmPassword", { 
                  required: "Please confirm your password",
                  validate: value => value === password || "Passwords do not match"
                })}
                type="password"
                placeholder="Confirm Password"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.confirmPassword && <p className="text-red-500 text-[10px] mt-1 ml-1">{errors.confirmPassword.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isSuccess}
              className={`w-full py-3 mt-2 rounded-lg text-white font-semibold transition-all shadow-lg ${
                isSubmitting || isSuccess ? 'bg-gray-400' : 'bg-[#4F00FF] hover:bg-[#3D00CC] active:scale-[0.98]'
              }`}
            >
              {isSubmitting ? 'Creating Account...' : 'Sign Up'}
            </button>

            <p className="text-center text-xs text-gray-600 mt-4">
              Already have an account? <Link to='/login' className="text-blue-600 font-bold hover:underline">Login</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;