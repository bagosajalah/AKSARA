import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, Plus, User, LogOut, Settings, Check, Sun, Moon, X, Trash2, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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

const getUserInitials = () => {
  const name = getUserName();
  if (name && name !== 'Pengguna') {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  return 'TM';
};

const getUserEmail = () => {
  const user = getCurrentUser();
  if (user) {
    return user.email || `${user.nama_lengkap?.toLowerCase().replace(/\s/g, '.')}@ponorogo.go.id` || 'user@ponorogo.go.id';
  }
  return 'user@ponorogo.go.id';
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

const getSavedAccounts = () => {
  const accounts = localStorage.getItem('aksara_saved_accounts');
  if (accounts) {
    try {
      return JSON.parse(accounts);
    } catch (e) {
      return [];
    }
  }
  return [];
};

const saveAccount = (userData) => {
  const accounts = JSON.parse(localStorage.getItem('aksara_saved_accounts') || '[]');
  const existing = accounts.find(a => a.email === userData.email);
  if (!existing) {
    accounts.push({
      name: userData.nama_lengkap || userData.name || 'Pengguna',
      email: userData.email,
      lastLogin: new Date().toISOString()
    });
    localStorage.setItem('aksara_saved_accounts', JSON.stringify(accounts));
  }
};

const groupSessions = (sessions) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const groups = {
    'Hari ini': [],
    'Kemarin': [],
    '7 hari terakhir': [],
    'Lainnya': []
  };
  
  sessions.forEach(session => {
    if (!session.created_at) {
      groups['Lainnya'].push(session);
      return;
    }
    
    const date = new Date(session.created_at);
    date.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      groups['Hari ini'].push(session);
    } else if (diffDays === 1) {
      groups['Kemarin'].push(session);
    } else if (diffDays <= 7) {
      groups['7 hari terakhir'].push(session);
    } else {
      groups['Lainnya'].push(session);
    }
  });
  
  return groups;
};

export default function StandaloneChat() {
  // ===== STATE =====
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('aksara_chat_theme');
    return saved ? saved === 'dark' : false;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sessionCode, setSessionCode] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [chatSessions, setChatSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googlePassword, setGooglePassword] = useState('');
  const [googleError, setGoogleError] = useState('');
  const [searchHistory, setSearchHistory] = useState('');
  const [tenantCode, setTenantCode] = useState('dinkes');
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [currentProvider, setCurrentProvider] = useState('Google Gemini');
  
  // ===== REF =====
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // ===== DATA USER =====
  const userName = getUserName();
  const userInitials = getUserInitials();
  const userEmail = getUserEmail();
  const userTenant = getUserTenant();
  const savedAccounts = getSavedAccounts();
  const currentUser = getCurrentUser();

  // ===== THEME TOGGLE =====
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    localStorage.setItem('aksara_chat_theme', !isDarkMode ? 'dark' : 'light');
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // ===== LOAD PROVIDER DARI TENANT =====
  const loadProvider = async () => {
    try {
      const user = getCurrentUser();
      if (!user?.tenant_id) return;
      
      const res = await api.get(`/tenants/${user.tenant_id}/widget-config`);
      const data = res.data?.data || res.data || {};
      const provider = data.llm_provider || 'google_gemini';
      
      const providerNames = {
        'google_gemini': 'Google Gemini',
        'openai': 'OpenAI',
        'anthropic_claude': 'Anthropic Claude'
      };
      setCurrentProvider(providerNames[provider] || 'Google Gemini');
    } catch (err) {
      console.error('Gagal load provider:', err);
    }
  };

  // ===== LOAD SUGGESTED QUESTIONS DARI KNOWLEDGE BASE =====
  const loadSuggestedQuestions = async () => {
    try {
      const user = getCurrentUser();
      // Cek apakah user dan tenant_id ada
      if (!user || !user.tenant_id) {
        setSuggestedQuestions([
          "Profil Dinas Komunikasi dan Informatika",
          "Visi dan Misi Diskominfo",
          "Struktur Organisasi Diskominfo"
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
          "Visi dan Misi Diskominfo",
          "Struktur Organisasi Diskominfo"
        ]);
      }
    } catch (err) {
      console.error('Gagal load suggested questions:', err);
      setSuggestedQuestions([
        "Profil Dinas Komunikasi dan Informatika",
        "Visi dan Misi Diskominfo",
        "Struktur Organisasi Diskominfo"
      ]);
    }
  };

  // ===== SCROLL KE BAWAH =====
  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  // ===== LOAD SESSIONS =====
  const loadChatSessions = async () => {
    try {
      setIsLoadingSessions(true);
      const token = localStorage.getItem('access_token');
      if (!token) {
        setIsLoadingSessions(false);
        return;
      }
      
      const res = await api.get('/chat/sessions', {
        params: { skip: 0, limit: 50 }
      });
      const data = res.data?.data || res.data || [];
      setChatSessions(data);
    } catch (err) {
      console.error('Gagal load sessions:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  // ===== SEND MESSAGE =====
  const sendMessage = async (text) => {
    const msg = (text || inputText).trim();
    if (!msg || isSending) return;

    const userMsg = { sender: 'user', text: msg };
    setChatHistory(prev => [...prev, userMsg]);
    setInputText('');
    setShowSuggestions(false);
    setIsSending(true);

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Token tidak ditemukan. Silakan login ulang.');
      }

      const res = await api.post('/chat/query', {
        tenant_code: tenantCode,
        user_name: userName || 'Pengguna',
        message: msg,
        session_code: sessionCode
      });

      const data = res.data;
      
      if (data.session_code) {
        setSessionCode(data.session_code);
      }

      const aiMsg = { 
        sender: 'ai', 
        text: data.answer || "Maaf, saya tidak bisa menjawab pertanyaan itu."
      };
      
      setChatHistory(prev => [...prev, aiMsg]);
      loadChatSessions();

    } catch (err) {
      console.error('Error send message:', err);
      
      let errorMessage = 'Terjadi kesalahan. Silakan coba lagi nanti.';
      if (err.response?.status === 401) {
        errorMessage = 'Sesi Anda telah berakhir. Silakan refresh halaman.';
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }
      
      setChatHistory(prev => [...prev, { 
        sender: 'ai', 
        text: errorMessage
      }]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleQuickReply = (question) => {
    sendMessage(question);
  };

  const loadSessionChat = async (sessionId) => {
    try {
      const res = await api.get(`/chat/sessions/${sessionId}/messages`);
      const messages = res.data || [];
      
      const formatted = messages.map(msg => ({
        sender: msg.sender,
        text: msg.text
      }));
      
      setChatHistory(formatted);
      setShowSuggestions(false);
      
      // Cari session code dari sessions list
      const session = chatSessions.find(s => s.id === sessionId);
      if (session) {
        setSessionCode(session.session_code);
      }
      
    } catch (err) {
      console.error('Gagal load session messages:', err);
    }
  };

  const handleNewChat = () => {
    setChatHistory([]);
    setSessionCode(null);
    setShowSuggestions(true);
    setChatHistory([
      { sender: 'ai', text: 'Halo! Saya Asisten Aksara. Ada yang bisa saya bantu?' }
    ]);
  };

  // ===== CLEAR ALL CHAT HISTORY =====
  const clearChatHistory = async () => {
    try {
      const res = await api.delete('/chat/sessions/clear');
      console.log('Clear chat response:', res.data);
      
      setChatHistory([]);
      setShowClearConfirm(false);
      setShowSettings(false);
      setChatSessions([]);
      setChatHistory([
        { sender: 'ai', text: 'Riwayat chat berhasil dihapus! Ada yang bisa saya bantu?' }
      ]);
      alert(`Berhasil menghapus ${res.data?.deleted_count || 0} sesi chat`);
    } catch (err) {
      console.error('Gagal hapus riwayat:', err);
      alert(err.response?.data?.detail || 'Gagal menghapus riwayat chat');
    }
  };

  // ===== LOGIN DENGAN AKUN TERSIMPAN =====
  const loginWithAccount = (account) => {
    const userData = {
      nama_lengkap: account.name,
      email: account.email,
      name: account.name
    };
    localStorage.setItem('aksara_current_user', JSON.stringify(userData));
    localStorage.setItem('isAuthenticated', 'true');
    setIsRegistered(true);
    const code = getTenantCode();
    setTenantCode(code);
    loadSuggestedQuestions();
    loadProvider();
    setChatHistory([
      { sender: 'ai', text: `Halo ${account.name}! Saya Asisten Aksara. Ada yang bisa saya bantu?` }
    ]);
    loadChatSessions();
  };

  // ===== LOGIN GOOGLE REAL =====
  const handleGoogleLogin = async (e) => {
    e.preventDefault();
    setGoogleError("");

    try {
      const response = await api.post("/auth/login", {
        email: googleEmail,
        password: googlePassword,
      });

      const data = response.data;
      
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      localStorage.setItem("isAuthenticated", "true");

      if (data.user) {
        const userData = {
          ...data.user,
          tenant: data.user.tenant_name || data.user.tenant || null,
          tenant_id: data.user.tenant_id || null,
          tenant_code: data.user.tenant?.kode_dinas || null,
        };
        localStorage.setItem("aksara_current_user", JSON.stringify(userData));
        saveAccount(userData);
        setShowLoginForm(false);
        setGoogleEmail('');
        setGooglePassword('');
        setIsRegistered(true);
        const code = userData.tenant_code || 'dinkes';
        setTenantCode(code);
        loadSuggestedQuestions();
        loadProvider();
        setChatHistory([
          { sender: 'ai', text: `Halo ${userData.nama_lengkap || userData.name || 'Pengguna'}! Saya Asisten Aksara. Ada yang bisa saya bantu?` }
        ]);
        loadChatSessions();
      }

    } catch (error) {
      console.error("Login gagal:", error);
      if (error.response) {
        setGoogleError(error.response.data?.detail || "Login gagal");
      } else {
        setGoogleError("Backend tidak dapat dihubungi.");
      }
    }
  };

  // ===== LOGOUT =====
  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('aksara_current_user');
    setIsRegistered(false);
    setChatHistory([]);
    setShowSettings(false);
    setTenantCode('dinkes');
    setSuggestedQuestions([]);
    setCurrentProvider('Google Gemini');
  };

  // ===== CHECK AUTH STATUS =====
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      const user = getCurrentUser();
      if (token && user?.email) {
        setIsRegistered(true);
        const code = getTenantCode();
        setTenantCode(code);
        loadChatSessions();
        loadSuggestedQuestions();
        loadProvider();
        setChatHistory([
          { sender: 'ai', text: `Halo ${userName}! Saya Asisten Aksara. Ada yang bisa saya bantu?` }
        ]);
      }
    };
    checkAuth();
  }, []);

  // HEARTBEAT
  useEffect(() => {
    if (!sessionCode) return;
    
    const interval = setInterval(() => {
      api.post('/chat/heartbeat', { session_code: sessionCode })
        .catch(() => console.log('Heartbeat failed'));
    }, 10000);
    
    return () => clearInterval(interval);
  }, [sessionCode]);

  // ===== FILTER SESSIONS =====
  const filteredSessions = chatSessions.filter(session => 
    session.topic?.toLowerCase().includes(searchHistory.toLowerCase()) ||
    session.session_code?.toLowerCase().includes(searchHistory.toLowerCase())
  );

  const groupedSessions = groupSessions(filteredSessions);

  // ===== RENDER REGISTRATION FORM =====
  const renderRegistrationForm = () => {
    const currentUser = getCurrentUser();
    const savedAccounts = getSavedAccounts();

    return (
      <div className="flex flex-col h-full p-8 justify-center bg-white dark:bg-[#1A1C20] max-w-md mx-auto w-full transition-colors">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-lg">
            A
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2 transition-colors">
            {currentUser?.email ? `Selamat Datang Kembali!` : 'Selamat Datang di Asisten Aksara!'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">
            {savedAccounts.length > 0 ? 'Pilih akun untuk melanjutkan percakapan.' : 'Silakan masuk untuk memulai percakapan.'}
          </p>
        </div>
        
        <div className="space-y-3">
          {savedAccounts.length > 0 ? (
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden transition-colors">
              {savedAccounts.map((account, index) => (
                <div 
                  key={index}
                  onClick={() => loginWithAccount(account)}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {account.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 dark:text-gray-200 truncate transition-colors">{account.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate transition-colors">{account.email}</p>
                  </div>
                  {account.email === currentUser?.email && (
                    <div className="text-emerald-500 flex-shrink-0">
                      <Check className="w-5 h-5" />
                    </div>
                  )}
                </div>
              ))}
              
              <button
                onClick={() => setShowLoginForm(!showLoginForm)}
                className="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 py-3 transition-colors border-t border-gray-100 dark:border-gray-800 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Tambah akun lain
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowLoginForm(true)}
              type="button"
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A1C20] px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm transition-all hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Lanjutkan dengan Google
            </button>
          )}

          {showLoginForm && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3 bg-gray-50 dark:bg-gray-900/50 transition-colors">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">Masuk dengan akun baru</p>
              <input 
                type="email" 
                placeholder="Email"
                value={googleEmail}
                onChange={(e) => setGoogleEmail(e.target.value)}
                className="w-full bg-white dark:bg-[#1A1C20] border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
              />
              <input 
                type="password" 
                placeholder="Password"
                value={googlePassword}
                onChange={(e) => setGooglePassword(e.target.value)}
                className="w-full bg-white dark:bg-[#1A1C20] border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
              />
              {googleError && <p className="text-red-500 text-xs">{googleError}</p>}
              <button
                onClick={handleGoogleLogin}
                className="w-full bg-emerald-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors"
              >
                Masuk
              </button>
              <button
                onClick={() => {
                  setShowLoginForm(false);
                  setGoogleEmail('');
                  setGooglePassword('');
                  setGoogleError('');
                }}
                className="w-full text-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Batal
              </button>
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white dark:bg-[#1A1C20] px-2 text-gray-400 dark:text-gray-500 transition-colors">atau</span>
            </div>
          </div>

          <button 
            onClick={() => {
              setIsRegistered(true);
              setTenantCode('dinkes');
              loadSuggestedQuestions();
              loadProvider();
              setChatHistory([
                { sender: 'ai', text: `Halo! Saya Asisten Aksara. Ada yang bisa saya bantu?` }
              ]);
              loadChatSessions();
            }}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-400 shadow-sm transition-all hover:bg-emerald-100 dark:hover:bg-emerald-500/20 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <MessageSquare className="w-5 h-5" />
            Demo Mode (Tanpa Login)
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500 transition-colors">
          Dengan melanjutkan, Anda menyetujui Syarat & Ketentuan layanan.
        </p>
      </div>
    );
  };

  // ===== RENDER CHAT MESSAGES =====
  const renderMessages = () => (
    <div className="flex flex-col space-y-4 w-full max-w-3xl mx-auto">
      {chatHistory.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-lg">
            A
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white transition-colors">Bagaimana saya bisa membantu Anda?</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2 transition-colors">Mulai percakapan dengan mengetik pertanyaan di bawah.</p>
        </div>
      )}
      
      {chatHistory.map((msg, idx) => (
        <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`flex gap-4 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
              msg.sender === 'user' 
                ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400' 
                : 'bg-emerald-500 text-white'
            }`}>
              {msg.sender === 'user' ? userInitials : 'A'}
            </div>
            <div className={`${
              msg.sender === 'user' 
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200' 
                : 'bg-white dark:bg-[#1A1C20] border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200'
              } px-5 py-3 rounded-2xl shadow-sm text-[15px] leading-relaxed transition-colors`}
            >
              {msg.sender === 'user' ? (
                // User message: plain text
                <p className="whitespace-pre-wrap">{msg.text}</p>
              ) : (
                // AI message: render markdown
                <div className="prose prose-sm dark:prose-invert max-w-none
                  prose-p:my-1.5 prose-p:leading-relaxed
                  prose-ul:my-1.5 prose-ul:pl-4
                  prose-ol:my-1.5 prose-ol:pl-4
                  prose-li:my-0.5
                  prose-strong:font-semibold prose-strong:text-emerald-600 dark:prose-strong:text-emerald-400
                  prose-headings:my-2 prose-headings:font-semibold
                  prose-code:bg-gray-200 dark:prose-code:bg-gray-700 prose-code:px-1 prose-code:rounded prose-code:text-xs
                  prose-a:text-emerald-600 dark:prose-a:text-emerald-400 prose-a:underline
                ">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => <p className="my-1.5">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc pl-4 my-1.5 space-y-0.5">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-4 my-1.5 space-y-0.5">{children}</ol>,
                      li: ({ children }) => <li className="my-0.5">{children}</li>,
                      strong: ({ children }) => (
                        <strong className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {children}
                        </strong>
                      ),
                      em: ({ children }) => <em className="italic">{children}</em>,
                      code: ({ inline, children }) => 
                        inline ? (
                          <code className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs font-mono">
                            {children}
                          </code>
                        ) : (
                          <pre className="bg-gray-200 dark:bg-gray-700 p-2 rounded text-xs overflow-x-auto my-2">
                            <code>{children}</code>
                          </pre>
                        ),
                      a: ({ href, children }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 dark:text-emerald-400 underline hover:text-emerald-700"
                        >
                          {children}
                        </a>
                      ),
                      h1: ({ children }) => <h1 className="text-base font-bold my-2">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-sm font-bold my-2">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-sm font-semibold my-2">{children}</h3>,
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      
      {isSending && (
        <div className="flex justify-start">
          <div className="flex gap-4 max-w-[85%]">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-sm text-white">
              A
            </div>
            <div className="bg-white dark:bg-[#1A1C20] border border-gray-200 dark:border-gray-700 px-5 py-3 rounded-2xl shadow-sm transition-colors">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {showSuggestions && chatHistory.length <= 2 && suggestedQuestions.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-4 ml-12 animate-in fade-in slide-in-from-bottom-2">
          {suggestedQuestions.map((q, index) => (
            <button
              key={index}
              onClick={() => handleQuickReply(q)}
              className="text-left text-sm border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1A1C20] hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-emerald-500 dark:hover:border-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-400 rounded-xl px-4 py-2.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm"
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // ===== RENDER =====
  return (
    <div className={`flex h-screen w-screen overflow-hidden ${isDarkMode ? 'dark' : ''}`}>
      <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-[#0D0F12] font-sans transition-colors">
        
        {/* ===== SIDEBAR KIRI ===== */}
        <div className={`flex flex-col border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1A1C20] flex-shrink-0 transition-all duration-300 overflow-hidden ${
          isSidebarOpen ? 'w-[280px]' : 'w-0'
        }`}>
          <div className="p-4 min-w-[280px]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 font-bold text-white shadow-sm">A</div>
                <span className="font-bold text-gray-800 dark:text-white text-lg transition-colors">Asisten Aksara</span>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
                title="Tutup Sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
            <button 
              onClick={handleNewChat}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A1C20] py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Obrolan Baru
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 min-w-[280px]">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 transition-colors">
              Riwayat Percakapan
            </h3>
            
            {/* ===== SEARCH ===== */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari percakapan..."
                value={searchHistory}
                onChange={(e) => setSearchHistory(e.target.value)}
                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-gray-700 dark:text-gray-300"
              />
            </div>

            {isLoadingSessions ? (
              <div className="text-center text-sm text-gray-400 dark:text-gray-500 py-4">Memuat...</div>
            ) : filteredSessions.length === 0 ? (
              <div className="text-center text-sm text-gray-400 dark:text-gray-500 py-4">
                {searchHistory ? 'Tidak ada hasil' : 'Belum ada percakapan'}
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {Object.entries(groupedSessions).map(([groupName, sessions]) => (
                  sessions.length > 0 && (
                    <div key={groupName}>
                      <div className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-3 mb-1.5">
                        {groupName}
                      </div>
                      {sessions.map((session) => (
                        <div 
                          key={session.id} 
                          className="flex items-center justify-between group hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-lg transition-colors px-2 py-1.5"
                        >
                          <button
                            onClick={() => loadSessionChat(session.id)}
                            className="flex-1 text-left truncate"
                          >
                            <span className="text-gray-700 dark:text-gray-300 text-sm font-medium">
                              {session.topic || 'Percakapan'}
                            </span>
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm(`Hapus sesi "${session.topic || 'Percakapan'}"?`)) {
                                try {
                                  await api.delete(`/chat/sessions/${session.id}`);
                                  setChatSessions(prev => prev.filter(s => s.id !== session.id));
                                  if (sessionCode === session.session_code) {
                                    setChatHistory([]);
                                    setSessionCode(null);
                                    setShowSuggestions(true);
                                    setChatHistory([
                                      { sender: 'ai', text: 'Halo! Saya Asisten Aksara. Ada yang bisa saya bantu?' }
                                    ]);
                                  }
                                } catch (err) {
                                  console.error('Gagal hapus sesi:', err);
                                  alert(err.response?.data?.detail || 'Gagal menghapus sesi');
                                }
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-all duration-200 p-1 rounded"
                            title="Hapus sesi ini"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                ))}
              </div>
            )}
          </div>

          {/* ===== USER PROFILE ===== */}
          <div className="mt-auto border-t border-gray-200 dark:border-gray-800 p-4 bg-white/50 dark:bg-gray-900/30 transition-colors min-w-[280px]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-500/20 font-bold text-blue-700 dark:text-blue-400 text-sm transition-colors">
                {isRegistered ? userInitials : 'TM'}
              </div>
              <div className="flex flex-col flex-1 truncate">
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate transition-colors">
                  {isRegistered ? userName : 'Tamu'}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate transition-colors">
                  {isRegistered ? userTenant : 'Tamu'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ===== MAIN CHAT AREA ===== */}
        <div className="flex-1 flex flex-col bg-white dark:bg-[#1A1C20] min-w-0 transition-colors">
          
          {/* ===== CHAT HEADER ===== */}
          <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-3 flex items-center justify-between bg-white dark:bg-[#1A1C20] flex-shrink-0 transition-colors">
            <div className="flex items-center gap-2">
              {!isSidebarOpen && (
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
                  title="Buka Sidebar"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
              {!isSidebarOpen && (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-xs">A</div>
                  <span className="font-semibold text-gray-800 dark:text-white text-sm">Asisten Aksara</span>
                </div>
              )}
            </div>
            <button 
              onClick={() => setShowSettings(true)}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          {/* ===== CHAT BODY ===== */}
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto px-6 lg:px-24 xl:px-48 py-8 bg-gray-50 dark:bg-gray-900/20 transition-colors"
          >
            {!isRegistered ? (
              renderRegistrationForm()
            ) : (
              renderMessages()
            )}
          </div>

          {/* ===== CHAT INPUT ===== */}
          {isRegistered && (
            <div className="p-4 bg-white dark:bg-[#1A1C20] border-t border-gray-100 dark:border-gray-800 flex-shrink-0 transition-colors">
              <div className="max-w-3xl mx-auto relative flex items-center">
                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Kirim pesan ke Asisten Aksara..." 
                  className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-2xl pl-6 pr-14 py-4 text-[15px] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-shadow text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 shadow-inner"
                  disabled={isSending}
                />
                <button 
                  onClick={() => sendMessage()}
                  disabled={!inputText.trim() || isSending}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-500 text-white p-2.5 rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2 transition-colors">
                Asisten Aksara dapat membuat kesalahan. Harap periksa informasi penting dengan pihak terkait.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ===== SETTINGS MODAL ===== */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#1A1C20] rounded-2xl p-6 w-80 shadow-2xl border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-800 dark:text-white">Pengaturan</h3>
              <button 
                onClick={() => {
                  setShowSettings(false);
                  setShowClearConfirm(false);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-2">
              <button 
                onClick={toggleTheme}
                className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">Mode Tampilan</span>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {isDarkMode ? 'Dark' : 'Light'}
                </span>
              </button>
              
              {!showClearConfirm ? (
                <button 
                  onClick={() => setShowClearConfirm(true)}
                  className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300">Hapus Riwayat Chat</span>
                  <Trash2 className="w-4 h-4 text-gray-400" />
                </button>
              ) : (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                  <p className="text-sm text-red-600 dark:text-red-400 mb-2">Yakin hapus semua riwayat?</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={clearChatHistory}
                      className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                    >
                      Ya, Hapus
                    </button>
                    <button 
                      onClick={() => setShowClearConfirm(false)}
                      className="flex-1 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
              
              <div className="border-t border-gray-200 dark:border-gray-700"></div>
              
              <button 
                onClick={handleLogout}
                className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              >
                <span className="text-sm text-red-600 dark:text-red-400 font-medium">Logout</span>
                <LogOut className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}