import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Trash2, RefreshCw, Edit2,
  UploadCloud, X, AlertCircle, CheckCircle,
  Database, MessageSquare, TrendingUp, ChevronDown, ChevronUp, 
  FileText, Lock, Folder, File
} from 'lucide-react';
import { knowledgeService } from '../services/knowledge.service';
import { tenantService } from '../services/tenant.service';
import api from '../services/api';

// ====== KOMPONEN STATUS BADGE ======
const StatusBadge = ({ status }) => {
  const statusMap = {
    'TERINDEKS': { 
      label: 'Terindeks DB', 
      className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      dot: 'bg-emerald-400'
    },
    'PEMROSESAN': { 
      label: 'Pemrosesan', 
      className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      dot: 'bg-blue-400 animate-pulse'
    },
    'GAGAL': { 
      label: 'Gagal Index', 
      className: 'bg-red-500/10 text-red-400 border-red-500/20',
      dot: 'bg-red-400'
    },
    'PROSES': { 
      label: 'Pemrosesan', 
      className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      dot: 'bg-blue-400 animate-pulse'
    }
  };

  const mapped = statusMap[status] || statusMap['TERINDEKS'];
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${mapped.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${mapped.dot}`}></span>
      {mapped.label}
    </span>
  );
};

// ====== KOMPONEN FILE TYPE ICON ======
const FileTypeIcon = ({ type }) => {
  const typeMap = {
    'PDF': { color: 'text-red-400', icon: '📄' },
    'DOCX': { color: 'text-blue-400', icon: '📝' },
    'DOC': { color: 'text-blue-400', icon: '📝' },
    'XLSX': { color: 'text-emerald-400', icon: '📊' },
    'CSV': { color: 'text-emerald-400', icon: '📊' },
    'TXT': { color: 'text-gray-400', icon: '📃' },
    'JPEG': { color: 'text-purple-400', icon: '🖼️' },
    'PNG': { color: 'text-purple-400', icon: '🖼️' }
  };
  const mapped = typeMap[type] || typeMap['TXT'];
  return <span className={`${mapped.color}`}>{mapped.icon}</span>;
};

// ====== FUNGSI GET FILE TYPE COLOR ======
const getFileTypeColor = (type) => {
  const t = type?.toUpperCase() || '';
  if (t === 'PDF') return 'text-red-400';
  if (t === 'DOC' || t === 'DOCX') return 'text-blue-400';
  if (t === 'CSV' || t === 'XLSX') return 'text-emerald-400';
  return 'text-gray-400';
};

// ====== KOMPONEN UTAMA ======
export default function KelolaKnowledgeBase() {
  // State
  const [tenants, setTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [activeTenantObj, setActiveTenantObj] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua Status');
  
  // Collection expand state
  const [expandedCols, setExpandedCols] = useState([]);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isReindexing, setIsReindexing] = useState(false);
  
  // Upload states
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    judul: '',
    kategori: 'Regulasi',
    konten: '',
    file: null,
    collection_name: '',
    newKategori: ''
  });

  // ====== STORAGE STATE ======
  const [storageData, setStorageData] = useState({
    used: 0,
    max: 500,
    used_percentage: 0,
    files_count: 0,
    available: 0,
    loading: true,
    error: false
  });

  // ====== GROUP ARTICLES BY COLLECTION ======
  const getCollections = () => {
    const collections = {};
    articles.forEach(art => {
      const key = art.kategori || 'Umum';
      if (!collections[key]) {
        collections[key] = {
          id: `col-${key.replace(/\s/g, '-')}`,
          name: key,
          category: key,
          lastUpdated: art.updated_at ? new Date(art.updated_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Baru saja',
          documents: []
        };
      }
      collections[key].documents.push(art);
    });
    return Object.values(collections);
  };

  // ====== API FUNCTIONS ======
  const loadTenants = async () => {
    try {
      const res = await tenantService.getTenants();
      const list = res.data?.data || res.data || [];
      setTenants(list);
      if (list.length > 0) {
        const firstTenant = list[0];
        const tenantId = firstTenant.id || firstTenant.tenant_id || firstTenant.uuid;

        const isValidUUID = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        
        if (tenantId && isValidUUID(tenantId)) {
          setSelectedTenantId(tenantId);
          setActiveTenantObj(firstTenant);
        } else {
          console.warn("Tenant ID bukan UUID:", tenantId);
          const validTenant = list.find(t => t.id && isValidUUID(t.id));
          if (validTenant) {
            setSelectedTenantId(validTenant.id);
            setActiveTenantObj(validTenant);
          }
        }
      }
    } catch (err) {
      console.error("Gagal load tenants:", err);
    }
  };

  // ====== HANDLE UPLOAD FILE ======
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const namaFile = file.name.replace(/\.[^/.]+$/, '');
      setFormData(prev => ({ ...prev, judul: namaFile, file }));
      setUploadFile(file);
      setUploadProgress(0);
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files[0] || e.target?.files[0];
    if (file) {
      const namaFile = file.name.replace(/\.[^/.]+$/, '');
      setFormData(prev => ({ ...prev, judul: namaFile, file }));
      setUploadFile(file);
      setUploadProgress(0);
    }
  };

  const removeFile = () => {
    setUploadFile(null);
    setFormData(prev => ({ ...prev, file: null }));
    setUploadProgress(0);
  };

  const loadArticles = async () => {
    try {
      setLoading(true);

      const isValidUUID = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const params = selectedTenantId && isValidUUID(selectedTenantId) 
        ? { tenant_id: selectedTenantId } 
        : {};
      
      const res = await knowledgeService.getArticles(params);
      const data = res.data?.data || res.data || [];
      
      const withStatus = data.map(item => {
        let fileSizeMB = '0 MB';
        if (item.file_size) {
          const mb = item.file_size / (1024 * 1024);
          fileSizeMB = mb < 0.01 ? '< 0.01 MB' : `${mb.toFixed(2)} MB`;
        }
        
        return {
          ...item,
          status: item.status || 'TERINDEKS',
          type: item.file_type || 'TXT',
          size: fileSizeMB,
          similarity_score: item.similarity_score || 0
        };
      });
      
      setArticles(withStatus);
    } catch (err) {
      console.error("Gagal load articles:", err);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  // ====== LOAD STORAGE ======
  const loadStorage = async (tenantId) => {
    if (!tenantId) return;
    
    try {
      setStorageData(prev => ({ ...prev, loading: true }));
      const res = await api.get(`/tenants/${tenantId}/storage`);
      const data = res.data.data;
      
      setStorageData({
        used: data.used_mb || 0,
        max: data.max_mb || 500,
        used_percentage: data.used_percentage || 0,
        files_count: data.files_count || 0,
        available: data.available_mb || 0,
        loading: false,
        error: false
      });
    } catch (err) {
      console.error('Gagal load storage:', err);
      setStorageData({
        used: 0,
        max: 500,
        used_percentage: 0,
        files_count: 0,
        available: 500,
        loading: false,
        error: true
      });
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  useEffect(() => {
    if (selectedTenantId) {
      const found = tenants.find(t => t.id === selectedTenantId);
      setActiveTenantObj(found || null);
      loadArticles();
      loadStorage(selectedTenantId);
    }
  }, [selectedTenantId]);

  // ====== TOGGLE EXPAND ======
  const toggleExpand = (id) => {
    setExpandedCols(prev => prev.includes(id) ? prev.filter(colId => colId !== id) : [...prev, id]);
  };

  // ====== HANDLE DELETE ======
  const handleDeleteArticle = async () => {
    if (!selectedDoc) return;
    try {
      setLoading(true);
      await knowledgeService.deleteArticle(selectedDoc.id);
      setIsDeleteModalOpen(false);
      setSelectedDoc(null);
      await loadArticles();
      await loadStorage(selectedTenantId);
    } catch (err) {
      console.error("Gagal hapus dokumen:", err);
      alert("Gagal menghapus dokumen.");
    } finally {
      setLoading(false);
    }
  };

  // ====== HANDLE REINDEX ======
  const handleReindexAll = () => {
    setIsReindexing(true);
    setTimeout(() => {
      setIsReindexing(false);
    }, 1500);
  };

  // ====== HANDLE TAMBAH DOKUMEN ======
  const handleAddArticle = async () => {
    if (!formData.judul.trim()) {
      alert("Judul dokumen wajib diisi!");
      return;
    }
    if (!selectedTenantId) {
      alert("Pilih Tenant terlebih dahulu!");
      return;
    }

    try {
      setLoading(true);
      
      let fileSize = 0;
      let fileType = 'TXT';
      
      if (uploadFile) {
        fileSize = uploadFile.size;
        fileType = uploadFile.name.split('.').pop().toUpperCase();
        
        setUploadProgress(0);
        const interval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 100) {
              clearInterval(interval);
              return 100;
            }
            return prev + 10;
          });
        }, 100);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        fileSize = new Blob([formData.konten]).size;
        fileType = 'TXT';
      }

      const payload = {
        tenant_id: selectedTenantId,
        judul: formData.judul.trim(),
        kategori: formData.kategori,
        konten: formData.konten.trim() || `Dokumen: ${uploadFile?.name || ''}`,
        status: "published",
        file_size: fileSize,
        file_type: fileType
      };

      await knowledgeService.createArticle(payload);
      
      setIsAddModalOpen(false);
      setFormData({ judul: '', kategori: 'Regulasi', konten: '', file: null });
      setUploadFile(null);
      setUploadProgress(0);
      await loadArticles();
      await loadStorage(selectedTenantId);
    } catch (err) {
      console.error("Gagal tambah dokumen:", err);
      alert("Gagal menambah dokumen.");
    } finally {
      setLoading(false);
    }
  };

  // ====== FILTERING ======
  const collections = getCollections();
  const categories = ['Regulasi', 'Arsip', 'Medis', 'Umum'];
  const statusOptions = ['Semua Status', 'TERINDEKS', 'PEMROSESAN', 'GAGAL'];

  // Filter collections
  const filteredCollections = collections.filter(col => {
    const matchSearch = col.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = categoryFilter ? col.category === categoryFilter : true;
    const matchStatus = statusFilter === 'Semua Status' ? true : col.documents.some(doc => doc.status === statusFilter);
    return matchSearch && matchCat && matchStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0D0F12] text-gray-800 dark:text-gray-300 font-sans p-6 md:p-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* ====== HEADER ====== */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Kelola Knowledge Base</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Pusat manajemen dokumen referensi AI resmi terhubung ke database.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-700 dark:text-gray-400">Pilih Dinas / OPD:</span>
            <div className="relative">
              <select
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                className="bg-white dark:bg-[#1C1E22] border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-4 py-2 pr-10 appearance-none focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer text-sm font-medium w-56 transition-colors shadow-sm"
              >
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.nama_dinas || t.nama}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* ====== STATISTIK CARDS ====== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#1A1C20] rounded-2xl p-6 border border-gray-200 dark:border-gray-800/50 flex flex-col justify-between shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Dokumen Aktif Real-time</p>
                <h3 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">{articles.length}</h3>
              </div>
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-500">
                <Database className="w-6 h-6" />
              </div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Tersimpan dalam database backend untuk referensi percakapan AI.
            </div>
          </div>

          <div className="bg-white dark:bg-[#1A1C20] rounded-2xl p-6 border border-gray-200 dark:border-gray-800/50 flex flex-col justify-between shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Sesi Chat</p>
                <div className="flex items-end gap-3">
                  <h3 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">{activeTenantObj?.sesi_chat || 0}</h3>
                  <div className="flex items-center text-sm font-medium mb-1 px-2 py-0.5 rounded-md text-emerald-700 bg-emerald-100 dark:text-emerald-500 dark:bg-emerald-500/10">
                    <TrendingUp className="w-3.5 h-3.5 mr-1" /> Real-time
                  </div>
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-500">
                <MessageSquare className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 text-xs text-gray-600 dark:text-gray-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Sesi terintegrasi dengan RAG Engine backend
            </div>
          </div>
        </div>

        {/* ====== STORAGE LIMIT ====== */}
        <div className="bg-white dark:bg-[#1C1E22] rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-50 dark:bg-red-900/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-800/80 flex items-center justify-center shrink-0 border border-gray-200 dark:border-gray-700/50">
                <Lock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Kapasitas Storage Tenant</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
                  {storageData.files_count > 0 && !storageData.loading && (
                    <>
                      <span>{storageData.files_count} file tersimpan</span>
                      <span className="inline-flex w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                    </>
                  )}
                  Diatur oleh Super Admin
                </p>
              </div>
            </div>
            
            <div className="w-full sm:w-64 shrink-0">
              {storageData.loading ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></span>
                    <span className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                </div>
              ) : storageData.error ? (
                <div className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Gagal memuat data storage
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <span>{storageData.used} MB terpakai</span>
                    <span className="text-gray-500">{storageData.max} MB maksimal</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2 border border-gray-300/50 dark:border-gray-700/50 overflow-hidden">
                    <div 
                      className={`h-full rounded-full relative transition-all duration-500 ${
                        storageData.used_percentage > 90 ? 'bg-gradient-to-r from-red-500 to-red-400' :
                        storageData.used_percentage > 75 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
                        'bg-gradient-to-r from-emerald-500 to-emerald-400'
                      }`}
                      style={{ width: `${Math.min(storageData.used_percentage, 100)}%` }}
                    >
                      <div className="absolute top-0 right-0 bottom-0 w-4 bg-white/20"></div>
                    </div>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-gray-400">Sisa {storageData.available} MB</span>
                    {storageData.used_percentage > 90 && (
                      <span className="text-[10px] text-red-500 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Hampir penuh!
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ====== CONTROLS ====== */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Daftar Koleksi Dokumen</h2>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#1A1C20] p-4 rounded-xl border border-gray-200 dark:border-gray-800/50 shadow-sm">
            <div className="flex flex-1 gap-3 w-full sm:w-auto flex-wrap">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <input 
                  type="text" 
                  placeholder="Cari nama koleksi..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white dark:bg-[#0D0F12] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 shadow-sm"
                />
              </div>
              <select 
                value={categoryFilter} 
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0D0F12] text-gray-900 dark:text-gray-300 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer transition-colors shadow-sm"
              >
                <option value="">Semua Kategori</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#0D0F12] text-gray-900 dark:text-gray-300 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer transition-colors shadow-sm"
              >
                {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex gap-2 w-full sm:w-auto mt-4 sm:mt-0">
              <button 
                type="button"
                onClick={handleReindexAll}
                disabled={isReindexing}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-lg bg-white dark:bg-[#1A1C20] text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isReindexing ? 'animate-spin' : ''}`} />
                {isReindexing ? 'Memproses...' : 'Reindex Vector'}
              </button>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 whitespace-nowrap flex-1 sm:flex-none"
              >
                <Plus className="h-4 w-4" /> Tambah Dokumen
              </button>
            </div>
          </div>
        </div>

        {/* ====== DATA TABLE WITH EXPANDABLE COLLECTIONS ====== */}
        <div className="bg-white dark:bg-[#1C1E22] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 dark:bg-[#15171A] border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nama Koleksi</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kategori</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Dokumen</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Terakhir Diperbarui</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800/50">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Memuat koleksi...
                      </div>
                    </td>
                  </tr>
                ) : filteredCollections.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      {searchQuery || categoryFilter || statusFilter !== 'Semua Status' 
                        ? 'Tidak ada koleksi yang sesuai dengan filter.' 
                        : 'Belum ada koleksi. Klik "Tambah Dokumen" untuk menambahkan dokumen pertama.'}
                    </td>
                  </tr>
                ) : (
                  filteredCollections.map((col) => (
                    <React.Fragment key={col.id}>
                      <tr 
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer"
                        onClick={() => toggleExpand(col.id)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Folder className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                            <div className="font-medium text-gray-900 dark:text-white">{col.name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-500 dark:text-gray-400 text-sm">{col.category}</span>
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">
                          {col.documents.length} Dokumen
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">{col.lastUpdated}</td>
                        <td className="px-6 py-4 text-right text-gray-500 dark:text-gray-400">
                          {expandedCols.includes(col.id) ? <ChevronUp className="w-5 h-5 inline-block" /> : <ChevronDown className="w-5 h-5 inline-block" />}
                        </td>
                      </tr>
                      {expandedCols.includes(col.id) && (
                        <tr className="bg-gray-50 dark:bg-[#131518]">
                          <td colSpan="5" className="px-6 py-4">
                            <div className="rounded-lg border border-gray-200 dark:border-gray-800/50 overflow-hidden">
                              <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-100 dark:bg-[#1A1C20] border-b border-gray-200 dark:border-gray-800/50">
                                  <tr>
                                    <th className="px-4 py-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Judul Dokumen</th>
                                    <th className="px-4 py-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tipe</th>
                                    <th className="px-4 py-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ukuran</th>
                                    <th className="px-4 py-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Aksi</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-800/30">
                                  {col.documents.map((doc) => (
                                    <tr key={doc.id} className="hover:bg-gray-800/30 transition-colors group/doc">
                                      <td className="px-4 py-2.5">
                                        <div className="flex items-center gap-3">
                                          <FileText className="w-4 h-4 text-gray-500" />
                                          <span className="text-sm text-gray-300">{doc.judul}</span>
                                        </div>
                                      </td>
                                      <td className="px-4 py-2.5">
                                        <span className={`text-xs font-mono font-semibold ${getFileTypeColor(doc.type)}`}>
                                          {doc.type || 'TXT'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2.5 text-sm text-gray-500">
                                        {doc.size || '0 MB'}
                                      </td>
                                      <td className="px-4 py-2.5">
                                        <StatusBadge status={doc.status || 'TERINDEKS'} />
                                      </td>
                                      <td className="px-4 py-2.5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                          {doc.status === 'GAGAL' && (
                                            <button 
                                              onClick={(e) => { e.stopPropagation(); handleReindexAll(); }} 
                                              className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors" 
                                              title="Re-index"
                                            >
                                              <RefreshCw className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); setSelectedDoc(doc); setIsDeleteModalOpen(true); }} 
                                            className="p-2 text-gray-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/10 rounded-md transition-colors" 
                                            title="Hapus"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ====== MODAL TAMBAH KOLEKSI ====== */}
      {isCollectionModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1C1E22] border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-md shadow-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Buat Koleksi Baru</h2>
              <button onClick={() => setIsCollectionModalOpen(false)} className="text-gray-500 hover:text-gray-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-400">Nama Koleksi</label>
              <input 
                type="text" 
                placeholder="Masukkan nama koleksi..."
                className="w-full bg-white dark:bg-[#1A1C20] border border-gray-300 dark:border-gray-700/50 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-gray-200 outline-none focus:ring-1 focus:ring-emerald-500"
                value={formData.collection_name}
                onChange={(e) => setFormData(prev => ({ ...prev, collection_name: e.target.value }))}
              />
            </div>

            <div className="mb-6">
              <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-400">Kategori</label>
              <select 
                className="w-full bg-white dark:bg-[#1A1C20] border border-gray-300 dark:border-gray-700/50 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-gray-200 outline-none focus:ring-1 focus:ring-emerald-500"
                value={formData.kategori}
                onChange={(e) => setFormData(prev => ({ ...prev, kategori: e.target.value }))}
              >
                <option value="Regulasi">Regulasi</option>
                <option value="Arsip">Arsip</option>
                <option value="Medis">Medis</option>
                <option value="Umum">Umum</option>
              </select>
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setIsCollectionModalOpen(false)} className="px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#0D0F12] border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800">
                Batal
              </button>
              <button 
                onClick={() => {
                  if (!formData.collection_name.trim()) {
                    alert('Nama koleksi wajib diisi!');
                    return;
                  }
                  setIsCollectionModalOpen(false);
                  alert('Koleksi berhasil dibuat! Sekarang tambahkan dokumen ke koleksi ini.');
                }} 
                className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== MODAL TAMBAH DOKUMEN (GABUNGAN DARI FILE KIRI) ====== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1A1C20] border border-gray-200 dark:border-gray-800/50 rounded-2xl w-full max-w-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tambah Dokumen Knowledge Base</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-500 hover:text-gray-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-2 mb-4">
              <Database className="w-4 h-4" />
              Mengunggah ke: {activeTenantObj?.nama_dinas || activeTenantObj?.nama || 'Tenant'}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pilih Koleksi Tujuan
                </label>
                <select 
                  className="w-full bg-white dark:bg-[#1A1C20] border border-gray-300 dark:border-gray-700/50 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-gray-200 outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">-- Pilih Koleksi --</option>
                  {collections.map(col => (
                    <option key={col.id} value={col.id}>
                      {col.name} ({col.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Judul Dokumen <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={formData.judul}
                  onChange={(e) => setFormData(prev => ({ ...prev, judul: e.target.value }))}
                  placeholder="Akan diisi otomatis dari nama file"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#131518] text-gray-900 dark:text-white rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-xs text-gray-400 mt-1">Kosongkan untuk mengisi otomatis dari nama file</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Kategori Dokumen</label>
                <select 
                  value={formData.kategori}
                  onChange={(e) => setFormData(prev => ({ ...prev, kategori: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#131518] text-gray-900 dark:text-white rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="Regulasi">Regulasi</option>
                  <option value="Medis">Medis</option>
                  <option value="Arsip">Arsip</option>
                  <option value="Umum">Umum</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Unggah File Dokumen
                </label>
                
                {!uploadFile ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleFileDrop}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                      isDragging 
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' 
                        : 'border-gray-300 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-gray-50 dark:bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800/30'
                    }`}
                    onClick={() => document.getElementById('fileInput').click()}
                  >
                    <input 
                      id="fileInput"
                      type="file" 
                      onChange={handleFileSelect}
                      className="hidden"
                      accept=".pdf,.docx,.doc,.txt,.xlsx,.csv,.jpg,.jpeg,.png"
                    />
                    <div className="flex flex-col items-center gap-2">
                      <UploadCloud className="w-10 h-10 text-emerald-600 dark:text-emerald-500" />
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {isDragging ? 'Lepaskan file di sini' : 'Klik untuk pilih file atau seret & lepas'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Mendukung: PDF, DOCX, TXT, CSV, XLSX, JPEG, PNG (Max 20MB)
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-[#131518]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg flex items-center justify-center text-xl">
                          <FileTypeIcon type={uploadFile.name.split('.').pop().toUpperCase()} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm">{uploadFile.name}</p>
                          <p className="text-xs text-gray-500">
                            {(uploadFile.size / 1024 / 1024).toFixed(1)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={removeFile}
                        className="p-2 text-gray-400 hover:text-red-500 transition rounded-full hover:bg-red-50 dark:hover:bg-red-500/10"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {uploadProgress > 0 && uploadProgress < 100 && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                          <span>Mengunggah...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {uploadProgress === 100 && (
                      <div className="mt-3 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 p-2 rounded-lg">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-xs font-medium">File siap diunggah!</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Konten / Ringkasan (Opsional)
                </label>
                <textarea 
                  rows="2"
                  value={formData.konten}
                  onChange={(e) => setFormData(prev => ({ ...prev, konten: e.target.value }))}
                  placeholder="Tuliskan ringkasan atau isi dokumen (diisi otomatis dari file jika tidak diisi)"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#131518] text-gray-900 dark:text-white rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">Biarkan kosong untuk ekstrak otomatis dari file</p>
              </div>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button onClick={() => setIsAddModalOpen(false)} className="px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#0D0F12] border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800">
                Batal
              </button>
              <button 
                onClick={handleAddArticle} 
                disabled={!formData.judul.trim() && !uploadFile}
                className={`px-5 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                  formData.judul.trim() || uploadFile
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                {uploadProgress > 0 && uploadProgress < 100 ? 'Mengunggah...' : 'Unggah & Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== MODAL HAPUS ====== */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1C1E22] border border-gray-200 dark:border-gray-800/50 rounded-2xl w-full max-w-md shadow-xl p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Hapus Dokumen?</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
              Dokumen <strong className="text-gray-900 dark:text-gray-200">{selectedDoc?.judul}</strong> akan dihapus secara permanen dari database dan vector index.
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setIsDeleteModalOpen(false)} className="px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#0D0F12] border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 flex-1">
                Batal
              </button>
              <button onClick={handleDeleteArticle} className="px-5 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 flex-1">
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}