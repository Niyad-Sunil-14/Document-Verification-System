import React, { useState, useEffect, useRef } from 'react';
import Navbar from './Navbar';
import axiosInstance from '../../../api/Axiosinstance';

export default function Support() {
  // 1. GLOBAL UI CONFIGURATION
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });
  const [searchQuery, setSearchQuery] = useState('');

  // Support Ticket Form State
  const [ticketData, setTicketData] = useState({
    subject: '',
    category: 'TECHNICAL',
    messageText: ''
  });

  // AI Chatbot Assistant States
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: 'BOT', text: 'Hello! I am your automated DocVerify Support bot. How can I assist you with your document extractions, subscriptions, or credit balances today?' }
  ]);
  const [botTyping, setBotTyping] = useState(false);
  
  const messagesEndRef = useRef(null);

  // 🚀 FIXED: Only scroll if there is more than the 1 initial welcome message!
  // This guarantees zero page jumps on load, regardless of auth or parent component re-renders.
  useEffect(() => {
    if (chatMessages.length > 1 && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleTicketChange = (e) => {
    const { name, value } = e.target;
    setTicketData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setMessage({ text: '', isError: false });

      await axiosInstance.post('support/', {
        subject: ticketData.subject,
        category: ticketData.category, 
        message_text: ticketData.messageText
      });

      setMessage({ text: '🚀 Support enquiry sent successfully! Our team will review and response shortly.', isError: false });
      setTicketData({ subject: '', category: 'TECHNICAL', messageText: '' });
    } catch (err) {
      console.error("Form submission crash:", err);
      
      // ✅ Fixed Catch Case: Pull error message from backend response, keep form data intact, set red alert banner
      setMessage({ 
        text: err.response?.data?.detail || 'Failed to submit enquiry. Please check your network and try again.', 
        isError: true 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatMessages((prev) => [...prev, { id: Date.now(), text: userMessage, sender: 'USER' }]);
    setChatInput('');
    setBotTyping(true);

    setTimeout(() => {
      let aiText = "I encountered an unmapped inquiry keyword string. Could you clarify if your question relates to your available credits wallet, profile re-verification rules, or active subscription processing queues?";
      const msgLower = userMessage.toLowerCase();

      if (msgLower.includes('credit') || msgLower.includes('token') || msgLower.includes('balance') || msgLower.includes('deduct')) {
        aiText = "Every document verification attempt deducts 1 credit token from your profile pool. If your balance hits zero, the ingestion engine falls back to standard single-pay processing (₹49 per validation). You can top up tokens dynamically via the Pricing tier matrix.";
      } else if (msgLower.includes('reject') || msgLower.includes('fail') || msgLower.includes('remark') || msgLower.includes('wrong') || msgLower.includes('reason')) {
        aiText = "Document rejections are logged by administrative auditors when files are blurry or mismatched. Navigate to 'My Documents', open your specific file's details, read the custom notice under 'Remarks', and click 'Re-Upload' to resubmit a clean document scan.";
      } else if (msgLower.includes('premium') || msgLower.includes('plan') || msgLower.includes('subscription') || msgLower.includes('membership') || msgLower.includes('starter')) {
        aiText = "DocVerify features two bundled contracts: Starter Pack (₹99/mo for 3 tokens) and Monthly Premium Pass (₹299/mo for 12 tokens). Subscriptions activate automatically. If you wish to turn off recurring charges, use the 'Cancel Membership' option inside your Subscription Hub window.";
      } else if (msgLower.includes('pay') || msgLower.includes('payment') || msgLower.includes('razorpay') || msgLower.includes('checkout') || msgLower.includes('money') || msgLower.includes('order')) {
        aiText = "Our billing pipelines run via Razorpay. If your browser window closes prematurely during checkout, our backend catches the drop and records a tracking log under 'Failed' inside your Payment History. If funds were debited without token allocation, please submit an enquiry form.";
      } else if (msgLower.includes('profile') || msgLower.includes('email') || msgLower.includes('otp') || msgLower.includes('code') || msgLower.includes('verify')) {
        aiText = "To modify your account values, open your Profile tab. If you alter your login email string, our security firewall initiates a multi-step update loop: look for a 6-digit confirmation code token in your new inbox and enter it to apply changes safely.";
      } else if (msgLower.includes('ubuntu') || msgLower.includes('linux') || msgLower.includes('dark') || msgLower.includes('theme') || msgLower.includes('system') || msgLower.includes('node')) {
        aiText = "Our platform is fully optimized for modern cross-platform browser instances (including standard Ubuntu Linux setups). You can control dark and light modes through your Account Settings preference toggles, which instantly adjust our Tailwind v4 core layers.";
      } else if (msgLower.includes('hi') || msgLower.includes('hello') || msgLower.includes('hey') || msgLower.includes('support')) {
        aiText = "Hello! I am ready to process your questions. You can ask me details regarding: 'How do subscriptions work?', 'Why was my document rejected?', 'Where do I purchase extra credit tokens?', or how to verify an updated profile email address.";
      }

      setChatMessages((prev) => [...prev, { id: Date.now() + 1, text: aiText, sender: 'BOT' }]);
      setBotTyping(false);
    }, 800);
  };

  const faqData = [
    { q: "How are my extraction credits consumed?", a: "Each successful document processing or validation step consumes exactly one credit token from your balance pool." },
    { q: "What should I do if my file upload gets rejected?", a: "Navigate to your Document Details page, review the specific 'Remarks' feedback posted by administration staff, update your credential document, and hit re-upload." },
    { q: "Is my payment signature process secure?", a: "Yes, all transactions are securely encrypted and executed through the official Razorpay payment gateway API loop handlers." },
    { q: "How do I update my account email address?", a: "Go to your Profile tab section, update the email block, and input the 6-digit verification code token delivered straight to your new inbox destination." }
  ];

  const filteredFaqs = faqData.filter(item => 
    item.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 dark:bg-slate-900 dark:text-slate-100 font-sans antialiased transition-colors duration-200">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Page Head */}
        <div className="mb-10">
          <h1 className="text-3xl font-black tracking-tight uppercase">Help & Support</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Resolve system inquiries, open technical assistance pipelines, or chat with our automated AI assistant.</p>
        </div>

        {/* Global Messaging Notifications Alert banner */}
        {message.text && (
          <div className={`p-4 mb-8 rounded-xl border text-xs font-semibold shadow-sm flex items-center justify-center gap-2 ${
            message.isError 
              ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/40 dark:text-rose-400' 
              : 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400'
          }`}>
            <span>{message.isError ? '⚠️' : '✨'}</span>
            <span>{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT 7 PANELS: FAQ EXPLORER & TICKET SYSTEM */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* INTERACTIVE FAQ PANEL KNOWLEDGE BASE */}
            <div className="bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 shadow-sm rounded-2xl p-6 transition-colors duration-200">
              <div className="space-y-4 mb-6">
                <h3 className="font-black text-base uppercase tracking-tight">Frequently Asked Questions</h3>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span>
                  <input
                    type="text"
                    placeholder="Search standard help topics..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50/50 border border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition shadow-inner"
                  />
                </div>
              </div>

              <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
                {filteredFaqs.map((faq, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-700 rounded-xl space-y-1.5 transition-colors">
                    <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200">{faq.q}</h4>
                    <p className="text-xs text-gray-400 dark:text-slate-400 leading-relaxed font-medium">{faq.a}</p>
                  </div>
                ))}
                {filteredFaqs.length === 0 && (
                  <p className="text-center text-xs text-gray-400 py-6">No matching knowledge parameters located.</p>
                )}
              </div>
            </div>

            {/* LODGE SUPPORT TICKET CONSOLE */}
            <div className="bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 shadow-sm rounded-2xl p-6 transition-colors duration-200">
              <div className="mb-4">
                <h3 className="font-black text-base uppercase tracking-tight">Any Enquiry?</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Can't locate your answer or have an enquiry? Submit the form and our team will be answered shortly.</p>
              </div>

              <form onSubmit={handleTicketSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Topic</label>
                    <input
                      type="text"
                      name="subject"
                      value={ticketData.subject}
                      onChange={handleTicketChange}
                      placeholder="e.g., Ledger balance missing"
                      required
                      className="w-full bg-slate-50/50 border border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Category Classification</label>
                    <select
                      name="category"
                      value={ticketData.category}
                      onChange={handleTicketChange}
                      className="w-full bg-slate-50/50 border border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/20 text-slate-800 dark:text-slate-200 cursor-pointer h-10"
                    >
                      <option value="TECHNICAL">💻 Technical Glitch</option>
                      <option value="BILLING">💳 Payment & Billings</option>
                      <option value="ACCOUNT">👤 Account Access Profile</option>
                      <option value="OTHER">📁 Miscellaneous Concerns</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">Enquiry Description Message</label>
                  <textarea
                    name="messageText"
                    value={ticketData.messageText}
                    onChange={handleTicketChange}
                    rows="3"
                    placeholder="Provide step details regarding your workflow hurdle..."
                    required
                    className="w-full bg-slate-50/50 border border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition resize-none leading-relaxed text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold text-xs uppercase tracking-wider rounded-xl transition duration-150 disabled:opacity-40 cursor-pointer border-0 outline-none"
                  >
                    {loading ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </form>
            </div>

          </div>

          {/* RIGHT 5 PANELS: INTERACTIVE AI ASSISTANT PORTAL */}
          <div className="lg:col-span-5">
            <div className="bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 shadow-sm rounded-2xl overflow-hidden h-[545px] flex flex-col justify-between transition-colors duration-200">
              
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 bg-violet-500 rounded-full animate-pulse" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">AI Assistant Node</h3>
                </div>
                <span className="text-[10px] font-bold text-gray-400 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded border dark:border-slate-700 font-mono">v4-Live</span>
              </div>

              <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/20 dark:bg-slate-900/10 max-h-[410px]">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === 'USER' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed font-medium shadow-xs border ${
                      msg.sender === 'USER'
                        ? 'bg-violet-600 text-white border-transparent rounded-br-none'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none'
                    }`}>
                      {msg.sender === 'BOT' && <span className="block font-black text-[9px] uppercase tracking-wider text-violet-500 mb-0.5">DocVerify Bot</span>}
                      <p className={msg.sender === 'USER' ? 'font-semibold' : ''}>{msg.text}</p>
                    </div>
                  </div>
                ))}
                
                {botTyping && (
                  <div className="flex justify-start animate-pulse">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 rounded-bl-none">
                      <div className="flex items-center space-x-1.5 py-1">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center gap-2 transition-colors duration-200">
                <input
                  type="text"
                  placeholder="Ask any platform or verification doubt..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={botTyping}
                  className="flex-1 bg-slate-50/60 border border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 rounded-xl px-4 h-11 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition shadow-inner"
                />
                <button
                  type="submit"
                  disabled={botTyping || !chatInput.trim()}
                  className="h-11 px-4 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer disabled:opacity-40 flex items-center justify-center border-0 outline-none"
                >
                  Send
                </button>
              </form>

            </div>
          </div>

        </div>
      </main>
    </div>
  );
}