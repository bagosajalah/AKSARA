import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Bot, User, Minimize2, Maximize2, 
  Sparkles, Clock, MessageCircle, Zap, X
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../services/api';
import { chatService } from '../services/chat.service';

export default function ChatbotWidget({ tenantCode = 'kominfo' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      sender: 'ai', 
      text: 'Halo! 👋 Ada yang bisa saya bantu terkait layanan di Dinas Kominfo?',
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionCode, setSessionCode] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [provider, setProvider] = useState('Google Gemini');
  const [streamingText, setStreamingText] = useState('');
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  // ===== AMBIL PROVIDER DARI ENV =====
  useEffect(() => {
    const providerName = import.meta.env.VITE_LLM_PROVIDER || 'Google Gemini';
    setProvider(providerName);
  }, []);

  // ===== HEARTBEAT =====
  useEffect(() => {
    if (!sessionCode) return;

    const interval = setInterval(() => {
      api.post('/chat/heartbeat', { session_code: sessionCode })
        .catch(() => console.log('Heartbeat failed'));
    }, 10000);

    return () => clearInterval(interval);
  }, [sessionCode]);

  // ===== SEND MESSAGE =====
  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    
    setInput('');
    setMessages(prev => [...prev, { sender: 'user', text: userMessage, time }]);
    setLoading(true);

    try {
      let activeUserName = 'Masyarakat Umum';
      try {
        const userStr = localStorage.getItem('aksara_current_user');
        if (userStr) {
          const u = JSON.parse(userStr);
          if (u.nama_lengkap || u.name) activeUserName = u.nama_lengkap || u.name;
        }
      } catch (e) {}

      const payload = {
        tenant_code: tenantCode,
        user_name: activeUserName,
        message: userMessage,
        session_code: sessionCode
      };

      console.log('📤 Sending message:', payload);

      const res = await chatService.publicQuery(payload);
      console.log('📥 Response:', res);

      const data = res.data?.data || res.data || {};
      const ansText = data.answer || 'Maaf, tidak ada respon.';

      if (data.session_code) setSessionCode(data.session_code);
      
      setMessages(prev => [...prev, { 
        sender: 'ai', 
        text: ansText,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      }]);
      
    } catch (error) {
      console.error('❌ Error chat:', error);
      
      let errorMsg = 'Terjadi kesalahan. Silakan coba lagi nanti.';
      if (error.response?.status === 401) {
        errorMsg = 'Sesi Anda telah berakhir. Silakan refresh halaman.';
      } else if (error.response?.data?.detail) {
        errorMsg = error.response.data.detail;
      }
      
      setMessages(prev => [...prev, { 
        sender: 'ai', 
        text: errorMsg,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ===== RENDER =====
  return (
    <div className="fixed bottom-6 right-6 z-[999] flex flex-col items-end">
      
      {/* ===== CHAT WINDOW ===== */}
      {isOpen && (
        <div className={`bg-white dark:bg-[#1A1C20] rounded-2xl border border-gray-200 dark:border-gray-800/50 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ease-in-out origin-bottom-right mb-4 ${
          isExpanded ? 'h-[600px] w-[420px]' : 'h-[480px] w-[380px]'
        }`}>
          
          {/* ===== HEADER ===== */}
          <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-teal-700 to-teal-500 dark:from-teal-800 dark:to-teal-600 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center shadow-lg">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-300 border-2 border-teal-600 rounded-full animate-pulse"></span>
              </div>
              <div>
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  Asisten AI Kominfo
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-pulse"></span>
                  <span className="text-[10px] text-white/90">Online • Siap membantu</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ===== CHAT AREA ===== */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/80 dark:bg-[#0D0F12]">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${
                  msg.sender === 'user' 
                    ? 'bg-gradient-to-br from-teal-500 to-teal-600' 
                    : 'bg-white dark:bg-[#2A2D31] border border-gray-200 dark:border-gray-700'
                }`}>
                  {msg.sender === 'user' ? (
                    <User className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Bot className="w-3.5 h-3.5 text-teal-600 dark:text-teal-500" />
                  )}
                </div>
                
                {/* Bubble */}
                <div className={`max-w-[80%] ${msg.sender === 'user' ? 'order-first' : ''}`}>
                  <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                    msg.sender === 'user' 
                      ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-br-sm' 
                      : 'bg-white dark:bg-[#1C1E22] border border-gray-200 dark:border-gray-800/50 text-gray-800 dark:text-gray-300 rounded-bl-sm shadow-md'
                  }`}>
                    {msg.sender === 'user' ? (
                      // User message: plain text
                      <p className="whitespace-pre-wrap">{msg.text || (streamingText && idx === messages.length - 1 ? streamingText : '')}</p>
                    ) : (
                      // AI message: render markdown
                      <div className="prose prose-sm dark:prose-invert max-w-none
                        prose-p:my-1 prose-p:leading-relaxed
                        prose-ul:my-1 prose-ul:pl-4
                        prose-ol:my-1 prose-ol:pl-4
                        prose-li:my-0.5
                        prose-strong:font-semibold prose-strong:text-teal-600 dark:prose-strong:text-teal-400
                        prose-headings:my-2 prose-headings:font-semibold
                        prose-code:bg-gray-200 dark:prose-code:bg-gray-700 prose-code:px-1 prose-code:rounded prose-code:text-xs
                      ">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => <p className="my-1">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc pl-4 my-1 space-y-0.5">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-4 my-1 space-y-0.5">{children}</ol>,
                            li: ({ children }) => <li className="my-0.5">{children}</li>,
                            strong: ({ children }) => (
                              <strong className="font-semibold text-teal-600 dark:text-teal-400">
                                {children}
                              </strong>
                            ),
                            em: ({ children }) => <em className="italic">{children}</em>,
                            code: ({ inline, children }) => 
                              inline ? (
                                <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-xs font-mono">
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
                                className="text-teal-600 dark:text-teal-400 underline"
                              >
                                {children}
                              </a>
                            ),
                            h1: ({ children }) => <h1 className="text-base font-bold my-2">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-sm font-bold my-2">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-sm font-semibold my-2">{children}</h3>,
                          }}
                        >
                          {msg.text || (streamingText && idx === messages.length - 1 ? streamingText : '')}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                  <div className={`text-[10px] text-gray-400 mt-1 flex items-center gap-1 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <Clock className="w-3 h-3" />
                    {msg.time || 'Baru saja'}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-end gap-2">
                <div className="w-7 h-7 rounded-full bg-white dark:bg-[#2A2D31] border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0 shadow-md">
                  <Bot className="w-3.5 h-3.5 text-teal-600 dark:text-teal-500" />
                </div>
                <div className="px-4 py-3 rounded-2xl bg-white dark:bg-[#1C1E22] border border-gray-200 dark:border-gray-800/50 shadow-md rounded-bl-sm">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ===== INPUT ===== */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-800/50 bg-white dark:bg-[#1A1C20] flex-shrink-0">
            <div className="flex gap-2 bg-gray-100 dark:bg-[#0D0F12] rounded-2xl p-1.5 border border-gray-200 dark:border-gray-800/50 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20 transition-all">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Tanya sesuatu..."
                className="flex-1 px-4 py-2 bg-transparent text-sm text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className={`px-5 py-2 rounded-xl transition-all flex items-center gap-2 font-medium ${
                  loading || !input.trim()
                    ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all'
                }`}
              >
                <Send className="w-4 h-4" />
                {loading ? 'Mengirim...' : 'Kirim'}
              </button>
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-center gap-2 text-[10px] text-gray-400 mt-2">
              <Sparkles className="w-3 h-3 text-teal-500" />
              <span>Didukung oleh</span>
              <span className="font-medium text-teal-600 dark:text-teal-400">{provider}</span>
              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
              <span className="text-gray-400">RAG Engine</span>
              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
              <span className="font-medium text-teal-600 dark:text-teal-400">AKSARA</span>
            </div>
          </div>
        </div>
      )}

      {/* ===== CHAT BUBBLE ===== */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:from-teal-600 hover:to-teal-700 hover:scale-105 transition-all focus:outline-none focus:ring-4 focus:ring-teal-500/30"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
      </button>
    </div>
  );
}