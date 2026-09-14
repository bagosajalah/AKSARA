import React, { useState, useEffect, useCallback } from 'react';
import { Search, Calendar, Download, Loader2, AlertCircle } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { auditService } from '../services/audit.service';

const formatAction = (action) => {
  if (!action) return '-';
  
  const normalized = action.toUpperCase().trim();
  
  const actionMap = {
    'LOGIN': 'Login',
    'LOGOUT': 'Logout',
    'REGISTER_USER': 'Register User',
    'UPDATE_USER': 'Update User',
    'UPDATE_USER_STATUS': 'Update User Status',
    'DELETE_USER': 'Delete User',
    'CREATE_ROLE': 'Create Role',
    'UPDATE_ROLE': 'Update Role',
    'DELETE_ROLE': 'Delete Role',
    'ASSIGN_ROLES': 'Assign Roles',
    'REMOVE_ROLE': 'Remove Role',
    'CREATE_TENANT': 'Create Tenant',
    'UPDATE_TENANT': 'Update Tenant',
    'DELETE_TENANT': 'Delete Tenant',
    'UPDATE_WEBSITE': 'Update Website',
    'CREATE_WEBSITE': 'Create Website',
    'DELETE_WEBSITE': 'Delete Website',
    'UPDATE_WEB_SITE': 'Update Website',
    'UPDATE_WEBISITE': 'Update Website',
    'SYSTEM': 'System',
    'SECURITY': 'Security Alert',
    'AI_ACTIVITY': 'AI Activity',
    'SYNC_KB': 'Sync Knowledge Base',
    'UPLOAD_DOKUMEN': 'Upload Document',
    'IMPERSONATE': 'Impersonate',
    'NEW_ADMIN': 'New Admin',
    'NEW_TENANT': 'New Tenant',
    'STATUS_CHANGED': 'Status Changed',
    'UPDATE_CONFIG': 'Update Config',
    'ALERT': 'Alert',
  };
  
  return actionMap[normalized] || normalized.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const ActionBadge = ({ action }) => {
  const norm = (action || '').toUpperCase().replace(/_/g, ' ');
  let styles = "bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-500/10 dark:text-gray-300 dark:border-gray-500/20";

  if (norm.includes('LOGIN') || norm.includes('LOGOUT')) {
    styles = "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
  } else if (norm.includes('STATUS')) {
    styles = "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20";
  } else if (norm.includes('ROLE') || norm.includes('ADMIN')) {
    styles = "bg-teal-100 text-teal-700 border border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20";
  } else if (norm.includes('WEBSITE') || norm.includes('WEB_SITE') || norm.includes('WEBISITE') || norm.includes('CONFIG')) {
    styles = "bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20";
  } else if (norm.includes('TENANT')) {
    styles = "bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20";
  } else if (norm.includes('IMPERSONATE')) {
    styles = "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";
  } else if (norm.includes('DELETE')) {
    styles = "bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20";
  } else if (norm.includes('SECURITY') || norm.includes('ALERT')) {
    styles = "bg-red-100 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20";
  } else if (norm.includes('KB') || norm.includes('AI') || norm.includes('DOKUMEN')) {
    styles = "bg-violet-100 text-violet-700 border border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20";
  }

  return (
    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${styles}`}>
      {formatAction(action)}
    </span>
  );
};


const FacilityBadge = ({ facility }) => {
  const colors = {
    'RSUD Ponorogo': 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 ring-indigo-200 dark:ring-indigo-500/20',
    'Puskesmas Utara': 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 ring-purple-200 dark:ring-purple-500/20',
    'Pusat': 'bg-gray-50 dark:bg-gray-500/10 text-gray-700 dark:text-gray-400 ring-gray-200 dark:ring-gray-500/20',
  };
  
  const colorClass = colors[facility] || colors['Pusat'];
  
  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${colorClass}`}>
      {facility}
    </span>
  );
};

export default function AuditLogDinas() {
  const [facilityFilter, setFacilityFilter] = useState('Semua Fasilitas');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cleanDescription = (desc) => {
    if (!desc) return '-';
    return desc.replace(/\(ID:\s*[a-f0-9-]+\)/gi, '').trim();
  };
  const loadAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await auditService.getAuditLogs();
      const rawData = res.data?.data || res.data || [];
      
      if (Array.isArray(rawData)) {
        const transformed = rawData.map(item => ({
          id: item.id,
          timestamp: item.created_at || item.timestamp,
          facility: item.tenant?.nama_dinas || item.tenant_name || 'Pusat',
          action: item.aksi || item.action || 'SYSTEM',
          details: item.detail || item.description || '-',
        }));
        setAuditLogs(transformed);
      } else {
        setAuditLogs([]);
      }
    } catch (err) {
      console.error('Gagal memuat audit log dinas:', err);
      setError(err.response?.data?.detail || 'Gagal memuat data audit log');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const facilities = ['Semua Fasilitas', ...new Set(auditLogs.map(log => log.facility))];

  const filteredLogs = auditLogs.filter(log => {
    const matchFacility = facilityFilter === 'Semua Fasilitas' || log.facility === facilityFilter;
    const matchSearch = 
      formatAction(log.action).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.facility && log.facility.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Filter by date range
    let matchDate = true;
    if (startDate && log.timestamp) {
      const logDate = new Date(log.timestamp);
      if (startDate && logDate < startDate) matchDate = false;
      if (endDate && logDate > endDate) matchDate = false;
    }
    
    return matchFacility && matchSearch && matchDate;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Now';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const CustomDateInput = React.forwardRef(({ value, onClick }, ref) => (
    <div className="relative cursor-pointer" onClick={onClick} ref={ref}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
        <Calendar className="h-4 w-4 text-gray-500" />
      </div>
      <input
        type="text"
        readOnly
        value={value || 'Pilih Tanggal'}
        className="block w-full sm:w-56 pl-10 pr-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl leading-5 bg-white dark:bg-[#121315] text-gray-900 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
      />
    </div>
  ));

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-xl">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 transition-colors">
              Audit Logs
              {loading && <Loader2 className="ml-2 w-5 h-5 animate-spin text-emerald-500 inline" />}
            </h1>
          </div>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 leading-relaxed transition-colors">
            Catatan aktivitas dan rekam jejak perubahan sistem Anda.
            {!loading && !error && (
              <span className="ml-2 text-xs text-gray-400">
                ({filteredLogs.length} entri)
              </span>
            )}
          </p>
        </div>
        
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          {/* Facility Filter */}
          <select 
            className="w-full bg-white dark:bg-[#1A1C20] border border-gray-300 dark:border-gray-700/50 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-200 outline-none focus:ring-1 focus:ring-emerald-500/50 sm:w-auto transition-colors shadow-sm dark:shadow-none"
            value={facilityFilter}
            onChange={(e) => setFacilityFilter(e.target.value)}
          >
            {facilities.map(f => (
              <option key={f} className="bg-white dark:bg-[#1A1C20]" value={f}>
                {f}
              </option>
            ))}
          </select>

          {/* Date Range Picker */}
          <DatePicker
            selectsRange={true}
            startDate={startDate}
            endDate={endDate}
            onChange={(update) => setDateRange(update)}
            dateFormat="dd MMM yyyy"
            placeholderText="Pilih Rentang Tanggal"
            customInput={<CustomDateInput />}
          />

          {/* Search Bar */}
          <div className="flex w-full items-center gap-2 rounded-xl border border-gray-300 dark:border-gray-700/50 bg-white dark:bg-[#1A1C20] px-3 py-2 sm:w-64 transition-colors shadow-sm dark:shadow-none">
            <Search className="h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Cari log, fasilitas, atau aksi..." 
              className="w-full bg-transparent text-sm text-gray-700 dark:text-gray-200 outline-none placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Download Button */}
          <button className="flex items-center justify-center rounded-xl bg-emerald-500 p-2.5 text-white transition-colors hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#131518]">
            <Download className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-700 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <button 
            onClick={loadAuditLogs}
            className="ml-auto text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Table Section */}
      <div className="bg-white dark:bg-[#1C1E22] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm dark:shadow-none overflow-hidden flex flex-col transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-max">
            <thead className="bg-gray-50 dark:bg-[#15171A] border-b border-gray-200 dark:border-gray-800 transition-colors">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-colors">Tanggal & Waktu</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-colors">Aktivitas</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-colors">Fasilitas</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider transition-colors">Detail Perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800/50 transition-colors">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                      <span className="text-gray-500 dark:text-gray-400">Memuat data audit log...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    {searchQuery || facilityFilter !== 'Semua Fasilitas' ? (
                      <>
                        <p>Tidak ada log yang sesuai dengan filter yang dipilih</p>
                        <button 
                          onClick={() => {
                            setSearchQuery('');
                            setFacilityFilter('Semua Fasilitas');
                            setDateRange([null, null]);
                          }}
                          className="mt-2 text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          Hapus filter
                        </button>
                      </>
                    ) : (
                      <p>Belum ada data audit log.</p>
                    )}
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm whitespace-nowrap transition-colors">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <ActionBadge action={log.action} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <FacilityBadge facility={log.facility} />
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm transition-colors max-w-md truncate">
                      {cleanDescription(log.details)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}