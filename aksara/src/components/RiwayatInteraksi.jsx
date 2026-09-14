import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, User, CheckCircle2, TriangleAlert, Minus, Search, ArrowUpRight, Filter, Smile, Frown, MessageSquare, ThumbsUp, ThumbsDown, Database, ArrowRight, ShieldAlert, Clock, X, Lock, ChevronDown, Calendar, TrendingUp, FileSearch, RefreshCw
} from 'lucide-react';
import { clsx } from 'clsx';
import { chatService } from '../services/chat.service';
import api from '../services/api';

export default function RiwayatInteraksi() {
  // ===== STATE =====
  const [activeTab, setActiveTab] = useState('log');
  const [feedbackFilter, setFeedbackFilter] = useState('Semua');
  const [statusFilter, setStatusFilter] = useState('Semua Status');
  const [searchInput, setSearchInput] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTenant, setSelectedTenant] = useState('Semua Fasilitas');
  const itemsPerPage = 20;

  const [logsList, setLogsList] = useState([]);
  const [reviewsList, setReviewsList] = useState([]);
  const [trendingList, setTrendingList] = useState([]);
  const [transcripts, setTranscripts] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [tenantsList, setTenantsList] = useState([]);

  // ===== PAGINATION =====
  const [totalSessions, setTotalSessions] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentSkip, setCurrentSkip] = useState(0);
  const pageSize = 50;

  // ===== REF UNTUK CEK FIRST LOAD =====
  const isFirstLoad = useRef(true);

  // ===== ANIMASI KEYWORDS =====
  const [animatedKeywords, setAnimatedKeywords] = useState([]);

  // ===== LOAD FACILITIES =====
  useEffect(() => {
    const loadFacilities = async () => {
      try {
        const res = await chatService.getSessions({ skip: 0, limit: 200 });
        const data = res.data?.data || res.data || [];
        
        const facilities = [...new Set(data.map(s => s.facility_name).filter(Boolean))];
        
        setTenantsList(facilities.map(f => ({ id: f, nama_dinas: f })));
      } catch (err) {
        console.error('Gagal load facilities:', err);
      }
    };
    loadFacilities();
  }, [logsList]);

  // ===== LOAD REAL DATA =====
  const loadRealData = async (reset = true) => {
    setIsLoading(true);
    try {
      const skip = reset ? 0 : currentSkip;
      
      const params = { skip, limit: pageSize };
      if (activeSearchQuery) params.search = activeSearchQuery;
      if (statusFilter && statusFilter !== 'Semua Status') params.status = statusFilter;
      
      if (selectedTenant && selectedTenant !== 'Semua Fasilitas') {

        const found = tenantsList.find(t => t.nama_dinas === selectedTenant);
        if (found) {
          params.facility_name = found.nama_dinas;
        } else {
          params.facility_name = selectedTenant;
        }
      }
      
      const sessionsRes = await chatService.getSessions(params);
      const sessionsData = sessionsRes.data?.data || sessionsRes.data || [];
      const pagination = sessionsRes.data?.pagination || { total: 0, next: null };
      
      setTotalSessions(pagination.total || 0);
      setHasMore(pagination.next !== null);
      setCurrentSkip(skip + pageSize);
      
      if (sessionsData.length > 0) {
        const mappedLogs = sessionsData.map(s => {
          let timeStr = '00:00';
          if (s.created_at) {
            const dt = new Date(s.created_at);
            timeStr = dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          }
          
          let durationStr = s.duration && s.duration !== '0m 00s' 
            ? s.duration 
            : '-';
          
          return {
            id: s.session_code || `SES-${String(s.id).slice(0, 4)}`,
            realId: s.id,
            date: new Date(s.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
            time: timeStr, 
            user: s.user_name || 'Warga Anonim',
            facility: s.facility_name || '-',
            duration: durationStr,
            topic: s.topic || 'Umum',
            status: s.status || 'Selesai',
            jailbreak: s.jailbreak || false,
            similarity_score: s.similarity_score !== undefined && s.similarity_score !== null ? s.similarity_score * 100 : 0
          };
        });
        
        if (reset) {
          setLogsList(mappedLogs);
        } else {
          setLogsList(prev => [...prev, ...mappedLogs]);
        }
        
        // Update transcripts
        const newMap = {};
        sessionsData.forEach(s => {
          if (s.messages && s.messages.length > 0) {
            newMap[s.session_code] = s.messages.map(m => ({
              sender: m.sender,
              text: m.text,
              time: m.time_str || '10:00 AM',
              isJailbreak: m.is_jailbreak || false
            }));
          }
        });
        setTranscripts(newMap);
      } else {
        if (reset) setLogsList([]);
      }

      // ===== LOAD REVIEWS =====
      try {
        const reviewsRes = await chatService.getReviews();
        
        const reviewsData = reviewsRes.data?.data || reviewsRes.data || [];
        
        if (reviewsData.length > 0) {
          const mapped = reviewsData.map(r => ({
            id: r.review_code || `REV-${String(r.id).slice(0, 4)}`,
            sessionId: r.session_id ? `SES-${String(r.session_id).slice(0, 4)}` : 'SES-0912',
            user: r.user_name || 'Warga Anonim',
            facility: r.facility_name || '-',
            isPositive: r.is_positive !== undefined ? r.is_positive : true,
            text: r.text || 'Tidak ada ulasan'
          }));
          setReviewsList(mapped);
        } else {
          setReviewsList([]);
        }
      } catch (err) {
        console.error('Error load reviews:', err);
        setReviewsList([]);
      }

      // ===== LOAD TRENDING =====
      try {
        const trendingData = await chatService.getTrendingTopics();
        if (trendingData && trendingData.length > 0) {
          setTrendingList(trendingData);
          const sizes = ['text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl'];
          const colors = ['text-emerald-400', 'text-emerald-500', 'text-amber-400', 'text-blue-400', 'text-purple-400', 'text-white'];
          const weights = ['font-normal', 'font-medium', 'font-semibold', 'font-bold'];
          const initialKeywords = trendingData.map((t, idx) => ({
            id: idx,
            text: t.topic || t.name,
            size: sizes[idx % sizes.length],
            color: colors[idx % colors.length],
            weight: weights[idx % weights.length],
          }));
          setAnimatedKeywords(initialKeywords);
        } else {
          setTrendingList([]);
          setAnimatedKeywords([]);
        }
      } catch (err) {
        setTrendingList([]);
        setAnimatedKeywords([]);
      }
      
    } catch (err) {
      console.error('Gagal mengambil data:', err);
      setLogsList([]);
      setReviewsList([]);
      setTrendingList([]);
    } finally {
      setIsLoading(false);
    }
  };

  // ===== LOAD MORE =====
  const loadMore = () => {
    if (!isLoading && hasMore) {
      loadRealData(false);
    }
  };

  // ===== EFFECTS =====
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    setCurrentSkip(0);
    loadRealData(true);
  }, [activeSearchQuery, statusFilter, selectedTenant]);

  useEffect(() => {
    loadRealData(true);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput.trim()) {
        setActiveSearchQuery(searchInput.trim());
      } else {
        setActiveSearchQuery('');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (activeTab !== 'tren') return;
    
    const sizes = ['text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl'];
    const colors = ['text-emerald-400', 'text-emerald-500', 'text-amber-400', 'text-amber-500', 'text-blue-400', 'text-blue-500', 'text-pink-400', 'text-purple-400', 'text-white', 'text-gray-300', 'text-gray-400'];
    const weights = ['font-normal', 'font-medium', 'font-semibold', 'font-bold'];

    const interval = setInterval(() => {
      setAnimatedKeywords(prev => {
        if (!prev || prev.length === 0) return prev;
        const next = [...prev];
        const count = Math.min(prev.length, Math.floor(Math.random() * 2) + 1); 
        for (let i = 0; i < count; i++) {
          const idx = Math.floor(Math.random() * next.length);
          next[idx] = {
            ...next[idx],
            size: sizes[Math.floor(Math.random() * sizes.length)],
            color: colors[Math.floor(Math.random() * colors.length)],
            weight: weights[Math.floor(Math.random() * weights.length)],
          };
        }
        return next;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [activeTab]);

  const [selectedSession, setSelectedSession] = useState(null);

  // ===== AUTO-REFRESH (UPDATE STATUS SETIAP 10 DETIK) =====
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'log') {
        console.log('Auto-refresh riwayat interaksi...');
        loadRealData(true);
      }
    }, 10000); // 10 detik

    return () => clearInterval(interval);
  }, [activeTab]);

    // ===== DRAG TO SCROLL =====
  useEffect(() => {
    const tableWrapper = document.querySelector('.overflow-x-auto');
    if (!tableWrapper) return;

    let isDown = false;
    let startX;
    let scrollLeft;

    const onMouseDown = (e) => {
      isDown = true;
      tableWrapper.style.cursor = 'grabbing';
      startX = e.pageX - tableWrapper.offsetLeft;
      scrollLeft = tableWrapper.scrollLeft;
    };

    const onMouseLeave = () => {
      isDown = false;
      tableWrapper.style.cursor = 'grab';
    };

    const onMouseUp = () => {
      isDown = false;
      tableWrapper.style.cursor = 'grab';
    };

    const onMouseMove = (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - tableWrapper.offsetLeft;
      const walk = (x - startX) * 1.5;
      tableWrapper.scrollLeft = scrollLeft - walk;
    };

    tableWrapper.addEventListener('mousedown', onMouseDown);
    tableWrapper.addEventListener('mouseleave', onMouseLeave);
    tableWrapper.addEventListener('mouseup', onMouseUp);
    tableWrapper.addEventListener('mousemove', onMouseMove);

    return () => {
      tableWrapper.removeEventListener('mousedown', onMouseDown);
      tableWrapper.removeEventListener('mouseleave', onMouseLeave);
      tableWrapper.removeEventListener('mouseup', onMouseUp);
      tableWrapper.removeEventListener('mousemove', onMouseMove);
    };
  }, []);
  
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Selesai':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="w-3.5 h-3.5" /> Selesai</span>;
      case 'Butuh Evaluasi':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20"><TriangleAlert className="w-3.5 h-3.5" /> Butuh Evaluasi</span>;
      case 'Terputus':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20"><Minus className="w-3.5 h-3.5" /> Terputus</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20">{status}</span>;
    }
  };

  const getSentimentBadge = (sentiment) => {
    switch(sentiment) {
      case 'Positif':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><Smile className="w-3.5 h-3.5" /> Positif</span>;
      case 'Negatif':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20"><Frown className="w-3.5 h-3.5" /> Komplain</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0D0F12] text-gray-900 dark:text-gray-300 font-sans p-6 md:p-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              Interaksi & Analitik
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 leading-relaxed max-w-3xl">
              Pantau log percakapan, evaluasi kepuasan publik, serta analisis topik yang paling sering ditanyakan ke asisten AI Anda.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setActiveTab('log')}
            className={clsx(
              "px-6 py-4 text-sm font-medium transition-all border-b-2",
              activeTab === 'log' ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-500 dark:hover:text-gray-300"
            )}
          >
            Log Percakapan
          </button>
          <button
            onClick={() => setActiveTab('evaluasi')}
            className={clsx(
              "px-6 py-4 text-sm font-medium transition-all border-b-2",
              activeTab === 'evaluasi' ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-500 dark:hover:text-gray-300"
            )}
          >
            Evaluasi Publik
          </button>
          <button
            onClick={() => setActiveTab('tren')}
            className={clsx(
              "px-6 py-4 text-sm font-medium transition-all border-b-2",
              activeTab === 'tren' ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-500 dark:hover:text-gray-300"
            )}
          >
            Tren & Topik
          </button>
        </div>

        {/* LOG PERCAKAPAN */}
        {activeTab === 'log' && (
          <div className="space-y-6 animate-fade-in">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-[#1C1E22] p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm dark:shadow-none transition-colors">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
              <input 
                type="text" 
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari ID Sesi atau Kata Kunci..." 
                className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all bg-white dark:bg-[#0D0F12] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
            <div className="flex gap-4 items-center">
              <div className="relative shrink-0">
                <select
                  value={selectedTenant}
                  onChange={(e) => setSelectedTenant(e.target.value)}
                  className="bg-white dark:bg-[#0D0F12] border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-300 outline-none focus:ring-1 focus:ring-emerald-500/50 appearance-none cursor-pointer pr-8 transition-colors h-full"
                  style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%239CA3AF%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M4%206l4%204%204-4%22%2F%3E%3C%2Fsvg%3E")', backgroundPosition: 'right 8px center', backgroundRepeat: 'no-repeat', backgroundSize: '16px' }}
                >
                  <option value="Semua Fasilitas">Semua Fasilitas</option>
                  {tenantsList.map(t => (
                    <option key={t.id} value={t.nama_dinas}>{t.nama_dinas}</option>
                  ))}
                </select>
              </div>
              <div className="relative shrink-0">
                <Filter className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-9 pr-8 py-2 bg-white dark:bg-[#0D0F12] border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-900 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors appearance-none cursor-pointer focus:outline-none focus:border-emerald-500"
                  style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%239CA3AF%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M4%206l4%204%204-4%22%2F%3E%3C%2Fsvg%3E")', backgroundPosition: 'right 8px center', backgroundRepeat: 'no-repeat', backgroundSize: '16px' }}
                >
                  <option value="Semua Status">Semua Status</option>
                  <option value="Selesai">Selesai</option>
                  <option value="Terputus">Terputus</option>
                  <option value="Butuh Evaluasi">Butuh Evaluasi</option>
                </select>
              </div>

              {/* ===== TOMBOL REFRESH ===== */}
              <button 
                onClick={() => loadRealData(true)}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 shadow-sm hover:shadow"
                title="Refresh data"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

            {/* Data Table */}
            {(() => {
              const filteredLogs = logsList.filter(log => {
              const matchesStatus = statusFilter === 'Semua Status' || log.status === statusFilter;
              const searchLower = activeSearchQuery.toLowerCase();
              const matchesSearch = activeSearchQuery === '' || 
                        log.user.toLowerCase().includes(searchLower) ||
                        log.id.toLowerCase().includes(searchLower) ||
                        log.topic.toLowerCase().includes(searchLower);
  
                let matchesFacility = true;
                if (selectedTenant !== 'Semua Fasilitas') {
                  const facilityClean = (log.facility || '').toLowerCase().trim();
                  const selectedClean = selectedTenant.toLowerCase().trim();
                  matchesFacility = facilityClean === selectedClean;
                }
                
                return matchesStatus && matchesSearch && matchesFacility;
              });
              
              const indexOfLastItem = currentPage * itemsPerPage;
              const indexOfFirstItem = indexOfLastItem - itemsPerPage;
              const currentItems = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);
              const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

              return (
                <div className="bg-white dark:bg-[#1C1E22] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col transition-colors">
                  <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
                    <table className="w-full text-left border-collapse min-w-[1200px]">
                      <thead className="bg-gray-50 dark:bg-[#15171A] border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10 transition-colors">
                        <tr>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID Sesi</th>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tanggal & Waktu</th>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nama Warga</th>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fasilitas</th>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Durasi</th>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Topik Utama</th>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Similaritas</th>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Jail Break</th>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800/50">
                        {currentItems.length > 0 ? (
                          currentItems.map(log => (
                            <tr 
                              key={log.id} 
                              onClick={() => setSelectedSession(log.id)}
                              className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group"
                            >
                              <td className="px-6 py-4 font-mono text-sm text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-500 dark:group-hover:text-emerald-300">{log.id}</td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col gap-1">
                                  <span className="text-gray-900 dark:text-white text-sm font-medium">{log.date}</span>
                                  <span className="text-gray-500 dark:text-gray-400 text-xs">{log.time}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="font-medium text-gray-900 dark:text-gray-200">{log.user}</span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 whitespace-nowrap">
                                  {log.facility}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400"><span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" /> {log.duration}</span></td>
                              <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200">{log.topic}</td>
                              <td className="px-6 py-4">{getStatusBadge(log.status)}</td>
                              <td className="px-6 py-4">
                                <span className={clsx(
                                  "inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-medium min-w-[50px]",
                                  log.similarity_score >= 70 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                  log.similarity_score >= 40 ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" :
                                  log.similarity_score >= 1 ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                                  "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                                )}>
                                  {log.similarity_score !== undefined && log.similarity_score !== null ? `${Math.round(log.similarity_score)}%` : '-'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {log.jailbreak ? (
                                  <span className="inline-flex items-center rounded-md bg-rose-100 dark:bg-rose-500/10 px-2 py-1 text-[11px] font-medium text-rose-700 dark:text-rose-400 ring-1 ring-inset ring-rose-200 dark:ring-rose-500/20">Terdeteksi</span>
                                ) : (
                                  <span className="text-gray-400 dark:text-gray-500 font-medium">-</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button className="p-2 rounded-md text-emerald-600 dark:text-emerald-400/70 bg-emerald-50 dark:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-800/40 transition-colors">
                                  <ArrowUpRight className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="10" className="px-6 py-8 text-center text-gray-500">
                              {isLoading ? 'Memuat data...' : 'Belum ada data percakapan.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#1C1E22] rounded-b-xl transition-colors flex-wrap gap-2">
                    {/* Info halaman */}
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Menampilkan {filteredLogs.length === 0 ? 0 : indexOfFirstItem + 1} hingga {Math.min(indexOfLastItem, filteredLogs.length)} dari {filteredLogs.length} entri
                    </div>

                    {/* Pagination */}
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white dark:bg-[#0D0F12] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Sebelumnya
                      </button>
                      <div className="flex items-center px-3 text-sm text-gray-500 dark:text-gray-400">
                        Halaman {totalPages === 0 ? 0 : currentPage} dari {totalPages}
                      </div>
                      <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white dark:bg-[#0D0F12] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Selanjutnya
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* EVALUASI PUBLIK - Sederhana */}
        {activeTab === 'evaluasi' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-[#1C1E22] rounded-xl p-6 border border-gray-200 dark:border-gray-800 flex items-center justify-between shadow-sm dark:shadow-none transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Ulasan</p>
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{reviewsList.length}</h3>
                </div>
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                  <MessageSquare className="w-6 h-6" />
                </div>
              </div>
              <div className="bg-white dark:bg-[#1C1E22] rounded-xl p-6 border border-gray-200 dark:border-gray-800 flex items-center justify-between shadow-sm dark:shadow-none transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Tingkat Kepuasan</p>
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                    {reviewsList.length > 0 ? Math.round(reviewsList.filter(r => r.isPositive).length / reviewsList.length * 100) : 0}%
                  </h3>
                </div>
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                  <ThumbsUp className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Ulasan Terbaru</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {reviewsList.length > 0 ? (
                  reviewsList.slice(0, 4).map(fb => (
                    <div key={fb.id} className="bg-white dark:bg-[#1C1E22] border border-gray-200 dark:border-gray-800 rounded-xl p-5 transition-colors">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex-shrink-0">
                          {fb.isPositive ? (
                            <ThumbsUp className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <ThumbsDown className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-200">{fb.user}</p>
                          <p className="text-xs text-gray-500">{fb.facility}</p>
                        </div>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 text-sm italic">"{fb.text}"</p>
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800/50">
                        <span className="text-xs text-gray-500 font-mono">Sesi: {fb.sessionId}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 text-center text-gray-500 py-8">Belum ada ulasan.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TREN & TOPIK */}
        {activeTab === 'tren' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-[#1C1E22] rounded-xl border border-gray-200 dark:border-gray-800 p-6 flex flex-col shadow-sm dark:shadow-none transition-colors">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-200 mb-6 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" /> Top 5 Topik Ditanyakan
                </h3>
                <div className="flex-1 flex flex-col justify-center space-y-4">
                  {trendingList.length > 0 ? (
                    trendingList.map((item, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                          <span className="truncate pr-4">{item.topic}</span>
                          <span className="font-mono">{item.count}</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-[#0D0F12] rounded-full h-2">
                          <div 
                            className="bg-emerald-500 h-2 rounded-full" 
                            style={{ width: `${Math.min((item.count / 345) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">Belum ada data topik.</div>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-[#1C1E22] rounded-xl border border-gray-200 dark:border-gray-800 p-6 flex flex-col shadow-sm dark:shadow-none transition-colors">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-200 mb-6 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-500" /> Kata Kunci Populer
                </h3>
                <div className="flex-1 flex items-center justify-center p-4 bg-gray-50 dark:bg-[#0D0F12] rounded-lg border border-gray-200 dark:border-gray-800/50 relative overflow-hidden transition-colors">
                  <div className="flex flex-wrap justify-center items-center gap-4 text-center">
                    {animatedKeywords.map(kw => (
                      <span 
                        key={kw.id} 
                        className={clsx(kw.size, kw.color, kw.weight, "transition-all duration-1000 ease-in-out")}
                      >
                        {kw.text}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* CHAT TRANSCRIPT MODAL */}
      {selectedSession && (
        <div className="fixed inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm z-50 flex justify-end transition-colors">
          <div className="w-full max-w-md bg-white dark:bg-[#1C1E22] h-full shadow-2xl flex flex-col border-l border-gray-200 dark:border-gray-800 animate-slide-in-right transition-colors">
            
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-[#15171A] transition-colors">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Transkrip Percakapan</h3>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">{selectedSession}</p>
              </div>
              <button 
                onClick={() => setSelectedSession(null)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedSession && transcripts[selectedSession]?.some(msg => msg.isJailbreak) && (
                <div className="mb-4 rounded-lg border border-red-500/30 bg-red-50 dark:bg-red-950/20 p-3 text-sm text-red-700 dark:text-red-400">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    <p><strong>⚠️ Peringatan:</strong> Sesi ini mengandung indikasi manipulasi prompt (Jailbreak).</p>
                  </div>
                </div>
              )}
              
              <div className="flex justify-center mb-6">
                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 bg-gray-100 dark:bg-gray-900 px-3 py-1 rounded-full transition-colors">Sesi Dimulai</span>
              </div>

              {selectedSession && transcripts[selectedSession]?.length > 0 ? (
                transcripts[selectedSession].map((msg, idx) => (
                  msg.sender === 'user' ? (
                    <div key={idx} className="flex justify-end mb-4 animate-in fade-in slide-in-from-bottom-2">
                      <div 
                        className={clsx(
                          "relative max-w-[85%] rounded-2xl rounded-br-sm px-4 py-2.5 text-sm shadow-sm transition-colors",
                          msg.isJailbreak 
                            ? "bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/50 text-red-900 dark:text-red-100"
                            : "bg-emerald-600 text-white"
                        )}
                      >
                        {msg.isJailbreak && (
                          <div className="mb-2 flex items-center gap-1.5 border-b border-red-200 dark:border-red-500/30 pb-2 text-[11px] font-bold tracking-wider text-red-600 dark:text-red-400 uppercase">
                            <ShieldAlert className="h-4 w-4" />
                            Indikasi Prompt Injection / Jailbreak
                          </div>
                        )}
                        <p className="leading-relaxed">{msg.text}</p>
                        <div className={clsx(
                          "text-[10px] text-right mt-1",
                          msg.isJailbreak ? "text-red-500 dark:text-red-300 opacity-80" : "text-emerald-100 dark:text-emerald-200"
                        )}>
                          {msg.time}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div key={idx} className="flex items-end gap-2">
                      <div className="w-6 h-6 rounded bg-gray-50 dark:bg-[#2A2D32] border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0 transition-colors">
                        <Bot className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" />
                      </div>
                      <div className="bg-white dark:bg-[#0D0F12] border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl rounded-bl-sm px-4 py-3 max-w-[85%] text-sm leading-relaxed shadow-sm transition-colors">
                        {msg.text}
                        <div className="text-[10px] text-gray-500 mt-1">{msg.time}</div>
                      </div>
                    </div>
                  )
                ))
              ) : (
                <div className="text-center text-gray-500 text-sm py-10">Data transkrip tidak ditemukan.</div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0D0F12] transition-colors">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Status Sesi:</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">Selesai</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .overflow-x-auto::-webkit-scrollbar {
          height: 10px;
        }
        .overflow-x-auto::-webkit-scrollbar-track {
          background: #1e1e1e;
          border-radius: 8px;
        }
        .overflow-x-auto::-webkit-scrollbar-thumb {
          background: #10b981;
          border-radius: 8px;
        }
        .overflow-x-auto::-webkit-scrollbar-thumb:hover {
          background: #059669;
        }

        /* GESER PAKE MOUSE (CLICK & DRAG) */
        .overflow-x-auto {
          cursor: grab;
          overflow-x: auto;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          user-select: none;
        }

        .overflow-x-auto:active {
          cursor: grabbing;
        }
      `}</style>
    </div>
  );
}