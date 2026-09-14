import React, { useState, useEffect } from 'react';
import { Search, Users, ChevronDown, X, ThumbsUp, MessageSquare, CheckCircle2, Plus, Trash2, Edit } from 'lucide-react';
import clsx from 'clsx';
import { wargaService } from '../services/warga.service';
import api from '../services/api';

function DataWarga({ onChangeView }) {
  const [warga, setWarga] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState('Semua Fasilitas');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedTranscript, setSelectedTranscript] = useState(null);
  const [tenantsList, setTenantsList] = useState([]);
  const [chatSessionsList, setChatSessionsList] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    nama_lengkap: '',
    nik: '',
    alamat: '',
    kelurahan: '',
    status_kependudukan: 'Tetap'
  });

  // ========== LOAD TENANTS ==========
  const loadTenants = async () => {
    try {
      const res = await api.get('/tenants');
      const data = res.data?.data || res.data || [];
      setTenantsList(data);
    } catch (err) {
      console.error('Gagal load tenants:', err);
    }
  };

  // ========== LOAD DATA WARGA ==========
  const loadWarga = async () => {
    try {
      setLoading(true);
      const res = await wargaService.getWargaList();
      const rawData = res.data?.data || res.data || [];
      
      // Ambil data chat untuk hitung sesi & user aktif
      const chatRes = await api.get('/chat/sessions?limit=200');
      const chatData = chatRes.data?.data || chatRes.data || [];
      setChatSessionsList(chatData);
      
      // Hitung sesi & kumpulkan info per user
      const sesiCount = {};
      const userFacilityMap = {};
      const userLastActiveMap = {};
      const userEmailMap = {};

      chatData.forEach(s => {
        const userName = s.user_name;
        if (userName) {
          sesiCount[userName] = (sesiCount[userName] || 0) + 1;
          if (s.facility_name) userFacilityMap[userName] = s.facility_name;
          if (s.created_at) userLastActiveMap[userName] = s.created_at;
          if (s.user_email || s.email) userEmailMap[userName] = s.user_email || s.email;
        }
      });
      
      let transformed = [];

      if (rawData.length > 0) {
        transformed = rawData.map((w) => ({
          id: w.id,
          name: w.nama_lengkap || 'Warga',
          email: w.email || userEmailMap[w.nama_lengkap] || (w.nik ? `${w.nik}@aksara.ponorogo.go.id` : `${(w.nama_lengkap || 'warga').toLowerCase().replace(/\s/g, '.')}@aksara.ponorogo.go.id`),
          facility: w.tenant?.nama_dinas || w.tenant_name || 'Dinas Komunikasi dan Informatika',
          sessions: sesiCount[w.nama_lengkap] || 0,
          lastActive: w.updated_at ? new Date(w.updated_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Baru Saja',
          nik: w.nik || '',
          alamat: w.alamat || '',
          kelurahan: w.kelurahan || '',
          status_kependudukan: w.status_kependudukan || 'aktif',
        }));
      } else if (Object.keys(sesiCount).length > 0) {
        // Fallback: Jika tabel data_warga belum terisi, otomatis ambil dari unique user di Chat Sessions!
        transformed = Object.keys(sesiCount).map((name, idx) => {
          let emailFormatted = userEmailMap[name] || `${name.toLowerCase().replace(/\s/g, '.')}@aksara.ponorogo.go.id`;
          if (!userEmailMap[name]) {
            if (name.toLowerCase().includes('super admin')) {
              emailFormatted = 'superadmin@aksara.ponorogo.go.id';
            } else if (name.toLowerCase().includes('admin dinas')) {
              emailFormatted = 'admin.dinas@aksara.ponorogo.go.id';
            }
          }

          return {
            id: `chat-user-${idx}`,
            name: name,
            email: emailFormatted,
            facility: userFacilityMap[name] || 'Dinas Kesehatan',
            sessions: sesiCount[name] || 1,
            lastActive: userLastActiveMap[name] ? new Date(userLastActiveMap[name]).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Baru Saja',
            nik: '-',
            alamat: 'Kab. Ponorogo',
            kelurahan: '-',
            status_kependudukan: name.toLowerCase().includes('admin') ? 'Pengelola Sistem' : 'Masyarakat Umum',
          };
        });
      }

      setWarga(transformed);
    } catch (err) {
      console.error('Gagal memuat data warga:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
    loadWarga();
  }, []);

  // ========== FILTER ==========
  const filteredWarga = warga.filter(w => {
    const matchTenant = selectedTenant === 'Semua Fasilitas' || w.facility === selectedTenant;
    const matchSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        w.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchTenant && matchSearch;
  });

  // ========== MAX SESSIONS ==========
  const maxSessionsPerFacility = warga.reduce((acc, user) => {
    if (!acc[user.facility] || user.sessions > acc[user.facility]) {
      acc[user.facility] = user.sessions;
    }
    return acc;
  }, {});

  // ========== RENDER ==========
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0D0F12] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Memuat data warga...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0D0F12] text-gray-800 dark:text-gray-300 font-sans p-6 md:p-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight transition-colors">
              Data Warga & Pengguna
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 leading-relaxed max-w-3xl transition-colors">
              Kelola daftar masyarakat yang telah masuk (login) dan berinteraksi dengan layanan asisten AI.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 dark:text-gray-400 transition-colors">Pilih Fasilitas:</span>
            <div className="relative">
              <select
                value={selectedTenant}
                onChange={(e) => setSelectedTenant(e.target.value)}
                className="bg-white dark:bg-[#1C1E22] border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg pl-4 pr-10 py-2 appearance-none focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer transition-colors shadow-sm dark:shadow-none"
              >
                <option value="Semua Fasilitas">Semua Fasilitas</option>
                {tenantsList.map(t => (
                  <option key={t.id} value={t.nama_dinas}>{t.nama_dinas}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" />
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          {/* Search Filter */}
          <div className="bg-white dark:bg-[#1C1E22] p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex justify-between items-center shadow-sm dark:shadow-none transition-colors">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500 transition-colors" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama atau alamat email warga..." 
                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white dark:bg-[#0D0F12] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 shadow-sm dark:shadow-none"
              />
            </div>
          </div>

          {/* User Directory Table */}
          <div className="bg-white dark:bg-[#1C1E22] rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[600px] overflow-hidden shadow-sm dark:shadow-none transition-colors">
            <div className="overflow-y-auto overflow-x-auto">
              <table className="w-full text-left border-collapse relative">
                <thead className="bg-gray-50 dark:bg-[#1A1C20] border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10 transition-colors">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-colors">Nama & Email</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-colors">Fasilitas Interaksi</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-colors">Total Sesi</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-colors">Terakhir Aktif</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right transition-colors">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800/50 transition-colors">
                  {filteredWarga.length === 0 ? (
                     <tr>
                        <td colSpan="5" className="px-6 py-8 text-center text-gray-500 transition-colors">
                          Tidak ada data warga ditemukan.
                        </td>
                     </tr>
                  ) : (
                    filteredWarga.map((warga, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-500 font-bold flex-shrink-0 transition-colors">
                            {warga.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white transition-colors">{warga.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5 transition-colors">{warga.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 transition-colors">
                          {warga.facility}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors">{warga.sessions} Sesi</span>
                          {warga.sessions === maxSessionsPerFacility[warga.facility] && warga.sessions > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-200 dark:border-emerald-500/20 transition-colors">
                              Frequent User
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 transition-colors">
                        {warga.lastActive}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setSelectedUser(warga)}
                          className="px-3 py-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded border border-emerald-200 dark:border-emerald-500/20 transition-colors"
                        >
                          Lihat Riwayat
                        </button>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* Slideover Drawer: User History Details */}
      {selectedUser && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div 
            className="absolute inset-0 bg-gray-900/40 dark:bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedUser(null)}
          ></div>
          
          <div className="relative w-full max-w-md h-full bg-gray-50 dark:bg-[#131417] border-l border-gray-200 dark:border-gray-800 z-50 shadow-2xl flex flex-col animate-slide-in-right overflow-y-auto transition-colors">
            
            {/* Drawer Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-800/50 bg-white dark:bg-[#1C1E22] relative transition-colors">
              <button 
                onClick={() => setSelectedUser(null)}
                className="absolute top-6 right-6 text-gray-500 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white bg-gray-100 hover:bg-gray-200 dark:bg-gray-800/50 dark:hover:bg-gray-700 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex flex-col items-center text-center mt-2">
                <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-500 font-bold text-3xl mb-4 border border-emerald-100 dark:border-emerald-500/20 transition-colors">
                  {selectedUser.name.charAt(0)}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white transition-colors">{selectedUser.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 transition-colors">{selectedUser.email}</p>
                <div className="flex gap-2 mt-4 flex-wrap justify-center">
                  <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium rounded border border-gray-200 dark:border-gray-700 transition-colors">
                    {selectedUser.facility}
                  </span>
                  {selectedUser.sessions > 10 && (
                    <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider rounded border border-emerald-200 dark:border-emerald-500/20 transition-colors">
                      Frequent User
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Interaction Summary Cards */}
            {(() => {
              const userRealSessions = chatSessionsList.filter(s => s.user_name === selectedUser.name);
              const totalSesiUser = userRealSessions.length || selectedUser.sessions || 0;
              
              return (
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-white dark:bg-[#1C1E22] border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm dark:shadow-none transition-colors">
                      <MessageSquare className="w-5 h-5 text-blue-500 dark:text-blue-400 mb-2 transition-colors" />
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-1 transition-colors">Total Sesi</span>
                      <span className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">{totalSesiUser}</span>
                    </div>
                    <div className="bg-white dark:bg-[#1C1E22] border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm dark:shadow-none transition-colors">
                      <ThumbsUp className="w-5 h-5 text-emerald-500 dark:text-emerald-400 mb-2 transition-colors" />
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-1 transition-colors">Sentimen</span>
                      <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 transition-colors">Positif</span>
                    </div>
                  </div>

                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2 transition-colors">
                    <Search className="w-4 h-4 text-emerald-500" />
                    Riwayat Obrolan Terbaru
                  </h4>
                  
                  <div className="space-y-3">
                    {userRealSessions.length > 0 ? (
                      userRealSessions.map((session, idx) => (
                        <div key={session.id || idx} className="bg-white dark:bg-[#1C1E22] border border-gray-200 dark:border-gray-800 p-4 rounded-xl hover:border-emerald-500 dark:hover:border-gray-700 transition-colors group cursor-pointer shadow-sm dark:shadow-none">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 transition-colors">
                              {session.created_at ? new Date(session.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : selectedUser.lastActive}
                            </span>
                            <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border transition-colors ${
                              session.status === 'Selesai' ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' :
                              session.status === 'Terputus' ? 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-500/10 border-gray-200 dark:border-gray-500/20' :
                              'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20'
                            }`}>
                              <CheckCircle2 className="w-3 h-3" /> {session.status || 'Selesai'}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-200 mb-2 transition-colors">
                            {session.topic || 'Pertanyaan Layanan Informasi'}
                          </p>
                          <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                            <span className="font-mono text-[11px] text-gray-400">{session.session_code || 'SES-LIVE'}</span>
                            <button 
                              onClick={() => setSelectedTranscript(session)}
                              className="text-xs text-emerald-600 dark:text-emerald-500 font-medium hover:text-emerald-700 dark:hover:text-emerald-400 flex items-center gap-1 transition-colors"
                            >
                              Baca Transkrip &rarr;
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-white dark:bg-[#1C1E22] border border-gray-200 dark:border-gray-800 p-4 rounded-xl text-center text-xs text-gray-500">
                        Belum ada riwayat percakapan khusus untuk pengguna ini.
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal Detail Transkrip Percakapan */}
      {selectedTranscript && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1C1E22] border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-[#131518]">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-500" />
                  Transkrip: {selectedTranscript.topic || 'Sesi Chat'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5 font-mono">
                  {selectedTranscript.session_code || selectedTranscript.id} | {selectedTranscript.facility_name || selectedUser?.facility}
                </p>
              </div>
              <button 
                onClick={() => setSelectedTranscript(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Transkrip Pesan */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1 bg-gray-50/50 dark:bg-[#0D0F12]">
              {selectedTranscript.messages && selectedTranscript.messages.length > 0 ? (
                selectedTranscript.messages.map((msg, idx) => (
                  <div key={idx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className="text-[10px] text-gray-400 mb-1 px-1">
                      {msg.sender === 'user' ? (selectedUser?.name || 'Warga') : 'Asisten AI'} • {msg.time_str || ''}
                    </div>
                    <div className={`p-3 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-emerald-600 text-white rounded-tr-none'
                        : 'bg-white dark:bg-[#1C1E22] border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none shadow-sm'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-gray-500">
                  <MessageSquare className="w-8 h-8 text-gray-400 mx-auto mb-2 opacity-50" />
                  <p>Detail transkrip percakapan ini dapat diakses secara lengkap di menu <strong>Riwayat Interaksi</strong>.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1C1E22] flex justify-between items-center">
              {onChangeView && (
                <button
                  onClick={() => {
                    setSelectedTranscript(null);
                    setSelectedUser(null);
                    onChangeView('riwayat');
                  }}
                  className="text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline flex items-center gap-1"
                >
                  Buka di Riwayat Interaksi &rarr;
                </button>
              )}
              <button
                onClick={() => setSelectedTranscript(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ml-auto"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataWarga;