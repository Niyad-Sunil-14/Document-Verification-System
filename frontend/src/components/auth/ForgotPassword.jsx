import { useState } from 'react';
import axiosInstance from '../../api/Axiosinstance';
import { Link } from 'react-router';

export default function ForgotPassword() {
  // States to manage the wizard workflow
  // step 1: Enter Email | step 2: Enter OTP & New Password | step 3: Success
  const [step, setStep] = useState(1); 
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Step 1: Send OTP to email via Django API
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setMessage(''); // Clear any old messages

    try {
        // Crucial: Pass email inside an object so Django receives {"email": "..."}
        const response = await axiosInstance.post('auth/forgot-password/', { email: email });

        // Assuming Django returns status code 200/201 on success
        if (response.status === 200) {
        setMessage(response.data.message || `OTP sent successfully to ${email}`);
        setStep(2); // Move to OTP verification step
        }
    } catch (error) {
        // Extract error message sent back by Django serializers
        const errorData = error.response?.data;
        const errorString = errorData?.email ? errorData.email[0] : (errorData?.error || 'Failed to send OTP.');
        setMessage(`Error: ${errorString}`);
    } finally {
        setLoading(false);
    }
  };

  // Step 2: Verify OTP and update password via Django API
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp || !newPassword) return;

    setLoading(true);
    setMessage(''); // Clear old messages

    try {
        const response = await axiosInstance.post('auth/reset-password/', {
        email: email, // Passed along so Django knows whose cache to check
        otp: otp,
        new_password: newPassword
        });

        if (response.status === 200) {
        setStep(3); // Move to Success screen
        }
    } catch (error) {
        // Extract custom error message from Django view (e.g., "Invalid OTP code.")
        const errorString = error.response?.data?.error || 'Invalid OTP or password update failed.';
        setMessage(`Error: ${errorString}`);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {step === 1 && "Forgot Password?"}
          {step === 2 && "Verify OTP"}
          {step === 3 && "Password Reset Complete"}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {step === 1 && "No worries, we'll send you reset instructions."}
          {step === 2 && "We sent a 6-digit code to your email."}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          
          {/* STEP 1: REQUEST OTP */}
          {step === 1 && (
            <div>
              <div className="sm:mx-auto sm:w-full sm:max-w-md mb-4">
                <a
                  href="/login" // Your login URL path
                  className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 transition"
                >
                  <i className="fa-solid fa-arrow-left mr-2"></i> Back to Login
                </a>
              </div>
              <form onSubmit={handleSendOtp} className="space-y-6">
                <div>
                  {message && (
                      <div className={`text-sm p-3 rounded-md text-center mb-4 border ${
                          message.startsWith('Error:') 
                          ? 'bg-red-50 text-red-700 border-red-200' 
                          : 'bg-green-50 text-green-700 border-green-200'
                      }`}>
                          {/* Clean up the prefix before displaying the text to the user */}
                          {message.replace('Error: ', '').replace('Success: ', '')}
                      </div>
                  )}
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <div className="mt-1">
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {loading ? "Sending..." : "Send OTP"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 2: VERIFY OTP & RESET */}
          {step === 2 && (
            <form onSubmit={handleResetPassword} className="space-y-6">
             {message && (
                    <div className={`text-sm p-3 rounded-md text-center mb-4 border ${
                        message.startsWith('Error:') 
                        ? 'bg-red-50 text-red-700 border-red-200' 
                        : 'bg-green-50 text-green-700 border-green-200'
                    }`}>
                        {/* Clean up the prefix before displaying the text to the user */}
                        {message.replace('Error: ', '').replace('Success: ', '')}
                    </div>
                )}
              
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                  Enter OTP
                </label>
                <div className="mt-1">
                  <input
                    id="otp"
                    type="text"
                    maxLength="6"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm tracking-widest text-center font-bold text-lg"
                    placeholder="000000"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="••••••••"
                  />
                  {/* Your custom interactive eye button */}
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    type="button"
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <i className="fa-regular fa-eye"></i>
                    ) : (
                      <i className="fa-regular fa-eye-slash"></i>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: SUCCESS SCREEN */}
          {step === 3 && (
            <div className="text-center space-y-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <i className="fa-solid fa-check text-green-600 text-xl"></i>
              </div>
              <p className="text-sm text-gray-500">
                Your password has been successfully reset. You can now log in with your new password.
              </p>
              <button
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Link to='/login'>Back to Login</Link>
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}