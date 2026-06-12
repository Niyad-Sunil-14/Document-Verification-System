import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router';
import axiosInstance from '../../api/Axiosinstance';

export default function RegisterOTP() {
  const location = useLocation();
  const navigate = useNavigate();

  // 1. STATE MANAGEMENT
  // Retrieve the email passed from the registration form state redirect
  const [email, setEmail] = useState(location.state?.email || '');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // step 1: Verify OTP | step 2: Success
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Fallback Redirect: If a user randomly types /verify-otp without signing up, boot them back
  useEffect(() => {
    if (!email) {
      setMessage('Error: No active registration session found. Please sign up first.');
    }
  }, [email]);

  // 2. SUBMIT OTP VERIFICATION TO BACKEND
  const handleVerifyAccount = async (e) => {
    e.preventDefault();
    if (!otp || !email) return;

    setLoading(true);
    setMessage('');

    try {
      // Hits your Django account activation endpoint
      const response = await axiosInstance.post('auth/verify-registration/', {
        email: email,
        otp: otp
      });

      if (response.status === 200 || response.status === 201) {
        setStep(2); // Move straight to Success screen
      }
    } catch (error) {
      const errorString = error.response?.data?.error || 'Invalid verification code. Please try again.';
      setMessage(`Error: ${errorString}`);
    } finally {
      setLoading(false);
    }
  };

  // 3. OPTIONAL: RESEND VERIFICATION OTP CODE ENGINE
  const handleResendOtp = async () => {
    if (!email) return;
    setLoading(true);
    setMessage('');

    try {
      const response = await axiosInstance.post('auth/resend-otp/', { email: email });
      setMessage(`Success: A verification code was delivered to ${email}`);
    } catch (error) {
      const errorString = error.response?.data?.error || 'Failed to dispatch code retransmission.';
      setMessage(`Error: ${errorString}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {step === 1 ? "Verify Your Account" : "Verification Complete!"}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {step === 1 
            ? `We sent a 6-digit confirmation code to ${email || 'your email'}.` 
            : "Your identity has been verified."
          }
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          
          {/* FEEDBACK SYSTEM ALERTS INFRASTRUCTURE */}
          {message && (
            <div className={`text-sm p-3 rounded-md text-center mb-6 border ${
              message.startsWith('Error:') 
                ? 'bg-red-50 text-red-700 border-red-200' 
                : 'bg-green-50 text-green-700 border-green-200'
            }`}>
              {message.replace('Error: ', '').replace('Success: ', '')}
            </div>
          )}

          {/* STEP 1: CAPTURE AND VERIFY DISPATCHED ACCOUNT OTP */}
          {step === 1 && (
            <form onSubmit={handleVerifyAccount} className="space-y-6">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 text-center mb-2">
                  Enter Secure Verification Code
                </label>
                <div className="mt-1">
                  <input
                    id="otp"
                    type="text"
                    maxLength="6"
                    required
                    disabled={!email || loading}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} // Protect string fields (numbers only)
                    className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 tracking-[0.5em] text-center font-black text-2xl bg-slate-50/50"
                    placeholder="000000"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition active:scale-[0.99] cursor-pointer"
                >
                  {loading ? "Validating Credentials..." : "Confirm & Verify"}
                </button>
              </div>

              {/* RESEND TIMELINE COMPONENT INTERFACE TRIGGER */}
              {email && (
                <div className="text-center pt-2">
                  <p className="text-xs text-gray-500">
                    Didn't receive the code?{" "}
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleResendOtp}
                      className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline bg-transparent border-0 outline-none p-0 cursor-pointer disabled:opacity-50"
                    >
                      Resend OTP
                    </button>
                  </p>
                </div>
              )}
            </form>
          )}

          {/* STEP 2: ACCOUNT PROVISIONED SUCCESS VIEWPORT */}
          {step === 2 && (
            <div className="text-center space-y-6 py-4">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-2xl bg-emerald-100 text-emerald-600 shadow-sm animate-bounce">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-extrabold text-slate-900">Registration Success!</h3>
                <p className="text-sm text-gray-500 max-w-xs mx-auto">
                  Your email has been verified successfully.
                </p>
              </div>

              <div className="pt-2">
                <Link 
                  to="/login"
                  className="w-full inline-flex justify-center py-3 px-4 border border-slate-200 rounded-xl shadow-sm text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 transition active:scale-[0.99]"
                >
                  Proceed to Login Page →
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}