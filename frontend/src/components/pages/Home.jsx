import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  const [formState, setFormState] = useState({ name: '', email: '', message: '' });
  
  // 🔥 NEW STATE: Tracks user session login profile metrics 
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 🔥 EFFECT BLOCK: Check local user vaults context on component mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  const handleContactSubmit = (e) => {
    e.preventDefault();
    alert('Thank you for contacting us! We will get back to you shortly.');
    setFormState({ name: '', email: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900 font-sans scroll-smooth">
      
      {/* 1. PUBLIC NAVBAR */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            
            {/* Logo */}
            <div className="flex items-center gap-1">
              <img src="/logo.png" alt="icon" className="w-full h-auto object-contain max-w-[42px]"/>
              <span className="text-xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text">
                DocVerify
              </span>
            </div>

            {/* Public Links & Auth Buttons */}
            <div className="flex items-center space-x-1 sm:space-x-4">
              <div className="hidden md:flex items-center space-x-1 lg:space-x-4 mr-4">
                <a href="#" className="text-sm font-medium text-gray-500 hover:text-blue-600 transition px-2 py-1">
                  Home
                </a>
                <a href="#how-it-works" className="text-sm font-medium text-gray-500 hover:text-blue-600 transition px-2 py-1">
                  How it works
                </a>
                <a href="#features" className="text-sm font-medium text-gray-500 hover:text-blue-600 transition px-2 py-1">
                  Features
                </a>
                <a href="#about" className="text-sm font-medium text-gray-500 hover:text-blue-600 transition px-2 py-1">
                  About us
                </a>
                <a href="#contact" className="text-sm font-medium text-gray-500 hover:text-blue-600 transition px-2 py-1">
                  Contact us
                </a>
              </div>
              
              {/* 🔥 DYNAMIC AUTH BUTTON MATRIX ROW */}
              <div className='flex gap-2.5 items-center'>
                {isLoggedIn ? (
                  // Rendered link path if authentication token validation passes
                  <Link 
                    to='/user-dashboard'
                    className="inline-flex items-center text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-xl shadow-sm transition transform active:scale-[0.98] text-decoration-none"
                  >
                    <span>Go to Your Account</span>
                  </Link>
                ) : (
                  // Rendered default configuration options for guest sessions
                  <>
                    <Link to='/login'
                        className="text-sm font-semibold text-gray-700 hover:text-blue-600 px-4 py-2 transition border border-gray-300 hover:border-blue-600 rounded-xl text-decoration-none"
                    >
                        Login
                    </Link>
                    <Link to='/register'
                        className="inline-flex items-center text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl shadow-sm transition text-decoration-none"
                    >
                        Sign Up
                    </Link>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 text-center lg:text-left">
            <h1 className="text-4xl sm:text-6xl font-extrabold text-gray-900 tracking-tight leading-none">
              Streamlining security from {' '}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                upload to
              </span>{' '}
              verification.
            </h1>
            
            <p className="mt-6 text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Upload national IDs, driver's licenses, utility bills, and tax certificates. Process your files through our encrypted pipeline and get verified in seconds.
            </p>

            {/* Action Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row justify-center lg:justify-start items-center gap-4">
              <Link to={isLoggedIn ? '/user-dashboard' : '/register'}
                className="w-full sm:w-auto px-8 py-4 bg-gray-900 text-white font-bold rounded-xl shadow-md hover:bg-gray-800 transition text-center text-decoration-none"
              >
                {isLoggedIn ? 'Enter App Dashboard' : 'Create Free Account'}
              </Link>
              <a href="#how-it-works"
                className="w-full sm:w-auto px-8 py-4 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition text-center shadow-sm text-decoration-none"
              >
                Learn More
              </a>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center">
            <img src="/home2.png" alt="Security Dashboard Illustration" className="w-full max-w-md h-auto object-contain drop-shadow-xl" />
          </div>
        </div>
      </header>

      {/* 3. HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-20 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
              Simple 3-Step Verification
            </h2>
            <p className="mt-4 text-gray-500">
              Our automated network simplifies complex document workflows into a secure, instantaneous process.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="text-center p-6 relative">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl font-bold mx-auto mb-6 border border-indigo-100">
                1
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Secure Upload</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Drop your documents into our system. Every asset is instantly encrypted at rest using industry-standard AES-256 protocols.
              </p>
            </div>

            <div className="text-center p-6 relative">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl font-bold mx-auto mb-6 border border-indigo-100">
                2
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">AI Processing & OCR</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Our extraction engines isolate text arrays, cross-reference document boundaries, and scrub metadata automatically.
              </p>
            </div>

            <div className="text-center p-6 relative">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl font-bold mx-auto mb-6 border border-indigo-100">
                3
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Instant Validation</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Review automated verification confidence flags or trigger manual administrative sign-offs in real-time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. VALUE PROPS / FEATURES SECTION */}
      <section id="features" className="bg-gray-50 border-y border-gray-200 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
              A comprehensive document tracking platform
            </h2>
            <p className="mt-4 text-gray-500">
              No complex training needed. Simply drop a file and let our automated back-end orchestrate the entire process.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-xl mb-6">⚡</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Automated OCR Engine</h3>
              <p className="text-sm text-gray-500 leading-relaxed"> Our backend isolates and parses typed characters directly out of uploaded images and reads structured data blocks seamlessly.</p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl mb-6">👑</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Admin Compliance Verification</h3>
              <p className="text-sm text-gray-500 leading-relaxed">Extracted data remains locked to administrators for manual verification, approval queues, or rejection auditing flags.</p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center text-xl mb-6">🔒</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Dynamic Role Access</h3>
              <p className="text-sm text-gray-500 leading-relaxed">Our dynamic endpoints securely mask underlying model information, guaranteeing end-users never leak underlying admin text data.</p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl mb-6">📊</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Audit Trail Analytics</h3>
              <p className="text-sm text-gray-500 leading-relaxed">Track full version histories, processing time metrics, and administrative touches on every document payload seamlessly.</p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-xl mb-6">🌍</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Multi-Format Parsing</h3>
              <p className="text-sm text-gray-500 leading-relaxed">Accept uploads stretching from standard PNG/JPG snapshots to complex multi-page data sheets and nested digital PDFs.</p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition">
              <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center text-xl mb-6">🛡️</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">JWT Integrity Layer</h3>
              <p className="text-sm text-gray-500 leading-relaxed">Backed by Django REST stateless state variables, preventing session spoofing, data intersection, or structural leaks.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. ABOUT US SECTION */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-sm font-bold tracking-wider uppercase text-blue-600">Our Mission</span>
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight mt-2 mb-6">Bridging data ease with ironclad enterprise security.</h2>
              <p className="text-gray-600 mb-4 leading-relaxed">Founded at the intersection of machine learning intelligence and strict compliance standards, DocVerify provides tools to make compliance painless. We specialize in fast-turnaround OCR, custom validation parameters, and secure server-to-client processing.</p>
              <p className="text-gray-600 leading-relaxed">Today, thousands of applications process critical KYC requirements, driver records, and secure billing sheets inside our isolated ecosystem.</p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100"><p className="text-3xl font-extrabold text-blue-600">99.4%</p><p className="text-sm font-semibold text-gray-700 mt-1">OCR Match Accuracy</p></div>
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100"><p className="text-3xl font-extrabold text-indigo-600">&lt; 2s</p><p className="text-sm font-semibold text-gray-700 mt-1">Average Turnaround</p></div>
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100"><p className="text-3xl font-extrabold text-purple-600">M+</p><p className="text-sm font-semibold text-gray-700 mt-1">Scans Managed Safely</p></div>
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100"><p className="text-3xl font-extrabold text-emerald-600">AES</p><p className="text-sm font-semibold text-gray-700 mt-1">256-Bit Cryptography</p></div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CONTACT US SECTION */}
      <section id="contact" className="py-20 bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-5">
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-4">Get in touch with our security team</h2>
              <p className="text-gray-500 mb-8 max-w-md leading-relaxed">Have questions regarding structural operations, architecture requirements, scaling integrations, or custom enterprise terms? Drop us a line.</p>
              <div className="space-y-4">
                <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">📍</div><span className="text-sm text-gray-600 font-medium">Kochi, Suite 400, Kerala, India</span></div>
                <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">✉️</div><span className="text-sm text-gray-600 font-medium">support@docverify.com</span></div>
              </div>
            </div>

            <div className="lg:col-span-7 bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
              <form onSubmit={handleContactSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Full Name</label>
                    <input type="text" required value={formState.name} onChange={(e) => setFormState({...formState, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-sm transition" placeholder="Your Name"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Email Address</label>
                    <input type="email" required value={formState.email} onChange={(e) => setFormState({...formState, email: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-sm transition" placeholder="Your Email"/>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Message</label>
                  <textarea rows="4" required value={formState.message} onChange={(e) => setFormState({...formState, message: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-sm transition" placeholder="How can we help optimize your system?"></textarea>
                </div>
                <button type="submit" className="w-full py-3 px-6 text-white font-bold bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition text-center text-sm">Send Inquiry</button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FINAL CLOSING CALL-TO-ACTION */}
      <section id="security-cta" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="bg-gradient-to-tr from-blue-600 to-indigo-700 rounded-3xl p-8 sm:p-12 text-white shadow-xl">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Transform your document verification today.
          </h2>
          <p className="mt-4 text-blue-100 max-w-xl mx-auto text-sm sm:text-base">
            Create an account in seconds. Test out image scanning configurations and set up custom administrative verification logic paths today.
          </p>
          <div className="mt-8">
            {/* 🔥 BONUS: Hero Action Button automatically updates dynamically as well */}
            <Link
              to={isLoggedIn ? "/user-dashboard" : "/register"}
              className="inline-block px-6 py-3 bg-white text-blue-700 font-bold rounded-xl shadow-md hover:bg-blue-50 transition text-decoration-none"
            >
              {isLoggedIn ? "Go to My Dashboard →" : "Sign Up For Free"}
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 bg-white py-8 text-center text-xs text-gray-400">
        &copy; 2026 Docverify Inc. All rights reserved. Securely integrated via Django JWT REST Services.
      </footer>

    </div>
  );
}