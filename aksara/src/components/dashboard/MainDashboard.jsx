import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  MessageSquare, 
  HeartHandshake, 
  ChevronDown,
  ArrowRight,
  X,
  Database,
  Users,
  FileText,
  Activity
} from 'lucide-react';
import { 
  LineChart, Line, 
  BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import api from '../../services/api';
import { dashboardService } from '../../services/dashboard.service';

// Fungsi untuk mengambil data user dari localStorage
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

export default function MainDashboard({ onViewLogs }) {
  const [dateRange, setDateRange] = useState('Today');
  const [selectedDinas, setSelectedDinas] = useState('All');
  const [isHighlighting, setIsHighlighting] = useState(false);
  const [drillDownDinas, setDrillDownDinas] = useState(null);
  const [selectedTenantDetail, setSelectedTenantDetail] = useState(null);

  // ========== DATA DARI API ==========
  const [tenants, setTenants] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  // Data untuk chart dan top dinas
  const [liveDinasData, setLiveDinasData] = useState({});
  const [topDinasData, setTopDinasData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [chatSessions, setChatSessions] = useState(0);
  const [satisfaction, setSatisfaction] = useState(0);
  
  // STATE UNTUK DATA REAL
  const [totalWarga, setTotalWarga] = useState(0);
  const [totalKnowledge, setTotalKnowledge] = useState(0);
  
  // STATE UNTUK DASHBOARD STATS REAL
  const [dashboardStats, setDashboardStats] = useState(null);

  const userName = getUserName();

  // ========== LOAD DATA ==========
  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Ambil semua data sekaligus (parallel)
      const [tenantsRes, usersRes, wargaRes, knowledgeRes, statsRes, trendRes] = await Promise.all([
        api.get('/tenants'),
        api.get('/users'),
        api.get('/warga'),
        api.get('/knowledge'),
        api.get('/dashboard/stats'),
        api.get('/dashboard/trends?days=7'),
      ]);

      // ========== PROSES DASHBOARD STATS (REAL) ==========
      const statsData = statsRes.data?.data || statsRes.data || {};
      setDashboardStats(statsData);
      
      // SET CHAT SESSIONS & SATISFACTION DARI API REAL
      setChatSessions(statsData.total_chat_sessions || 0);
      setSatisfaction(statsData.satisfaction_rate || 96.5);

      // ========== PROSES TREND DATA (REAL) ==========
      const trendDataReal = trendRes.data?.data?.trends || trendRes.data?.trends || [];
      if (trendDataReal.length > 0) {
        setTrendData(trendDataReal);
      } else {
        const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
        const fallbackTrend = days.map(day => ({
          name: day,
          interactions: 0,
        }));
        setTrendData(fallbackTrend);
      }

      // ========== PROSES TENANT ==========
      const rawTenants = tenantsRes.data?.data || tenantsRes.data || [];
      const transformedTenants = rawTenants.map(t => ({
        ...t,
        nama_dinas: t.nama_dinas || t.nama,
        kode_dinas: t.kode_dinas || t.kode,
        totalTenant: t.websites?.length || 0,
        tenants: t.websites || [],
      }));
      setTenants(transformedTenants);

      // ========== PROSES ADMIN ==========
      const rawAdmins = usersRes.data?.data || usersRes.data || [];
      const adminList = rawAdmins.filter(u => u.role === 'admin_dinas' || u.role === 'super_admin');
      setAdmins(adminList);

      // ========== TOTAL WARGA ==========
      const rawWarga = wargaRes.data?.data || wargaRes.data || [];
      const wargaCount = Array.isArray(rawWarga) ? rawWarga.length : 0;
      setTotalWarga(wargaCount);

      // ========== TOTAL KNOWLEDGE ==========
      const rawKnowledge = knowledgeRes.data?.data || knowledgeRes.data || [];
      const knowledgeCount = Array.isArray(rawKnowledge) ? rawKnowledge.length : 0;
      setTotalKnowledge(knowledgeCount);

      // ========== TOP DINAS (PAKE DATA REAL) ==========
      let topDinas = [];
      if (statsData.top_dinas && statsData.top_dinas.length > 0) {
        topDinas = statsData.top_dinas.map(d => ({
          name: d.name || d.nama_dinas || 'Unknown',
          chats: d.interactions || d.total_sesi_chat || 0,
          isActive: d.status === 'aktif' || d.status === 'Active',
        }));
      } else {
        // Fallback dari tenant
        topDinas = transformedTenants
          .map(t => ({
            name: t.nama_dinas || 'Unknown',
            chats: t.websites?.length || 0,
            isActive: t.status === 'Active' || t.status === 'aktif',
          }))
          .sort((a, b) => b.chats - a.chats);
      }
      setTopDinasData(topDinas.slice(0, 5));

      // ========== LIVE DINAS DATA ==========
      const dinasData = {};
      transformedTenants.forEach(t => {
        const key = t.kode_dinas || t.id;
        dinasData[key] = (t.websites || []).map(w => ({
          name: w.nama_website || w.nama || 'Unknown',
          domain: w.url || w.domain || '',
          activeUsers: w.active_users || w.pengguna_aktif || 0,
          growth: w.growth || w.pertumbuhan || 0,
          status: w.status_sync || w.status || 'Active',
        }));
      });
      setLiveDinasData(dinasData);

    } catch (err) {
      console.error('Gagal memuat dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // ========== HANDLERS ==========
  const handleBarClick = (data) => {
    if (!drillDownDinas && data.name) {
      setDrillDownDinas(data.name);
    }
  };

  useEffect(() => {
    setIsHighlighting(true);
    const timer = setTimeout(() => setIsHighlighting(false), 500);
    return () => clearTimeout(timer);
  }, [selectedDinas]);

  const getActiveTenantsCount = () => {
    if (selectedDinas === 'All') {
      return tenants.reduce((acc, t) => acc + (t.websites?.length || 0), 0);
    }
    const dinas = tenants.find(t => t.kode_dinas === selectedDinas || t.nama_dinas === selectedDinas);
    return dinas?.websites?.length || 0;
  };

  const getMetrics = () => {
    return {
      sessions: chatSessions.toLocaleString('en-US'),
      satisfaction: satisfaction.toFixed(1) + "%",
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Memuat data dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0D0F12] text-gray-800 dark:text-gray-300 font-sans p-6 md:p-8 flex flex-col gap-6 transition-colors duration-300">
      
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-1 transition-colors">Overview Dasbor</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">Pantau performa ekosistem Aksara dan aktivitas Tenant hari ini.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select 
              value={selectedDinas}
              onChange={(e) => {
                setSelectedDinas(e.target.value);
                setDrillDownDinas(null);
              }}
              className="appearance-none bg-white dark:bg-[#1C1E22] border border-gray-300 dark:border-white/10 text-gray-700 dark:text-white rounded-lg pl-4 pr-10 py-2 text-sm font-medium focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm dark:shadow-none"
            >
              <option value="All">Semua Dinas</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.kode_dinas || t.id}>
                  {t.nama_dinas}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-2.5 pointer-events-none" />
          </div>
          <div className="relative">
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="appearance-none bg-white dark:bg-[#1A1C20] border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 rounded-lg pl-4 pr-10 py-2 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-sm dark:shadow-none transition-colors"
            >
              <option value="Today">Today</option>
              <option value="7 Days">Last 7 Days</option>
              <option value="30 Days">Last 30 Days</option>
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-2.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 2. Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <KPICard 
          title="Total Active Tenants" 
          value={getActiveTenantsCount().toString()} 
          icon={Building2} 
          color="blue" 
        />
        <KPICard 
          title="Total Chat Sessions" 
          value={getMetrics().sessions} 
          icon={MessageSquare} 
          color="purple" 
        />
        <KPICard 
          title="Public Satisfaction Ratio" 
          value={getMetrics().satisfaction} 
          icon={HeartHandshake} 
          color="emerald" 
        />
        <KPICard 
          title="Total Admin" 
          value={admins.length.toString()} 
          icon={Users} 
          color="orange" 
          subtext={`${tenants.length} Dinas Terdaftar`}
        />
      </div>

      {/* Dynamic Tenant List for Selected Dinas */}
      {selectedDinas !== 'All' && liveDinasData[selectedDinas] && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {liveDinasData[selectedDinas].map((tenant, idx) => (
            <div 
              key={tenant.name + idx}
              onClick={() => setSelectedTenantDetail(tenant)}
              className={`bg-white dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-700/50 rounded-lg p-4 flex justify-between items-center transition-all duration-500 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#23262B] hover:border-gray-300 dark:hover:border-gray-600 shadow-sm dark:shadow-none ${isHighlighting ? 'brightness-105 dark:brightness-125 scale-[1.02]' : 'brightness-100 scale-100'}`}
            >
              <div>
                <p className="text-[13px] font-medium text-gray-800 dark:text-zinc-200">{tenant.name}</p>
                <p className="text-[11px] text-gray-500 dark:text-zinc-500 mt-0.5">{tenant.domain}</p>
              </div>
              <div className="text-right flex flex-col items-end">
                <p className="text-[15px] font-bold text-emerald-400">
                  {tenant.activeUsers}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Active Users</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Main Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <div className="lg:col-span-2 bg-white dark:bg-[#1C1E22] border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none rounded-3xl p-6 transition-colors">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wider mb-6 transition-colors">User Interaction Trends</h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-gray-200 dark:text-[#2A332E]" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dx={-10} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', background: '#1A231E', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}
                    itemStyle={{ color: '#00FF66' }}
                  />
                  <Line type="monotone" dataKey="interactions" stroke="#00FF66" strokeWidth={3} dot={{r: 4, fill: '#00FF66', strokeWidth: 2, stroke: '#151A17'}} activeDot={{r: 6, fill: '#00FF66'}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {selectedDinas === 'All' && (
            <div className="lg:col-span-2 bg-white dark:bg-[#1C1E22] border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none rounded-3xl p-6 flex flex-col transition-colors">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-[12px] font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wider transition-colors">
                    {drillDownDinas ? `Top 5 Tenants: ${drillDownDinas}` : 'Top 5 Dinas'}
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">By Total Chat Sessions</p>
                </div>
                {drillDownDinas && (
                  <button 
                    onClick={() => setDrillDownDinas(null)}
                    className="text-[10px] bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 px-2 py-1 rounded hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    Back to Dinas
                  </button>
                )}
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topDinasData} layout="vertical" margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-gray-200 dark:text-[#2A332E]" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#9CA3AF', fontSize: 11, fontWeight: 500}} 
                      width={150}
                      tickFormatter={(value) => value.length > 25 ? value.substring(0, 25) + '...' : value}
                    />
                    <Tooltip 
                      cursor={{fill: '#1A231E'}}
                      contentStyle={{ borderRadius: '12px', background: '#1A231E', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}
                      itemStyle={{ color: '#00FF66' }}
                    />
                    <Bar dataKey="chats" radius={[0, 4, 4, 0]} barSize={20} onClick={handleBarClick} cursor="pointer">
                      {topDinasData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.isActive === false ? '#3F3F46' : '#00FF66'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
      </div>

      {/* 4. Bottom Section: Mini Stats */}
      {selectedDinas === 'All' && (
        <div className="bg-white dark:bg-[#1C1E22] border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none rounded-3xl overflow-hidden mt-6 transition-colors">
          <div className="px-6 py-5 border-b border-gray-200 dark:border-white/5 flex justify-between items-center transition-colors">
            <h2 className="text-[15px] font-bold text-gray-900 dark:text-white uppercase tracking-wider transition-colors">Ringkasan Sistem</h2>
            <button 
              onClick={onViewLogs}
              className="text-sm font-medium text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 cursor-pointer flex items-center gap-1 transition-colors"
            >
              Lihat Detail
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-200 dark:divide-gray-800/50">
            <div className="p-6 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{tenants.length}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Total Dinas</p>
            </div>
            <div className="p-6 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{admins.length}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Total Admin</p>
            </div>
            <div className="p-6 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalWarga}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Data Warga</p>
            </div>
            <div className="p-6 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalKnowledge}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Knowledge Base</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Tenant Detail Modal */}
      {selectedTenantDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1C1E22] border border-gray-200 dark:border-gray-800 rounded-xl w-full max-w-md p-6 shadow-xl dark:shadow-2xl relative animate-in zoom-in-95 duration-200 transition-colors">
            <button 
              onClick={() => setSelectedTenantDetail(null)}
              className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white pr-8 transition-colors">
              {selectedTenantDetail.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 transition-colors">
              {selectedTenantDetail.domain}
            </p>
            
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-[#121315] border border-gray-200 dark:border-gray-800/50 rounded-lg p-4 transition-colors">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 transition-colors">Total Pengguna Aktif</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 transition-colors">
                  {selectedTenantDetail.activeUsers || 0}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-[#121315] border border-gray-200 dark:border-gray-800/50 rounded-lg p-4 transition-colors">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 transition-colors">Pertumbuhan</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-500 transition-colors">
                  +{selectedTenantDetail.growth || 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}

// Sub-component for KPI Cards
function KPICard({ title, value, icon: Icon, color, subtext }) {
  return (
    <div className="bg-white dark:bg-[#1A1C20] border border-gray-200 dark:border-gray-800/50 shadow-sm dark:shadow-none rounded-xl p-6 flex flex-col justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-default w-full">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
        <div className={`p-2.5 rounded-xl border ${color === 'orange' ? 'bg-orange-100 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20 text-orange-600 dark:text-orange-400' : color === 'blue' ? 'bg-blue-100 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400' : color === 'purple' ? 'bg-purple-100 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20 text-purple-600 dark:text-purple-400' : 'bg-emerald-100 dark:bg-[#10B981]/10 border-emerald-200 dark:border-[#10B981]/20 text-emerald-700 dark:text-[#00FF66]'}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div>
        <p className={`text-3xl font-bold text-gray-900 dark:text-white tracking-tight ${subtext ? 'mb-1' : ''}`}>{value}</p>
        {subtext && <p className="text-xs text-gray-500 font-medium">{subtext}</p>}
      </div>
    </div>
  );
}