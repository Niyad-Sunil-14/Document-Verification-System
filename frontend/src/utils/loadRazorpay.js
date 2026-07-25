// utils/loadRazorpay.js
let razorpayPromise = null;

export const loadRazorpayScript = () => {
  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  if (!razorpayPromise) {
    razorpayPromise = new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => {
        razorpayPromise = null; // Reset on failure so user can retry
        resolve(false);
      };
      document.body.appendChild(script);
    });
  }

  return razorpayPromise;
};