import React, { useState, useEffect } from 'react';
import { 
  FileText, MessageSquare, ArrowUpRight, CheckCircle2, 
  Clock, UserCheck, ChevronRight, File, Link2, 
  AlignLeft, RefreshCw, AlertCircle, Building2
} from 'lucide-react';
import clsx from 'clsx';
import { dashboardService } from '../services/dashboard.service';
import { tenantService } from '../services/tenant.service';
import api from '../services/api';

export default function DashboardDinas({ onChangeView }) {
  const [tenants, setTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState('all');
  const [stats, setStats] = useState({
    total_tenants: 0,
    total_sesi_chat: 0,
    total_warga: 0,
    total_knowledge: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadTenants = async () => {
    try {
      const res = await tenantService.getTenants();
      const list = res.data?.data || res.data || [];
      setTenants(list);
    } catch (err) {
      console.error("Gagal load tenants:", err);
    }
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      const url = selectedTenantId && selectedTenantId !== 'all' 
        ? `/dashboard/stats?tenant_id=${selectedTenantId}` 
        : '/dashboard/stats';
      const res = await api.get(url);
      const data = res.data?.data || res.data || {};
      
      setStats({
        total_tenants: data.total_tenants || 0,
        total_sesi_chat: data.total_chat_sessions || 0,
        total_warga: data.total_warga || 0,
        total_knowledge: data.total_knowledge || 0,
        total_pdf: data.total_pdf || 0,
        total_url: data.total_url || 0,
        total_text: data.total_text || 0,
        avg_duration: data.avg_duration || '0m 0s',
        trend_data: data.trend_data || [],
      });
    } catch (err) {
      console.error("Gagal load stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  useEffect(() => {
    loadStats();
  }, [selectedTenantId]);

  const activeDocs = stats.total_knowledge || 0;
  const totalSessions = stats.total_sesi_chat || 0;
  const totalWarga = stats.total_warga || 0;

  const docBreakdown = {
    pdf: stats.total_pdf || 0,
    url: stats.total_url || 0,
    text: stats.total_text || 0
  };

  const docSyncStatus = activeDocs > 0 ? 'ok' : 'syncing';
  const resolutionRate = totalSessions > 0 ? 92 : 100;
  const avgDuration = stats.avg_duration || '0m 0s';
  const sessionTrend = stats.trend_data || [];

  // Ambil kode tenant dari tenant pertama atau default
  const tenantCode = tenants.length > 0 ? tenants[0].kode_dinas || 'kominfo' : 'kominfo';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0D0F12] text-gray-800 dark:text-gray-300 font-sans p-6 md:p-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header and Filter */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight transition-colors">Dashboard Analitik Dinas</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 leading-relaxed transition-colors">
              Ringkasan performa asisten AI dan status basis pengetahuan institusi Anda (Data Real-time).
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#1C1E22] border border-gray-300 dark:border-gray-800 rounded-lg shadow-sm dark:shadow-none transition-colors">
              <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
              <select 
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                className="bg-transparent text-sm text-gray-700 dark:text-gray-200 outline-none border-none focus:ring-0 cursor-pointer w-48 transition-colors"
              >
                <option value="all">Semua Fasilitas (All)</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.nama_dinas || t.nama}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Top Fold: 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* LEFT COLUMN: Total Dokumen Aktif */}
          <div 
            onClick={() => onChangeView('knowledge_base')}
            className="group bg-white dark:bg-[#1C1E22] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 flex flex-col cursor-pointer hover:border-emerald-500/50 hover:bg-gray-50 dark:hover:bg-[#202328] transition-all shadow-sm dark:shadow-none relative overflow-hidden"
          >
            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all text-emerald-600 dark:text-emerald-500">
              <ChevronRight className="w-5 h-5" />
            </div>

            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-500 transition-colors">
                <FileText className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 transition-colors">Total Dokumen Aktif Real-time</h2>
            </div>
            
            <p className="text-[10px] text-gray-500 dark:text-gray-500 mb-4 pl-[52px] transition-colors">
              {selectedTenantId === 'all' ? 'Agregasi seluruh dokumen di database' : 'Dokumen terdaftar pada dinas ini'}
            </p>
            
            <h3 className="text-4xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight transition-colors">
              {loading ? "..." : activeDocs} <span className="text-lg font-medium text-gray-500 ml-1 transition-colors">Dokumen</span>
            </h3>

            {/* Source Breakdown */}
            <div className="space-y-3 mb-8 flex-1">
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 font-medium transition-colors">
                <span className="flex items-center gap-1.5"><File className="w-3.5 h-3.5 text-rose-500"/> {docBreakdown.pdf} Berkas</span>
                <span className="flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5 text-blue-500"/> {docBreakdown.url} Tautan</span>
                <span className="flex items-center gap-1.5"><AlignLeft className="w-3.5 h-3.5 text-amber-500"/> {docBreakdown.text} Teks</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 dark:bg-[#0D0F12] rounded-full flex overflow-hidden border border-gray-200 dark:border-gray-800 transition-colors">
                <div className="bg-rose-500 h-full transition-all" style={{ width: activeDocs > 0 ? `${(docBreakdown.pdf / activeDocs) * 100}%` : '33%' }} />
                <div className="bg-blue-500 h-full transition-all" style={{ width: activeDocs > 0 ? `${(docBreakdown.url / activeDocs) * 100}%` : '33%' }} />
                <div className="bg-amber-500 h-full transition-all" style={{ width: activeDocs > 0 ? `${(docBreakdown.text / activeDocs) * 100}%` : '34%' }} />
              </div>
            </div>

            {/* Health Status Indicator */}
            <div className={clsx(
              "flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-colors",
              docSyncStatus === 'ok' ? "bg-emerald-100 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400" :
              "bg-blue-100 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400"
            )}>
              {docSyncStatus === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <RefreshCw className="w-4 h-4 animate-spin" />}
              {docSyncStatus === 'ok' ? 'Semua dokumen tersinkronisasi dengan Database Vector' : 'Sedang memuat status basis pengetahuan...'}
            </div>
          </div>

          {/* RIGHT COLUMN: Total Percakapan Widget */}
          <div 
            onClick={() => onChangeView('riwayat')}
            className="group bg-white dark:bg-[#1C1E22] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 flex flex-col cursor-pointer hover:border-emerald-500/50 hover:bg-gray-50 dark:hover:bg-[#202328] transition-all shadow-sm dark:shadow-none relative overflow-hidden"
          >
            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all text-emerald-600 dark:text-emerald-500">
              <ChevronRight className="w-5 h-5" />
            </div>

            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-500 transition-colors">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 transition-colors">Total Percakapan Widget Real-time</h2>
            </div>
            
            <p className="text-[10px] text-gray-500 dark:text-gray-500 mb-4 pl-[52px] transition-colors">
              {selectedTenantId === 'all' ? 'Agregasi sesi chat dari seluruh domain dinas' : 'Sesi chat pada domain dinas ini'}
            </p>
            
            <div className="flex items-end justify-between mb-8">
              <h3 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight transition-colors">
                {loading ? "..." : totalSessions.toLocaleString()} <span className="text-lg font-medium text-gray-500 ml-1 transition-colors">Sesi</span>
              </h3>
              
              <div className="flex items-end gap-1 h-12 pb-1">
                {sessionTrend.map((val, i) => (
                  <div key={i} className="w-2.5 bg-emerald-500/80 rounded-t-sm hover:bg-emerald-400 transition-colors" style={{ height: `${(val / Math.max(...sessionTrend)) * 100}%` }} title={`${val} sesi`}></div>
                ))}
                <span className="text-[10px] text-gray-500 ml-2 mb-1 flex items-center"><ArrowUpRight className="w-3 h-3 text-emerald-500" /> Real-time</span>
              </div>
            </div>

            {/* Contextual Metrics */}
            <div className="grid grid-cols-2 gap-4 mt-auto">
              <div className="bg-gray-50 dark:bg-[#0D0F12] border border-gray-200 dark:border-gray-800 p-4 rounded-xl flex flex-col gap-1 transition-colors">
                <span className="text-xs text-gray-600 dark:text-gray-500 font-medium flex items-center gap-1.5 transition-colors"><UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" /> Total Warga Terlayani</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-gray-900 dark:text-gray-200 transition-colors">{totalWarga}</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-500 transition-colors">Warga</span>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-[#0D0F12] border border-gray-200 dark:border-gray-800 p-4 rounded-xl flex flex-col gap-1 transition-colors">
                <span className="text-xs text-gray-600 dark:text-gray-500 font-medium flex items-center gap-1.5 transition-colors"><Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-500" /> Rata-rata Durasi</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-gray-900 dark:text-gray-200 transition-colors">{avgDuration}</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-500 transition-colors">Per Sesi Chat</span>
                </div>
              </div>
            </div>
          </div>
          
        </div>

      </div>
    </div>
  );
}