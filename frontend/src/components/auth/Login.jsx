import React from 'react';
import { useForm } from 'react-hook-form';
import axiosInstance from '../../api/Axiosinstance';

const Login = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (data) => {
    try {
      const response = await axiosInstance.post('auth/login/', data);
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
      alert("Login Successful!");
    } catch (err) {
      alert(err.response?.data?.detail || "Invalid Email or Password");
    }
  };

  return (
    <div className="min-h-screen  flex items-center justify-center p-4">
      {/* Main Container Card */}
      <div className="bg-white rounded-3xl shadow-2xl flex flex-col md:flex-row max-w-4xl w-full overflow-hidden min-h-[500px]">
        
        {/* Left Side: Illustration Area */}
        <div className="md:w-1/2 bg-[#f2eafa] flex items-center justify-center p-8">
          <img 
            src="https://img.freepik.com/free-vector/security-concept-illustration_114360-1512.jpg" 
            alt="Security Illustration" 
            className="w-full h-auto object-contain max-w-[300px]"
          />
        </div>

        {/* Right Side: Form Area */}
        <div className="md:w-1/2 bg-white p-10 flex flex-col justify-center">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Welcome Back</h2>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email Input */}
            <div>
              <input
                {...register("email", { required: "Email is required" })}
                type="email"
                placeholder="Email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all placeholder-gray-400"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1 ml-1">{errors.email.message}</p>}
            </div>

            {/* Password Input */}
            <div className="relative">
              <input
                {...register("password", { required: "Password is required" })}
                type="password"
                placeholder="Password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all placeholder-gray-400"
              />
              <button type="button" className="absolute right-3 top-3.5 text-gray-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
              {errors.password && <p className="text-red-500 text-xs mt-1 ml-1">{errors.password.message}</p>}
            </div>

            {/* Remember & Forgot Password */}
            <div className="flex items-center justify-between text-xs font-medium">
              <label className="flex items-center text-gray-600">
                <input type="checkbox" className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                Remember me
              </label>
              <a href="#" className="text-blue-600 hover:underline">Forgot password?</a>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 rounded-lg text-white font-semibold transition-all shadow-lg ${
                isSubmitting ? 'bg-gray-400' : 'bg-[#4F00FF] hover:bg-[#3D00CC] active:scale-[0.98]'
              }`}
            >
              {isSubmitting ? 'Checking...' : 'Login'}
            </button>

            {/* Register Link */}
            <p className="text-center text-xs text-gray-600 mt-4">
              Don't have an account? <a href="#" className="text-blue-600 font-bold hover:underline">Register</a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;