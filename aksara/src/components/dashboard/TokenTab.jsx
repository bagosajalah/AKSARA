import React, { useState, useEffect } from 'react';
import { MessageSquare, Zap, Target, Loader2 } from 'lucide-react';
import api from '../../services/api';

export default function TokenTab() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [totalSessions, setTotalSessions] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);
  const [avgTokensPerChat, setAvgTokensPerChat] = useState(0);

  const [dateFilter, setDateFilter] = useState('all');
  const [tenantFilter, setTenantFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [tenants, setTenants] = useState([]);

  const loadTenants = async () => {
    try {
      const res = await api.get('/tenants');
      const data = res.data?.data || res.data || [];
      setTenants(data);
    } catch (err) {
      console.error('Gagal load tenants:', err);
    }
  };

  const loadTokens = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (dateFilter !== 'all') params.period = dateFilter;
      if (tenantFilter !== 'all') params.tenant_id = tenantFilter;
      if (typeFilter !== 'all') params.type = typeFilter;

      console.log('Loading tokens with params:', params);

      const res = await api.get('/usage/tokens', { params });
      const data = res.data?.data || res.data || [];

      const transformed = data.map(item => ({
        id: item.id || Math.random().toString(36).substring(7),
        waktu: item.created_at ? new Date(item.created_at).toLocaleString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : '-',
        tenant: item.tenant?.nama_dinas || item.tenant_name || 'Sistem',
        jenis: item.type || 'Chat Generation',
        prompt: item.prompt_tokens?.toLocaleString() || '0',
        completion: item.completion_tokens?.toLocaleString() || '0',
        total: (item.prompt_tokens || 0) + (item.completion_tokens || 0),
      }));

      setTokens(transformed);

      const totalPrompt = transformed.reduce((acc, t) => acc + parseInt(t.prompt.replace(/,/g, '') || 0), 0);
      const totalCompletion = transformed.reduce((acc, t) => acc + parseInt(t.completion.replace(/,/g, '') || 0), 0);
      const totalAll = totalPrompt + totalCompletion;

      setTotalSessions(transformed.length);
      setTotalTokens(totalAll);
      setAvgTokensPerChat(transformed.length > 0 ? Math.round(totalAll / transformed.length) : 0);

    } catch (err) {
      console.error('Gagal load token usage:', err);
      setError('Gagal memuat data penggunaan token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  useEffect(() => {
    loadTokens();
  }, [dateFilter, tenantFilter, typeFilter]);

  if (loading && tokens.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Memuat data penggunaan token...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* FILTERS */}
      <div className="flex flex-col sm:flex-row gap-4">
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-full sm:w-48 rounded-xl border border-gray-300 dark:border-gray-700/50 bg-white dark:bg-[#1A1C20] shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm py-2.5 px-3 outline-none text-gray-900 dark:text-gray-200 transition-colors"
        >
          <option value="today">Hari Ini</option>
          <option value="7days">7 Hari Terakhir</option>
          <option value="30days">30 Hari Terakhir</option>
          <option value="all">Semua Waktu</option>
        </select>

        <select
          value={tenantFilter}
          onChange={(e) => setTenantFilter(e.target.value)}
          className="w-full sm:w-64 rounded-xl border border-gray-300 dark:border-gray-700/50 bg-white dark:bg-[#1A1C20] shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm py-2.5 px-3 outline-none text-gray-900 dark:text-gray-200 transition-colors"
        >
          <option value="all">Semua Tenant</option>
          {tenants.map(t => (
            <option key={t.id} value={t.id}>{t.nama_dinas || t.name}</option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => {
            console.log('Type filter changed to:', e.target.value);
            setTypeFilter(e.target.value);
          }}
          className="w-full sm:w-48 rounded-xl border border-gray-300 dark:border-gray-700/50 bg-white dark:bg-[#1A1C20] shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm py-2.5 px-3 outline-none text-gray-900 dark:text-gray-200 transition-colors"
        >
          <option value="all">Semua Jenis</option>
          <option value="Chat Generation">Chat Generation</option>
          <option value="Embedding">Embedding</option>
          <option value="RAG">RAG</option>
        </select>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-700 dark:text-red-400 flex items-center gap-2">
          <span>{error}</span>
          <button onClick={loadTokens} className="ml-auto text-sm font-medium text-red-600 dark:text-red-400 hover:underline">
            Coba Lagi
          </button>
        </div>
      )}

      {/* SCORECARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#1A1C20] border border-gray-200 dark:border-gray-800/50 rounded-xl p-6 flex items-center space-x-4 shadow-sm">
          <div className="p-3 bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Sesi Chat</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
              {totalSessions.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1A1C20] border border-gray-200 dark:border-gray-800/50 rounded-xl p-6 flex items-center space-x-4 shadow-sm">
          <div className="p-3 bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Token Digunakan</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
              {totalTokens.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1A1C20] border border-gray-200 dark:border-gray-800/50 rounded-xl p-6 flex items-center space-x-4 shadow-sm">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Rata-rata Token / Chat</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
              {avgTokensPerChat.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white dark:bg-[#1A1C20] border border-gray-200 dark:border-gray-800/50 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800/50 bg-gray-50 dark:bg-[#0D0F12]">
          <h2 className="text-[15px] font-medium text-gray-900 dark:text-white">Riwayat Penggunaan LLM</h2>
          {!loading && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Menampilkan {tokens.length} entri
            </p>
          )}
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            </div>
          ) : tokens.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              Belum ada data penggunaan token.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800/50">
              <thead className="bg-gray-50 dark:bg-[#0D0F12]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Waktu</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tenant</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Jenis</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Prompt Tokens</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Completion Tokens</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">Total Tokens</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800/50">
                {tokens.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{row.waktu}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{row.tenant}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                        row.jenis === 'Chat Generation' || row.jenis === 'Chat' ? 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400' :
                        row.jenis === 'Embedding' ? 'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400' :
                        'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      }`}>
                        {row.jenis === 'Chat' ? 'Chat Generation' : row.jenis}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">{row.prompt}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">{row.completion}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white text-right">{row.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}