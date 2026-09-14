import React, { useState, useEffect } from 'react';
import { Send, X, Play, Settings, Search, MessageCircle } from 'lucide-react';
import api from '../../services/api';

// ===== FUNGSI AMBIL DATA USER =====
const getCurrentUser = () => {
  const user = localStorage.getItem('aksara_current_user');
  if (user) {
    try {
      return JSON.parse(user);
    } catch (e) {
      return null;
    }
  }
  return null;
};

const getUserName = () => {
  const user = getCurrentUser();
  if (user) {
    return user.nama_lengkap || user.name || 'Pengguna';
  }
  return 'Pengguna';
};

const getUserTenant = () => {
  const user = getCurrentUser();
  if (user) {
    return user.tenant || user.tenant_name || user.facility_name || 'Dinas Kominfo';
  }
  return 'Dinas Kominfo';
};

const getTenantCode = () => {
  const user = getCurrentUser();
  if (user) {
    return user.tenant_code || user.kode_dinas || user.tenant?.kode_dinas || 'dinkes';
  }
  return 'dinkes';
};

export default function PublicWidgetSimulation({ onLogout }) {
  // ===== STATE =====
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sessionCode, setSessionCode] = useState(null);
  const [tenantCode, setTenantCode] = useState('dinkes');
  const [tenantName, setTenantName] = useState('Dinas Kominfo');
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  
  const [chatHistory, setChatHistory] = useState([
    { sender: 'ai', text: 'Halo! Saya Asisten Aksara. Ada yang bisa saya bantu terkait layanan publik?' }
  ]);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const userName = getUserName();

  // ===== LOAD SUGGESTED QUESTIONS DARI KNOWLEDGE BASE =====
  const loadSuggestedQuestions = async () => {
    try {
      const user = getCurrentUser();
      if (!user || !user.tenant_id) {
        setSuggestedQuestions([
          "Profil Dinas Komunikasi dan Informatika",
          "Visi dan Misi",
          "Struktur Organisasi"
        ]);
        return;
      }
      
      const res = await api.get('/knowledge', {
        params: { tenant_id: user.tenant_id }
      });
      const data = res.data?.data || res.data || [];
      
      const questions = data.map(item => item.judul).slice(0, 5);
      if (questions.length > 0) {
        setSuggestedQuestions(questions);
      } else {
        setSuggestedQuestions([
          "Profil Dinas Komunikasi dan Informatika",
          "Visi dan Misi",
          "Struktur Organisasi"
        ]);
      }
    } catch (err) {
      console.error('Gagal load suggested questions:', err);
      setSuggestedQuestions([
        "Profil Dinas Komunikasi dan Informatika",
        "Visi dan Misi",
        "Struktur Organisasi"
      ]);
    }
  };

  // ===== LOAD TENANT INFO =====
  const loadTenantInfo = async () => {
    try {
      const code = getTenantCode();
      setTenantCode(code);
      
      const user = getCurrentUser();
      const tenant = user?.tenant || user?.tenant_name || 'Dinas Kominfo';
      setTenantName(tenant);
    } catch (err) {
      console.error('Gagal load tenant info:', err);
    }
  };

  // ===== CHECK AUTH =====
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      const user = getCurrentUser();
      if (token && user?.email) {
        setIsRegistered(true);
        setTenantCode(getTenantCode());
        setTenantName(getUserTenant());
        loadSuggestedQuestions();
      }
    };
    checkAuth();
    loadTenantInfo();
  }, []);

  // ===== SEND MESSAGE =====
  const handleSendMessage = async (textToSend) => {
    const msg = (textToSend || inputText).trim();
    if (!msg || isSending) return;

    const newUserMsg = { sender: 'user', text: msg };
    setChatHistory(prev => [...prev, newUserMsg]);
    setInputText('');
    setShowSuggestions(false);
    setIsSending(true);

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Token tidak ditemukan');
      }

      const res = await api.post('/chat/query', {
        tenant_code: tenantCode,
        user_name: userName,
        message: msg,
        session_code: sessionCode
      });

      const data = res.data;
      if (data.session_code) {
        setSessionCode(data.session_code);
      }

      const aiMsg = { sender: 'ai', text: data.answer || "Terima kasih atas pertanyaan Anda." };
      setChatHistory(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error("Gagal kirim pesan ke API AI:", err);
      let errorMsg = "Maaf, terjadi kendala saat menghubungkan ke server AI.";
      if (err.response?.status === 401) {
        errorMsg = "Sesi Anda telah berakhir. Silakan refresh halaman.";
      }
      setChatHistory(prev => [...prev, { sender: 'ai', text: errorMsg }]);
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickReply = (question) => {
    handleSendMessage(question);
  };

  // ===== LOGIN GOOGLE REAL =====
  const handleGoogleLogin = async () => {
    const popup = window.open(
      '/auth/google',
      'Google Login',
      'width=450,height=600,status=no,menubar=no,toolbar=no'
    );
    
    if (!popup) {
      window.location.href = '/auth/google';
    }
  };

  // ===== RENDER REGISTRATION FORM =====
  const renderRegistrationForm = () => (
    <div className="flex flex-col h-full p-6 justify-center bg-white">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-50 rounded-full mb-4">
          <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-800 mb-2">Selamat Datang, {userName}!</h3>
        <p className="text-sm text-gray-500">Silakan masuk menggunakan akun Google Anda untuk memulai percakapan.</p>
      </div>
      
      <button 
        onClick={handleGoogleLogin}
        type="button"
        className="flex w-full items-center justify-center gap-3 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Lanjutkan dengan Google
      </button>

      <p className="mt-6 text-center text-[11px] text-gray-400">
        Dengan melanjutkan, Anda menyetujui Syarat & Ketentuan layanan informasi.
      </p>
    </div>
  );

  // ===== WIDGET CONTENT =====
  const widgetContent = (
    <>
      <div className="bg-emerald-500 p-4 text-white flex justify-between items-center shadow-md z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-emerald-600 font-bold text-lg shadow-sm">
            A
          </div>
          <div>
            <h3 className="font-semibold text-lg leading-tight tracking-wide">Asisten Aksara</h3>
            <p className="text-emerald-100 text-xs">{tenantName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <button 
              onClick={() => window.open('/aksara-chat-fullscreen', '_blank')} 
              className="text-emerald-100 hover:text-white hover:bg-emerald-600 p-1.5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white"
              title="Buka di Tab Baru"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>

            <button 
              onClick={() => setIsExpanded(!isExpanded)} 
              className="text-emerald-100 hover:text-white hover:bg-emerald-600 p-1.5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white"
              title={isExpanded ? "Perkecil" : "Perbesar"}
            >
              {isExpanded ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h8V4M4 8l5-5m11 13h-8v4m8-4l-5 5" />
                </svg>
              )}
            </button>

            <button 
              onClick={() => setIsChatOpen(false)}
              className="text-emerald-100 hover:text-white hover:bg-emerald-600 p-1.5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
      </div>
      
      <div className="flex-1 overflow-y-auto bg-gray-50 pb-4">
        {!isRegistered ? (
          renderRegistrationForm()
        ) : (
          <div className="flex flex-col space-y-4 pt-4">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`px-4 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`${
                  msg.sender === 'user' 
                    ? 'bg-emerald-500 text-white rounded-2xl rounded-tr-sm' 
                    : 'bg-white border border-gray-200 text-gray-700 rounded-2xl rounded-tl-sm'
                  } p-3 shadow-sm text-sm max-w-[85%] leading-relaxed`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            
            {showSuggestions && suggestedQuestions.length > 0 && (
              <div 
                className={`flex gap-2 mt-2 px-4 animate-in fade-in slide-in-from-bottom-2 ${
                  isExpanded ? 'flex-row flex-wrap' : 'flex-col items-start'
                }`}
              >
                {suggestedQuestions.map((q, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickReply(q)}
                    className="text-left text-[13px] border border-emerald-500 text-emerald-700 bg-emerald-50 hover:bg-emerald-500 hover:text-white rounded-2xl px-4 py-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-sm"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {isRegistered && (
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
          className="p-3 bg-white border-t border-gray-200 flex items-center space-x-2"
        >
          <input 
            type="text" 
            placeholder="Ketik pesan..." 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isSending}
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 transition-shadow disabled:bg-gray-100"
          />
          <button 
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="bg-emerald-500 text-white p-2 rounded-full hover:bg-emerald-600 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}
    </>
  );

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col relative font-sans overflow-x-hidden">
      <div className="w-full bg-[#28a745] text-white text-xs py-2 px-6 flex justify-end items-center gap-6">
        <span>🕒 Senin - Sabtu 07.00 - 14.00</span>
        
        <button 
          onClick={onLogout} 
          className="bg-white/20 hover:bg-white/30 text-white font-medium px-3 py-1 rounded transition-colors flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Keluar Simulasi
        </button>

        <div className="flex items-center space-x-3">
          <a href="#" className="hover:text-gray-200">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" /></svg>
          </a>
          <a href="#" className="hover:text-gray-200">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" /></svg>
          </a>
          <a href="#" className="hover:text-gray-200">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
          </a>
          <a href="#" className="hover:text-gray-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
          </a>
        </div>
      </div>

      <nav className="w-full flex items-center justify-between px-8 py-4 bg-white shadow-sm border-b border-gray-100 z-50 relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center text-[10px] font-bold text-gray-500">
            LOGO
          </div>
          <span className="text-sm md:text-base font-bold text-[#28a745] leading-tight">
            {tenantName.toUpperCase()}
          </span>
        </div>
        
        <div className="hidden xl:flex items-center gap-6 lg:gap-8 text-[14px] font-medium text-gray-600">
          <a href="#" className="text-gray-800 font-semibold relative after:absolute after:-bottom-[24px] after:left-0 after:w-full after:h-[3px] after:bg-[#28a745]">Beranda</a>
          <a href="#" className="hover:text-[#28a745] transition-colors flex items-center gap-1">Profil <span>▾</span></a>
          <a href="#" className="hover:text-[#28a745] transition-colors flex items-center gap-1">Layanan <span>▾</span></a>
          <a href="#" className="hover:text-[#28a745] transition-colors">Berita</a>
          <a href="#" className="hover:text-[#28a745] transition-colors flex items-center gap-1">Standart Pelayanan <span>▾</span></a>
          <a href="#" className="hover:text-[#28a745] transition-colors">Inovasi</a>
          <a href="#" className="hover:text-[#28a745] transition-colors flex items-center gap-1">Publikasi Data <span>▾</span></a>
          <a href="#" className="hover:text-[#28a745] transition-colors flex items-center gap-1">Diklat <span>▾</span></a>
        </div>

        <div className="flex items-center gap-4">
          <button className="text-gray-500 hover:text-[#28a745] transition-colors focus:outline-none">
            <Search className="w-5 h-5" />
          </button>
          <button className="bg-[#28a745] hover:bg-green-600 text-white px-5 py-2 rounded-md font-medium text-sm transition-all shadow-sm">
            Pengaduan
          </button>
        </div>
      </nav>

      <main 
        className="flex-1 w-full min-h-[600px] bg-cover bg-center relative flex items-center justify-center"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=2053&auto=format&fit=crop')" }}
      >
        <div className="absolute inset-0 bg-black/30"></div>
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-6">
          <h2 className="text-5xl md:text-7xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] tracking-wider">
            {tenantName}
          </h2>
          <h3 className="text-3xl md:text-5xl font-extrabold text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
            Layanan Informasi Publik
          </h3>
          
          <div className="bg-emerald-600 border-2 border-emerald-700 text-white font-bold text-xl px-10 py-2 transform -skew-x-12 mt-6 shadow-xl">
            <span className="block transform skew-x-12 tracking-wide">ONE STOP SERVICE</span>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 mt-10">
            <button className="w-14 h-14 bg-white text-emerald-600 rounded-full flex items-center justify-center hover:bg-gray-100 shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-transform hover:scale-105 group">
              <Play className="w-6 h-6 ml-1 group-hover:text-emerald-700" fill="currentColor" />
            </button>
            <button className="flex items-center space-x-2 bg-[#2c234d] hover:bg-[#1a1433] text-white px-8 py-4 rounded shadow-lg transition-all hover:-translate-y-0.5">
              <Settings className="w-5 h-5" />
              <span className="font-semibold text-lg">Profil Kami</span>
            </button>
          </div>
        </div>
      </main>

      <div className="fixed bottom-6 right-6 z-[999] flex flex-col items-end">
        {isChatOpen && (
          <div className={`fixed bottom-24 right-6 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-[999] border border-gray-100 transform transition-all duration-300 ease-in-out origin-bottom-right max-h-[calc(100vh-140px)] ${
            isExpanded ? 'h-[calc(100vh-140px)] w-[50vw]' : 'h-[600px] w-[360px]'
          }`}>
            {widgetContent}
          </div>
        )}

        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-14 h-14 bg-emerald-500 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-emerald-600 hover:scale-105 transition-all focus:outline-none focus:ring-4 focus:ring-emerald-500/30"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}