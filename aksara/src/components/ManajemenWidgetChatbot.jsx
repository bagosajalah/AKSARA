import React, { useState, useEffect } from 'react';
import { 
  Key, RefreshCw, Copy, Check, Plus, X, UploadCloud, 
  Save, CheckCircle, MessageSquare, Palette, Globe, Code, 
  Settings, Bot, TriangleAlert, LogOut, AlertTriangle, ChevronDown, 
  Sliders, Play, FileText, ChevronRight, Eye, EyeOff
} from 'lucide-react';
import { tenantService } from '../services/tenant.service';
import { widgetService } from '../services/widget.service';

export default function ManajemenWidgetChatbot({ onExitImpersonate }) {
  const [tenants, setTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  
  const [config, setConfig] = useState({
    widgetKey: '',
    whitelistDomains: [],
    primaryColor: '#10B981',
    chatbotName: '',
    chatbotDescription: '',
    greetingMessage: '',
    systemPrompt: '',
    llmProvider: 'google_gemini',
    apiKey: ''
  });

  const [loading, setLoading] = useState(true);
  const [newDomain, setNewDomain] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null); 
  const [selectedFacility, setSelectedFacility] = useState('');
  const [activeTenantCode, setActiveTenantCode] = useState('');
  
  // ===== STATE UNTUK TOGGLE API KEY =====
  const [showApiKey, setShowApiKey] = useState(false);

  const loadTenants = async () => {
    try {
      const res = await tenantService.getTenants();
      const list = res.data?.data || res.data || [];
      setTenants(list);
      if (list.length > 0) {
        setSelectedTenantId(list[0].id);
        setSelectedFacility(list[0].kode_dinas || list[0].nama_dinas || '');
        setActiveTenantCode(list[0].kode_dinas || list[0].nama_dinas || '');
      }
    } catch (err) {
      console.error("Gagal load tenants:", err);
    }
  };

  const loadConfig = async (tenantId) => {
    if (!tenantId) return;
    try {
      setLoading(true);
      const res = await widgetService.getWidgetConfig(tenantId);
      const data = res.data?.data || res.data || {};
      setConfig({
        widgetKey: data.widget_key || `aksara-livekey-${tenantId.slice(0, 6)}`,
        whitelistDomains: data.whitelist_domains || [],
        primaryColor: data.primary_color || '#10B981',
        chatbotName: data.chatbot_name || 'Asisten AI Dinas',
        chatbotDescription: data.chatbot_description || 'Layanan Informasi Publik',
        greetingMessage: data.greeting_message || 'Halo! Ada yang bisa dibantu?',
        systemPrompt: data.system_prompt || '',
        llmProvider: data.llm_provider || 'google_gemini',
        apiKey: data.api_key || ''
      });
    } catch (err) {
      console.error("Gagal load widget config:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  useEffect(() => {
    if (selectedTenantId) {
      loadConfig(selectedTenantId);
      const selectedTenant = tenants.find(t => t.id === selectedTenantId);
      if (selectedTenant) {
        setSelectedFacility(selectedTenant.kode_dinas || selectedTenant.nama_dinas || '');
        setActiveTenantCode(selectedTenant.kode_dinas || selectedTenant.nama_dinas || '');
      }
    }
  }, [selectedTenantId, tenants]);

  const handleChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleAddDomain = () => {
    if (newDomain.trim() && !config.whitelistDomains.includes(newDomain.trim())) {
      setConfig(prev => ({
        ...prev,
        whitelistDomains: [...prev.whitelistDomains, newDomain.trim()]
      }));
      setNewDomain('');
    }
  };

  const handleRemoveDomain = (domainToRemove) => {
    setConfig(prev => ({
      ...prev,
      whitelistDomains: prev.whitelistDomains.filter(d => d !== domainToRemove)
    }));
  };

  const handleRegenerateKey = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let randomPart = '';
    for (let i = 0; i < 8; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    handleChange('widgetKey', `aksara-key-${randomPart}`);
    setIsRegenerateModalOpen(false);
    showToast('success', 'Widget key berhasil di-generate ulang.');
  };

  const handleCopyScript = () => {
    const scriptText = `<script src="https://aksara.ponorogo.go.id/widget.js" data-key="${config.widgetKey}"></script>`;
    navigator.clipboard.writeText(scriptText).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const showToast = (type, text) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSave = async () => {
    if (!config.chatbotName.trim() || !config.greetingMessage.trim() || !config.primaryColor.trim()) {
      showToast('error', 'Nama Chatbot, Greeting Message, dan Warna Dasar wajib diisi!');
      return;
    }
    
    if (config.llmProvider === 'openai' || config.llmProvider === 'anthropic_claude') {
      if (!config.apiKey || config.apiKey.trim() === '') {
        showToast('error', 'API Key wajib diisi untuk provider ' + config.llmProvider);
        return;
      }
    }
    
    try {
      setLoading(true);
      await widgetService.updateWidgetConfig(selectedTenantId, {
        widget_key: config.widgetKey,
        whitelist_domains: config.whitelistDomains,
        primary_color: config.primaryColor,
        chatbot_name: config.chatbotName,
        chatbot_description: config.chatbotDescription,
        greeting_message: config.greetingMessage,
        system_prompt: config.systemPrompt,
        llm_provider: config.llmProvider,
        api_key: config.apiKey
      });
      showToast('success', 'Konfigurasi tersimpan ke database backend!');
    } catch (err) {
      console.error("Gagal simpan widget config:", err);
      showToast('error', 'Gagal menyimpan konfigurasi ke backend API.');
    } finally {
      setLoading(false);
    }
  };

  const handleEndImpersonation = () => {
    localStorage.removeItem('aksara_impersonated_tenant');
    if (typeof onExitImpersonate === 'function') {
      onExitImpersonate();
    }
  };

  const selectedTenant = tenants.find(t => t.id === selectedTenantId);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0D0F12] text-gray-800 dark:text-gray-300 font-sans p-6 md:p-8 transition-colors">
      
      {onExitImpersonate && selectedTenant && (
        <div className="w-full bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 px-6 py-3.5 flex items-center justify-between rounded-xl mb-6 transition-colors">
          <div className="text-yellow-700 dark:text-yellow-500 text-sm font-medium flex items-center gap-2 transition-colors">
            <TriangleAlert className="w-5 h-5" />
            <span>Anda sedang berada dalam mode Impersonasi sebagai {selectedTenant.kode_dinas || selectedTenant.nama_dinas || 'Tenant'}</span>
          </div>
          <button 
            onClick={handleEndImpersonation}
            className="bg-yellow-100 dark:bg-yellow-500/10 hover:bg-yellow-200 dark:hover:bg-yellow-500/20 text-yellow-700 dark:text-yellow-500 border border-yellow-300 dark:border-yellow-500/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Kembali ke Super Admin
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight transition-colors">
              Manajemen Integrasi & Chatbot
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 leading-relaxed max-w-3xl transition-colors">
              Atur integrasi keamanan, tampilan visual, dan kepribadian asisten AI khusus untuk website resmi {selectedFacility ? selectedFacility : 'tenant'}.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 dark:text-gray-400 transition-colors">Pilih Fasilitas:</span>
            <div className="relative">
              <select
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                className="appearance-none bg-white dark:bg-[#1C1E22] border border-gray-300 dark:border-gray-800 text-gray-900 dark:text-white rounded-lg pl-4 pr-10 py-2.5 text-sm font-medium focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 dark:focus:border-emerald-500/50 cursor-pointer shadow-sm dark:shadow-none transition-colors"
              >
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.nama_dinas || t.nama}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#1A1C20] rounded-xl border border-gray-200 dark:border-gray-800/50 shadow-sm dark:shadow-none p-6 flex flex-col transition-colors">
              <div className="flex items-center gap-2 mb-6">
                <Code className="w-5 h-5 text-emerald-600 dark:text-emerald-500 transition-colors" />
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 transition-colors">Integrasi & Keamanan</h2>
              </div>
              
              <div className="space-y-6 flex-1">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2 transition-colors">
                    <Key className="w-4 h-4 text-gray-500 dark:text-gray-400 transition-colors" /> Widget Key
                  </label>
                  <div className="flex gap-3">
                    <input 
                      type="text" 
                      readOnly 
                      value={config.widgetKey}
                      className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-[#131518] border border-gray-300 dark:border-gray-700 rounded-md text-gray-900 dark:text-gray-200 font-mono text-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    />
                    <button 
                      onClick={() => setIsRegenerateModalOpen(true)}
                      className="px-4 py-2.5 text-sm font-medium text-amber-600 dark:text-amber-500 bg-transparent dark:bg-amber-500/10 border border-amber-600/50 dark:border-amber-500/50 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-500/20 transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                      <RefreshCw className="w-4 h-4" /> Generate Ulang
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">Script Integrasi</label>
                  <div className="relative group">
                    <textarea 
                      readOnly
                      value={`<script src="https://aksara.ponorogo.go.id/widget.js" data-key="${config.widgetKey}"></script>`}
                      rows="3"
                      className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md text-emerald-600 dark:text-emerald-400 font-mono text-xs focus:outline-none resize-none leading-relaxed transition-colors"
                    />
                    <button 
                      onClick={handleCopyScript}
                      className={`absolute bottom-3 right-3 px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-all border ${
                        isCopied ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {isCopied ? 'Tersalin!' : 'Salin Script'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 transition-colors">
                    Copy dan paste script ini tepat sebelum tag <code className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700 px-1 rounded transition-colors">&lt;/body&gt;</code> pada HTML website dinas.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2 transition-colors">
                    <Globe className="w-4 h-4 text-gray-500 dark:text-gray-400 transition-colors" /> Whitelist Domain
                  </label>
                  <div className="flex gap-2 mb-3">
                    <input 
                      type="text" 
                      placeholder="Contoh: dinkes.ponorogo.go.id"
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDomain())}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#131518] text-gray-900 dark:text-gray-200 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    />
                    <button 
                      type="button"
                      onClick={handleAddDomain}
                      disabled={!newDomain.trim()}
                      className="px-4 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-500/20 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> Tambah
                    </button>
                  </div>
                  {config.whitelistDomains.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {config.whitelistDomains.map(domain => (
                        <span key={domain} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 transition-colors">
                          {domain}
                          <button onClick={() => handleRemoveDomain(domain)} className="text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic transition-colors">Belum ada domain yang di-whitelist.</p>
                  )}
                </div>
              </div>
            </div>

            {/* KONFIGURASI AI */}
            <div className="bg-white dark:bg-[#1A1C20] border border-gray-200 dark:border-gray-800/50 shadow-sm dark:shadow-none rounded-xl p-6 flex flex-col relative overflow-hidden transition-colors">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-100/50 dark:bg-emerald-900/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none transition-colors"></div>
              
              <div className="flex items-center gap-2 mb-6 relative z-10">
                <Settings className="w-5 h-5 text-emerald-600 dark:text-emerald-500 transition-colors" />
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 transition-colors">Konfigurasi AI (Override)</h2>
              </div>
              
              <div className="space-y-5 flex-1 relative z-10">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">LLM Service Provider</label>
                  <select 
                    value={config.llmProvider || 'google_gemini'}
                    onChange={(e) => handleChange('llmProvider', e.target.value)}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#131518] text-gray-900 dark:text-gray-200 focus:bg-white dark:focus:bg-[#131518] shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm py-2.5 px-3 outline-none cursor-pointer appearance-none bg-no-repeat bg-[right_12px_center] bg-[length:16px] transition-colors"
                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%239CA3AF%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M4%206l4%204%204-4%22%2F%3E%3C%2Fsvg%3E")' }}
                  >
                    <option value="google_gemini">Google Gemini</option>
                    <option value="openai">OpenAI (Custom Override)</option>
                    <option value="anthropic_claude">Anthropic Claude (Custom Override)</option>
                  </select>
                  <p className="text-[11px] text-gray-500 mt-1.5 transition-colors">Pilih provider alternatif jika ingin menimpa pengaturan bawaan pusat.</p>
                </div>

                {/* ===== INPUT API KEY DENGAN TOGGLE SHOW/HIDE ===== */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">
                    API Key
                    {config.llmProvider !== 'google_gemini' && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <div className="relative">
                    <input 
                      type={showApiKey ? "text" : "password"} 
                      value={config.apiKey || ''}
                      onChange={(e) => handleChange('apiKey', e.target.value)}
                      autoComplete="new-password"
                      placeholder={config.llmProvider === 'google_gemini' ? 'Masukkan API Key' : 'Masukkan API Key'}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#131518] text-gray-900 dark:text-gray-200 focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm py-2.5 px-3 pr-10 outline-none transition-colors"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1.5">
                    Masukkan API Key
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">Penyesuaian AI Tone (Instruksi Khusus)</label>
                  <textarea 
                    rows="3"
                    value={config.systemPrompt}
                    onChange={(e) => handleChange('systemPrompt', e.target.value)}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#131518] text-gray-900 dark:text-gray-200 focus:bg-white dark:focus:bg-[#131518] shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm py-2.5 px-3 outline-none resize-none transition-colors"
                    placeholder="Misal: Gunakan bahasa yang lebih ramah dan selalu sisipkan sapaan khas daerah Ponorogo di awal percakapan..."
                  />
                  <p className="text-[11px] text-gray-500 mt-1.5 transition-colors">Instruksi ini akan ditambahkan ke system prompt dasar.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1A1C20] border border-gray-200 dark:border-gray-800/50 shadow-sm dark:shadow-none rounded-xl p-6 flex flex-col h-full transition-colors">
            <div className="flex items-center gap-2 mb-6">
              <Bot className="w-5 h-5 text-emerald-600 dark:text-emerald-500 transition-colors" />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 transition-colors">Kelola Chatbot</h2>
            </div>
            
            <div className="space-y-5 flex-1">
              
              <div className="flex gap-6 items-start">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">Avatar / Logo Dinas</label>
                  <label className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer bg-gray-50 dark:bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:border-emerald-500 dark:hover:border-emerald-500/50 transition-all group h-32">
                    <div className="bg-gray-200 dark:bg-gray-800 p-2 rounded-full mb-2 group-hover:scale-110 transition-transform">
                      <UploadCloud className="w-5 h-5 text-emerald-600 dark:text-emerald-500 transition-colors" />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 text-center transition-colors">Format .png/.jpg</span>
                    <input type="file" className="hidden" accept=".png,.jpg,.jpeg" />
                  </label>
                </div>

                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2 transition-colors">
                    <Palette className="w-4 h-4 text-gray-500 dark:text-gray-400 transition-colors" /> Warna Dasar
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden flex-shrink-0 cursor-pointer transition-colors">
                      <input 
                        type="color" 
                        value={config.primaryColor}
                        onChange={(e) => handleChange('primaryColor', e.target.value)}
                        className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer opacity-0"
                      />
                      <div className="w-full h-full" style={{ backgroundColor: config.primaryColor }} />
                    </div>
                    <input 
                      type="text" 
                      value={config.primaryColor}
                      onChange={(e) => handleChange('primaryColor', e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#131518] text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 font-mono text-sm uppercase transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 transition-colors">Nama Chatbot</label>
                  <input 
                    type="text" 
                    value={config.chatbotName}
                    onChange={(e) => handleChange('chatbotName', e.target.value)}
                    placeholder="Cth: Asisten Dinkes"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#131518] text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 transition-colors" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 transition-colors">Deskripsi</label>
                  <input 
                    type="text" 
                    value={config.chatbotDescription}
                    onChange={(e) => handleChange('chatbotDescription', e.target.value)}
                    placeholder="Cth: Layanan Informasi"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#131518] text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 transition-colors" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 transition-colors">Greeting Message</label>
                <textarea 
                  value={config.greetingMessage}
                  onChange={(e) => handleChange('greetingMessage', e.target.value)}
                  rows="2"
                  placeholder="Halo! Ada yang bisa dibantu?"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#131518] text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 resize-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 transition-colors">System Prompt Khusus</label>
                <textarea 
                  value={config.systemPrompt}
                  onChange={(e) => handleChange('systemPrompt', e.target.value)}
                  rows="3"
                  placeholder="Kamu adalah asisten khusus yang akan melayani..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#131518] text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 resize-y transition-colors font-mono text-xs leading-relaxed"
                />
                <p className="text-xs text-gray-500 mt-1.5 transition-colors">
                  Prompt ini akan digabungkan di bawah Global System Prompt Super Admin.
                </p>
              </div>

            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button 
            onClick={handleSave}
            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            Simpan Konfigurasi
          </button>
        </div>

      </div>

      {isRegenerateModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-colors">
          <div className="bg-white dark:bg-[#1C1E22] border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-md shadow-xl dark:shadow-2xl overflow-hidden p-6 text-center transform transition-all">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center mx-auto mb-4 border-2 border-amber-200 dark:border-amber-500/20 transition-colors">
              <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-500 transition-colors" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 transition-colors">Generate Ulang Key?</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 leading-relaxed transition-colors">
              Apakah Anda yakin ingin generate ulang widget key? <strong className="text-gray-900 dark:text-gray-200 transition-colors">Key lama akan hangus</strong> dan widget yang masih menggunakan key lama tidak akan berfungsi.
            </p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => setIsRegenerateModalOpen(false)} 
                className="px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#0D0F12] border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors flex-1"
              >
                Batal
              </button>
              <button 
                onClick={handleRegenerateKey} 
                className="px-6 py-2.5 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 transition-colors flex-1"
              >
                Ya, Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-down mt-12">
          <div className={`flex items-center gap-2 px-5 py-3 rounded-xl shadow-xl border text-sm font-medium transition-colors ${
            toastMessage.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 
            toastMessage.type === 'error' ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400' :
            'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400'
          }`}>
            {toastMessage.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-500 transition-colors" /> : 
             toastMessage.type === 'error' ? <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-500 transition-colors" /> :
             <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-500 transition-colors" />
            }
            {toastMessage.text}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in-down {
          0% { opacity: 0; transform: translate(-50%, -20px); }
          100% { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}