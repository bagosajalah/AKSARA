import React, { useState, useEffect, forwardRef, useCallback } from 'react';
import { Search, Calendar, Download, Loader2, AlertCircle } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import ExportAuditModal from '../modals/ExportAuditModal';
import { auditService } from '../../services/audit.service';

const formatAction = (action) => {
  if (!action) return '-';
  
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
  
  return actionMap[action] || action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const ActionBadge = ({ action }) => {
  const norm = (action || '').toUpperCase().replace(/_/g, ' ');
  let styles = "bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-500/10 dark:text-gray-300 dark:border-gray-500/20";

  if (norm.includes('LOGIN')) {
    styles = "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
  } else if (norm.includes('STATUS')) {
    styles = "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20";
  } else if (norm.includes('ROLE') || norm.includes('ADMIN')) {
    styles = "bg-teal-100 text-teal-700 border border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20";
  } else if (norm.includes('WEBSITE') || norm.includes('CONFIG')) {
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

export default function AuditLogsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;
  
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await auditService.getAuditLogs();
      const rawData = response.data?.data || response.data || [];
      
      if (Array.isArray(rawData)) {
        const transformed = rawData.map(item => ({
          id: item.id,
          time: item.created_at || item.timestamp,
          actor: item.user?.nama_lengkap || item.actor_name || 'System',
          dinas: item.tenant?.nama_dinas || item.tenant_name || 'Pusat',
          action: item.aksi || item.action || 'SYSTEM',
          description: item.detail || item.description || '-',
        }));
        setAuditLogs(transformed);
      } else {
        setAuditLogs([]);
      }
    } catch (err) {
      console.error('Gagal memuat audit log:', err);
      setError(err.response?.data?.detail || 'Gagal memuat data audit log');
    
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const filteredLogs = auditLogs.filter(log => {
    const search = searchTerm.toLowerCase();
    return (
      (log.actor && log.actor.toLowerCase().includes(search)) ||
      (log.action && log.action.toLowerCase().includes(search)) ||
      (log.description && log.description.toLowerCase().includes(search)) ||
      (log.dinas && log.dinas.toLowerCase().includes(search))
    );
  });

  const CustomDateInput = forwardRef(({ value, onClick }, ref) => (
    <div className="relative cursor-pointer" onClick={onClick} ref={ref}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
        <Calendar className="h-4 w-4 text-gray-500" />
      </div>
      <input
        type="text"
        readOnly
        value={value || 'Pilih Tanggal'}
        className="block w-full sm:w-64 pl-10 pr-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl leading-5 bg-white dark:bg-[#121315] text-gray-900 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
      />
    </div>
  ));

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

   const cleanDescription = (desc) => {
    if (!desc) return '-';
    return desc.replace(/\(ID:\s*[a-f0-9-]+\)/gi, '').trim();
  };

  return (
    <>
      <div className="space-y-6 pb-12 font-sans">
        
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
              Audit Logs
              {loading && <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Catatan aktivitas sistem dan rekam jejak pengguna.
              {!loading && !error && (
                <span className="ml-2 text-xs text-gray-400">
                  ({auditLogs.length} entri)
                </span>
              )}
            </p>
          </div>
          
          <div className="flex justify-end items-center gap-3 w-full sm:w-auto">
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

            {/* Search Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-500" />
              </div>
              <input
                type="text"
                placeholder="Cari log, aktor, aksi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full sm:w-64 pl-10 pr-3 py-2 border border-gray-200 dark:border-white/10 rounded-xl leading-5 bg-white dark:bg-[#121315] text-gray-900 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
              />
            </div>

            {/* Download Laporan Button */}
            <button 
              title="Unduh Laporan Audit"
              onClick={() => setIsExportModalOpen(true)}
              className="p-2 border-0 rounded-xl bg-emerald-500 hover:bg-emerald-400 transition-all duration-200 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-[#1C1E22] flex items-center justify-center h-[38px] w-[38px] flex-shrink-0 ml-0 sm:ml-2 shadow-sm"
            >
              <Download className="w-4 h-4" />
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

        {/* Main Table */}
        <div className="bg-white dark:bg-[#1C1E22] rounded-xl border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#121315]/50">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actor</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Dinas</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {loading ? (
                  // Loading State
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                        <span className="text-gray-500 dark:text-gray-400">Memuat data audit log...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  // Empty State
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      {searchTerm ? (
                        <>
                          <p>Tidak ada log yang sesuai dengan pencarian "{searchTerm}"</p>
                          <button 
                            onClick={() => setSearchTerm('')}
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
                  // Data Rows
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-500">
                        {formatDate(log.time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {log.actor}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-500">
                        {log.dinas}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <ActionBadge action={log.action} />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-400 max-w-md truncate">
                        {cleanDescription(log.description)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
      
      <ExportAuditModal 
        isOpen={isExportModalOpen} 
        onClose={() => setIsExportModalOpen(false)} 
      />
    </>
  );
}