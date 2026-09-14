import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Save, Eye, EyeOff, Settings, Database, MessageSquare, Loader2 } from 'lucide-react';
import Button from '../ui/Button';
import api from '../../services/api';
import TokenTab from './TokenTab';
import { widgetService } from '../../services/widget.service';

export default function AIConfigTab({ tenantId }) {
  // ====== STATE ======
  const [config, setConfig] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('config');
  const [isLoading, setIsLoading] = useState(true);

  // ====== STORAGE STATE ======
  const [storageLimits, setStorageLimits] = useState({});
  const [loadingStorage, setLoadingStorage] = useState(false);
  const [savingStorage, setSavingStorage] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // ====== PROVIDER MODEL MAP (NO HARCODE! SEMUA DINAMIS) ======
  const PROVIDER_MODELS = {
    google_gemini: ['gemini-3.6-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    anthropic: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku']
  };

  const PROVIDER_LABELS = {
    google_gemini: 'Google Gemini',
    openai: 'OpenAI',
    anthropic: 'Anthropic Claude'
  };

  // ====== LOAD TENANTS ======
  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const res = await api.get('/tenants');
      const list = res.data?.data || res.data || [];
      setTenants(list);
      
      if (list.length > 0 && !tenantId) {
        const firstTenantId = list[0].id;
        await loadConfigFromDB(firstTenantId);
        await loadStorage(firstTenantId);
      } else if (tenantId) {
        await loadConfigFromDB(tenantId);
        await loadStorage(tenantId);
      }
      setIsLoading(false);
    } catch (err) {
      console.error("Gagal load tenants:", err);
      setIsLoading(false);
    }
  };

  // ====== LOAD CONFIG DARI DATABASE ======
  const loadConfigFromDB = async (tenantId) => {
    if (!tenantId) return;
    try {
      setLoadingConfig(true);
      const res = await widgetService.getWidgetConfig(tenantId);
      const data = res.data?.data || res.data || {};
      
      // ✅ NO HARCODE! Ambil dari database, kosongkan jika tidak ada
      setConfig({
        providerType: data.llm_provider || '',  // KOSONGKAN!
        llmModel: data.llm_model || '',  // KOSONGKAN!
        apiKey: '',
        apiKeyMasked: data.api_key_masked || null,
        systemPrompt: data.system_prompt || '',
        temperature: data.temperature ?? 0.5,
        threshold: data.similarity_threshold ?? 0.70,
        maxTokens: data.max_tokens ?? 500,
        projectId: data.project_id ?? '',
        region: data.region || '',
        model: data.llm_model || '',  // KOSONGKAN!
      });
    } catch (err) {
      console.error("Gagal load config:", err);
    } finally {
      setLoadingConfig(false);
    }
  };

  // ====== LOAD STORAGE ======
  const loadStorage = async (tenantId) => {
    if (!tenantId) return;
    try {
      setLoadingStorage(true);
      const res = await api.get(`/tenants/${tenantId}/storage`);
      const data = res.data.data;
      setStorageLimits({ [tenantId]: data.max_mb || 500 });
    } catch (err) {
      console.error('Gagal load storage:', err);
    } finally {
      setLoadingStorage(false);
    }
  };

  // ====== GET TARGET TENANT ID ======
  const getTargetTenantId = () => {
    return tenantId || (tenants.length > 0 ? tenants[0].id : null);
  };

  // ====== UPDATE STORAGE LIMIT ======
  const handleUpdateStorageLimit = async (maxMb) => {
    const targetId = getTargetTenantId();
    if (!targetId) {
      alert('Tidak ada tenant yang tersedia!');
      return;
    }
    try {
      setSavingStorage(true);
      await api.put(`/admin/tenants/${targetId}/storage/limit`, { max_mb: maxMb });
      setStorageLimits(prev => ({ ...prev, [targetId]: maxMb }));
    } catch (error) {
      console.error('Gagal update storage:', error);
    } finally {
      setSavingStorage(false);
    }
  };

  // ====== HANDLE CHANGE ======
  const handleChange = (e) => {
    if (!config) return;
    const { name, value, type } = e.target;
    let newConfig = {
      ...config,
      [name]: type === 'range' || type === 'number' ? Number(value) : value
    };
    
    // ✅ NO HARCODE! Auto-fill dengan model pertama dari list
    if (name === 'providerType' && value) {
      const models = PROVIDER_MODELS[value] || [];
      const defaultModel = models.length > 0 ? models[0] : '';
      newConfig.model = defaultModel;
      newConfig.llmModel = defaultModel;
    }
    
    setConfig(newConfig);
  };

  // ====== HANDLE MODEL CHANGE ======
  const handleModelChange = (e) => {
    if (!config) return;
    const { value } = e.target;
    setConfig({
      ...config,
      llmModel: value,
      model: value
    });
  };

  // ====== SAVE KE DATABASE ======
  const handleSaveLLM = async (e) => {
    e.preventDefault();
    if (!config) return;
    
    const targetId = getTargetTenantId();
    if (!targetId) {
      alert('Tidak ada tenant yang tersedia!');
      return;
    }
    
    // ✅ VALIDASI: Pastikan provider dan model terisi
    if (!config.providerType) {
      alert('Silakan pilih Tipe Provider terlebih dahulu!');
      return;
    }
    
    if (!config.llmModel && !config.model) {
      alert('Silakan pilih Nama Model AI terlebih dahulu!');
      return;
    }
    
    try {
      setSavingConfig(true);
      
      const payload = {
        llm_provider: config.providerType,
        llm_model: config.llmModel || config.model,
        system_prompt: config.systemPrompt,
        temperature: config.temperature,
        similarity_threshold: config.threshold,
        max_tokens: config.maxTokens,
        project_id: config.projectId,
        region: config.region,
      };
      
      if (config.apiKey && config.apiKey.trim() !== '') {
        payload.api_key = config.apiKey;
      }
      
      await widgetService.updateWidgetConfig(targetId, payload);
      
      alert('Konfigurasi LLM berhasil disimpan!');
      await loadConfigFromDB(targetId);
    } catch (err) {
      console.error("Gagal simpan:", err);
      alert('Gagal menyimpan konfigurasi!');
    } finally {
      setSavingConfig(false);
    }
  };

  // ✅ NO HARCODE! Reset ke kosong
  const handleResetLLM = () => {
    if (!config) return;
    setConfig({
      ...config,
      providerType: '',
      model: '',
      llmModel: '',
      temperature: 0.5,
      threshold: 0.70,
      maxTokens: 500,
      systemPrompt: '',
      projectId: '',
      region: '',
      apiKey: '',
    });
  };

  // ====== RENDER SUB TAB ======
  if (activeSubTab === 'token') {
    return (
      <div>
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => setActiveSubTab('config')}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ← Kembali ke Konfigurasi
          </button>
          <span className="text-sm font-medium text-gray-900 dark:text-white">/ Penggunaan Token</span>
        </div>
        <TokenTab />
      </div>
    );
  }

  // ====== RENDER LOADING ======
  if (isLoading || !config) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <span className="ml-2 text-gray-500">Memuat konfigurasi...</span>
      </div>
    );
  }

  // ====== RENDER KONFIGURASI ======
  return (
    <div className="space-y-6">
      
      {/* NAVIGASI SUB TAB */}
      <div className="flex items-center gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
        <button 
          onClick={() => setActiveSubTab('config')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeSubTab === 'config' 
              ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Konfigurasi AI
        </button>
        <button 
          onClick={() => setActiveSubTab('token')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeSubTab === 'token' 
              ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Penggunaan Token
        </button>
      </div>

      {/* Section Global Config */}
      <div className="bg-white dark:bg-[#1A1C20] border border-gray-200 dark:border-gray-800/50 shadow-sm dark:shadow-none rounded-xl overflow-hidden transition-colors">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800/50 bg-transparent flex justify-between items-center">
          <h2 className="text-[15px] font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <Settings className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
            Konfigurasi Global & Limitasi
          </h2>
          <Button 
            type="button" 
            onClick={() => handleUpdateStorageLimit(500)}
            variant="primary" 
            icon={Save}
            disabled={savingStorage}
          >
            {savingStorage ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Simpan Global
          </Button>
        </div>
        
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Storage Limit */}
            <div>
              <label className="flex items-center gap-2 text-xs uppercase font-bold text-gray-600 dark:text-gray-400 mb-3 tracking-wider">
                <Database className="w-4 h-4" />
                Storage Limit per Tenant
              </label>
              
              {loadingStorage ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Memuat data...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 dark:text-gray-300 min-w-[150px] truncate">
                    Tenant: {tenants.find(t => t.id === getTargetTenantId())?.nama_dinas || 'Loading...'}
                  </span>
                  <input 
                    type="number" 
                    value={storageLimits[getTargetTenantId()] || 500}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      if (val > 0) handleUpdateStorageLimit(val);
                    }}
                    className="w-24 bg-white dark:bg-[#131518] border border-gray-300 dark:border-gray-700/50 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors shadow-sm dark:shadow-none sm:text-sm py-1.5 px-2 outline-none"
                  />
                  <span className="text-xs text-gray-500">MB</span>
                </div>
              )}
            </div>

            {/* Default AI Tone */}
            <div>
              <label className="flex items-center gap-2 text-xs uppercase font-bold text-gray-600 dark:text-gray-400 mb-3 tracking-wider">
                <MessageSquare className="w-4 h-4" />
                Default AI Tone
              </label>
              <select className="w-full bg-white dark:bg-[#131518] border border-gray-300 dark:border-gray-700/50 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors shadow-sm dark:shadow-none sm:text-sm py-2.5 px-3 outline-none cursor-pointer appearance-none bg-no-repeat bg-[right_12px_center] bg-[length:16px]" style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%239CA3AF%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M4%206l4%204%204-4%22%2F%3E%3C%2Fsvg%3E")' }}>
                <option value="profesional" className="bg-white dark:bg-[#0D0E10]">Profesional & Informatif</option>
                <option value="hangat" className="bg-white dark:bg-[#0D0E10]">Hangat & Empatis</option>
                <option value="kasual" className="bg-white dark:bg-[#0D0E10]">Kasual & Ringan</option>
                <option value="tegas" className="bg-white dark:bg-[#0D0E10]">Tegas & Teknis</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Konfigurasi LLM */}
      <form onSubmit={handleSaveLLM} autoComplete="off" className="bg-white dark:bg-[#1A1C20] border border-gray-200 dark:border-gray-800/50 shadow-sm dark:shadow-none rounded-xl overflow-hidden transition-colors">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800/50 bg-transparent flex justify-between items-center">
          <h2 className="text-[15px] font-medium text-gray-900 dark:text-white">Pengaturan LLM Utama</h2>
          <div className="flex gap-2">
            <Button 
              type="button" 
              onClick={handleResetLLM}
              variant="ghost"
              className="!text-red-500 hover:!text-red-400 hover:!bg-red-500/10"
            >
              Reset
            </Button>
            <Button type="submit" variant="primary" icon={Save} disabled={savingConfig}>
              {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Simpan Konfigurasi LLM
            </Button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          
          {/* TIPE PROVIDER */}
          <div>
            <label className="block text-xs uppercase font-medium text-gray-600 dark:text-gray-400 mb-1">Tipe Provider</label>
            <select
              name="providerType"
              value={config.providerType || ''}  // ✅ NO HARCODE!
              onChange={handleChange}
              className="w-full bg-white dark:bg-[#131518] border border-gray-300 dark:border-gray-700/50 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors shadow-sm dark:shadow-none sm:text-sm py-2.5 px-3 outline-none appearance-none"
              style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%239CA3AF%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M4%206l4%204%204-4%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
            >
              <option value="" className="bg-white dark:bg-[#25272C] text-gray-500 dark:text-gray-400">-- Pilih Provider --</option>
              {Object.keys(PROVIDER_MODELS).map((key) => (
                <option key={key} value={key} className="bg-white dark:bg-[#25272C] text-gray-900 dark:text-white">
                  {PROVIDER_LABELS[key] || key}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-gray-400 mt-1">
              Pilih provider AI yang akan digunakan untuk tenant ini
            </p>
          </div>

          {/* GRID 2 KOLOM */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            
            <div>
              <label className="block text-xs uppercase font-medium text-gray-600 dark:text-gray-400 mb-1">Nama Model AI</label>
              <select
                name="llmModel"
                value={config.llmModel || config.model || ''}  // ✅ NO HARCODE!
                onChange={handleModelChange}
                disabled={!config.providerType}
                className="w-full bg-white dark:bg-[#131518] border border-gray-300 dark:border-gray-700/50 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors shadow-sm dark:shadow-none sm:text-sm py-2.5 px-3 outline-none appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%239CA3AF%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M4%206l4%204%204-4%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
              >
                <option value="" className="bg-white dark:bg-[#25272C] text-gray-500 dark:text-gray-400">-- Pilih Model --</option>
                {config.providerType && PROVIDER_MODELS[config.providerType]?.map(model => (
                  <option key={model} value={model} className="bg-white dark:bg-[#25272C] text-gray-900 dark:text-white">
                    {model}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-gray-400 mt-1">
                Pilih model AI yang akan digunakan
              </p>
            </div>
            
            {/* PROJECT ID */}
            <div>
              <label className="block text-xs uppercase font-medium text-gray-600 dark:text-gray-400 mb-1">
                Project ID
              </label>
              <input 
                type="text" 
                name="projectId"
                value={config.projectId || ''}
                onChange={handleChange}
                autoComplete="off"
                className="w-full bg-white dark:bg-[#131518] border border-gray-300 dark:border-gray-700/50 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors shadow-sm dark:shadow-none sm:text-sm py-2.5 px-3 outline-none"
                placeholder="Contoh: aksara-ponorogo-123"
              />
            </div>

            {/* REGION */}
            <div>
              <label className="block text-xs uppercase font-medium text-gray-600 dark:text-gray-400 mb-1">
                Region (Opsional)
              </label>
              <input 
                type="text" 
                name="region"
                value={config.region || ''}
                onChange={handleChange}
                autoComplete="off"
                className="w-full bg-white dark:bg-[#131518] border border-gray-300 dark:border-gray-700/50 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors shadow-sm dark:shadow-none sm:text-sm py-2.5 px-3 outline-none"
                placeholder="Contoh: asia-southeast2"
              />
            </div>

            {/* API KEY */}
            <div>
              <label className="block text-xs uppercase font-medium text-gray-600 dark:text-gray-400 mb-1">
                API Key
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <input 
                  type={showApiKey ? "text" : "password"} 
                  name="apiKey"
                  value={config.apiKey || ''}
                  onChange={handleChange}
                  autoComplete="new-password"
                  className="w-full bg-white dark:bg-[#131518] border border-gray-300 dark:border-gray-700/50 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors shadow-sm dark:shadow-none sm:text-sm py-2.5 px-3 pr-10 outline-none"
                  placeholder="Masukkan API Key"
                />
                <button 
                  type="button" 
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {config.apiKeyMasked && (
                <p className="text-[10px] text-gray-400 mt-1">
                  API Key tersimpan: <span className="font-mono">{config.apiKeyMasked}</span>
                </p>
              )}
              <p className="text-[10px] text-gray-400 mt-1">
                API Key wajib diisi
              </p>
            </div>
          </div>

          {/* SLIDER */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            <div>
              <label className="flex justify-between text-xs uppercase font-medium text-gray-600 dark:text-gray-400 mb-1">
                <span>Temperature</span>
                <span>{config.temperature}</span>
              </label>
              <input 
                type="range" 
                name="temperature"
                min="0" max="1" step="0.1"
                value={config.temperature}
                onChange={handleChange}
                className="w-full accent-emerald-500"
              />
            </div>
            <div>
              <label className="flex justify-between text-xs uppercase font-medium text-gray-600 dark:text-gray-400 mb-1">
                <span>Similarity Threshold</span>
                <span>{config.threshold}</span>
              </label>
              <input 
                type="range" 
                name="threshold"
                min="0" max="1" step="0.05"
                value={config.threshold}
                onChange={handleChange}
                className="w-full accent-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs uppercase font-medium text-gray-600 dark:text-gray-400 mb-1">Max Tokens</label>
              <input 
                type="number" 
                name="maxTokens"
                value={config.maxTokens}
                onChange={handleChange}
                className="w-full bg-white dark:bg-[#131518] border border-gray-300 dark:border-gray-700/50 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors shadow-sm dark:shadow-none sm:text-sm py-2.5 px-3 outline-none"
              />
            </div>
          </div>

          {/* ADVANCED ACCORDION */}
          <div className="border border-gray-200 dark:border-gray-800/50 rounded-xl overflow-hidden mt-6">
            <button
              type="button"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="w-full flex justify-between items-center px-4 py-3 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Pengaturan Lanjutan</span>
              {isAdvancedOpen ? <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />}
            </button>
            
            {isAdvancedOpen && (
              <div className="p-4 bg-white dark:bg-[#1A1C20] space-y-4 border-t border-gray-200 dark:border-gray-800/50">
                <div>
                  <label className="block text-xs uppercase font-medium text-gray-600 dark:text-gray-400 mb-1">Global System Prompt</label>
                  <textarea 
                    rows={4} 
                    name="systemPrompt"
                    value={config.systemPrompt || ''}
                    onChange={handleChange}
                    className="w-full bg-white dark:bg-[#131518] border border-gray-300 dark:border-gray-700/50 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors shadow-sm dark:shadow-none sm:text-sm py-2.5 px-3 outline-none"
                    placeholder="Anda adalah asisten AI dari Aksara..."
                  />
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  ⚠️ Kosongkan untuk menggunakan default dari Super Admin
                </div>
              </div>
            )}
          </div>
        </div>
      </form>

    </div>
  );
}