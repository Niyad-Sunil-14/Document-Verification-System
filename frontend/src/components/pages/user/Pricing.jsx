import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import axiosInstance from '../../../api/Axiosinstance';

export default function Pricing() {
  const navigate = useNavigate();
  const [paying, setPaying] = useState(false);

  // Helper function to load Razorpay SDK dynamically
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Razorpay Checkout Gateway Implementation
  const handleSubscriptionPayment = async () => {
    try {
      setPaying(true);

      // 1. Initialize script validation
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        alert('Razorpay SDK failed to load. Check your network terminal loops.');
        setPaying(false);
        return;
      }

      // 2. Generate subscription record/order from your FastAPI/Django backend configuration setup
      // Update this endpoint string to match your backend subscription initiation route!
      const orderResponse = await axiosInstance.post('documents/payments/create-subscription/', {
        plan_type: 'monthly_premium',
        amount: 299
      });

      const { order_id, amount, currency, key_id, user_details } = orderResponse.data;

      // 3. Mount Razorpay Modal Options layout
      const options = {
        key: key_id,
        amount: amount, 
        currency: currency,
        name: 'DocVerify System',
        description: 'Monthly Premium Pass - 12 Free Upload Credits',
        image: '/logo.png',
        order_id: order_id,
        handler: async function (response) {
          try {
            // Send payment details back to view for signature evaluation handshake
            const verifyResponse = await axiosInstance.post('documents/payments/verify-subscription/', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyResponse.status === 200) {
              navigate('/user-dashboard');
            }
          } catch (err) {
            console.error('Subscription validation failed:', err);
            alert('Payment execution verified locally but rejected on cryptographic signature validation.');
          }
        },
        prefill: {
          name: user_details?.fullname || '',
          email: user_details?.email || '',
        },
        theme: {
          color: '#7c3aed', // Matches your violet color scheme layout
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();

    } catch (error) {
      console.error('Payment gateway pipeline failed:', error);
      alert(error.response?.data?.detail || 'Failed to initialize payment gateway.');
    } finally {
      setPaying(false);
    }
  };

  const tiers = [
    {
      name: 'Starter Pack', 
      price: '₹99',
      period: '/ month',
      description: 'Great for independent developers and students getting started with document parsing.',
      features: [
        '3 Free document uploads per month',
        'Standard Tesseract OCR engine access',
        'Detailed confidence and text accuracy analysis',
        '48-hour secure document cloud logs retention'
      ],
      cta: 'Choose Starter Pack',
      isCurrent: false, // Set to true if this is the user's active plan based on your backend response
      highlighted: false,
      link: '/upload' // Can be wired up to a ₹99 Razorpay order creation gateway later
    },
    {
      name: 'Monthly Premium Pass',
      price: '₹299',
      period: '/ month',
      description: 'Great value bundle offering upfront document credits and full system access.',
      features: [
        '12 Free document uploads included',
        'Subsequent uploads at discounted rates',
        'Advanced parallel OCR processing workers',
        'Secure Cloudinary cloud hosting storage',
        'Priority account activity log exports',
        'Dedicated backup document logs access'
      ],
      cta: paying ? 'Processing Portal...' : 'Subscribe Now',
      isCurrent: false,
      highlighted: true,
      onClick: handleSubscriptionPayment // Trigger checkout process
    },
    {
      name: 'Pay-As-You-Verify',
      price: '₹49',
      period: '/ document',
      description: 'Ideal for processing individual production documents securely with full features.',
      features: [
        'Unlimited document storage logs',
        'High-priority OCR execution pipeline',
        'Comprehensive metadata extraction fields',
        'Secure Cloudinary cloud hosting storage',
        'Instant Razorpay automated receipts'
      ],
      cta: 'Upload & Pay Now',
      isCurrent: false,
      highlighted: false,
      link: '/upload'
    }
  ];

  return (
    <>
      <Navbar />
      <div className="bg-slate-50 min-h-[calc(100vh-4rem)] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          
          {/* Header Block */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
              Simple, Transparent Pricing
            </h1>
            <p className="mt-4 text-lg text-gray-500">
              Choose the plan that fits your verification frequency. Pay per single scan or unlock bundled credits with our monthly subscription.
            </p>
          </div>

          {/* Cards Layout Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {tiers.map((tier, idx) => (
              <div 
                key={idx} 
                className={`bg-white rounded-2xl p-8 flex flex-col justify-between transition border shadow-sm relative ${
                  tier.highlighted 
                    ? 'border-violet-600 ring-2 ring-violet-600/10 scale-105 z-10' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {tier.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                    Best Value
                  </span>
                )}

                <div>
                  <h3 className="text-xl font-bold text-slate-900">{tier.name}</h3>
                  <p className="text-xs text-gray-400 mt-1 min-h-[32px]">{tier.description}</p>
                  
                  <div className="mt-4 flex items-baseline">
                    <span className="text-4xl font-extrabold text-slate-900 tracking-tight">{tier.price}</span>
                    {tier.period && <span className="text-sm font-semibold text-gray-400 ml-1">{tier.period}</span>}
                  </div>

                  <hr className="my-6 border-slate-100" />

                  <ul className="space-y-3.5">
                    {tier.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-start text-sm text-gray-600">
                        <svg className="w-5 h-5 text-violet-500 flex-shrink-0 mr-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8">
                  {tier.isCurrent ? (
                    <div className="w-full text-center bg-slate-100 text-slate-500 font-semibold py-3 px-4 rounded-xl text-sm border border-slate-200">
                      {tier.cta}
                    </div>
                  ) : tier.onClick ? (
                    <button 
                      onClick={tier.onClick}
                      disabled={paying}
                      className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 px-4 rounded-xl text-sm transition shadow-md disabled:opacity-50"
                    >
                      {tier.cta}
                    </button>
                  ) : (
                    <Link 
                      to={tier.link}
                      className="block w-full text-center bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-3 px-4 rounded-xl text-sm border border-slate-200 transition text-decoration-none"
                    >
                      {tier.cta}
                    </Link>
                  )}
                </div>

              </div>
            ))}
          </div>

        </div>
      </div>
    </>
  );
}