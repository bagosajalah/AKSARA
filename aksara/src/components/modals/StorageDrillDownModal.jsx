import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { ChevronDown, ChevronUp, Server, Loader2 } from 'lucide-react';
import api from '../../services/api';

export default function StorageDrillDownModal({ isOpen, onClose }) {
  const [storageData, setStorageData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);

  // ===== LOAD DATA DARI API =====
  const loadStorageData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Ambil data tenant
      const resTenants = await api.get('/tenants');
      const tenants = resTenants.data?.data || resTenants.data || [];
      
      // Ambil data storage limits
      const resStorage = await api.get('/admin/tenants/storage/limits');
      const storageData = resStorage.data?.data || resStorage.data || [];
      
      // Buat map storage limit
      const limitMap = {};
      storageData.forEach(item => {
        limitMap[item.tenant_id] = {
          max: item.storage_limit || 500,
          used: item.used_mb || 0
        };
      });
      
      // Transform data
      const transformed = tenants.map(tenant => {
        const limit = limitMap[tenant.id] || { max: 500, used: 0 };
        
        // Ambil websites sebagai tenant breakdown
        const websites = tenant.websites || [];
        const perWebUsed = websites.length > 0 && limit.used > 0 
          ? Math.round((limit.used / websites.length) * 10) / 10 
          : 0;
        const tenantBreakdown = websites.map(web => ({
          id: web.id,
          name: web.nama_website || web.name || 'Unknown',
          used: perWebUsed
        }));
        
        return {
          id: tenant.id,
          name: tenant.nama_dinas || tenant.name || 'Unknown',
          used: limit.used,
          total: limit.max,
          unit: 'MB',
          tenants: tenantBreakdown.length > 0 ? tenantBreakdown : [
            { id: tenant.id, name: 'Main Storage', used: limit.used }
          ]
        };
      });
      
      setStorageData(transformed);
    } catch (err) {
      console.error('Gagal load storage data:', err);
      setError('Gagal memuat data storage');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStorageData();
    }
  }, [isOpen]);

  const toggleRow = (id) => {
    setExpandedRow(prev => prev === id ? null : id);
  };

  const getProgressColor = (percentage) => {
    if (percentage > 80) return 'bg-red-500';
    if (percentage > 60) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rincian Penggunaan Penyimpanan" maxWidth="max-w-2xl">
      <div className="space-y-4 mb-2">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Berikut adalah rincian penggunaan penyimpanan (Storage) yang dikelompokkan berdasarkan Dinas dan Tenant.
        </p>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            <p>{error}</p>
            <button 
              onClick={loadStorageData}
              className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        ) : storageData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Belum ada data storage.
          </div>
        ) : (
          <div className="space-y-3">
            {storageData.map((dinas) => {
              const percentage = dinas.total > 0 ? (dinas.used / dinas.total) * 100 : 0;
              const isExpanded = expandedRow === dinas.id;

              return (
                <div key={dinas.id} className="bg-white dark:bg-[#121315] border border-gray-200 dark:border-white/5 rounded-xl overflow-hidden transition-all">
                  {/* Main Row */}
                  <div 
                    onClick={() => toggleRow(dinas.id)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex-1 pr-6">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">{dinas.name}</h4>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                          {dinas.used} {dinas.unit} <span className="text-gray-400 dark:text-gray-600">/ {dinas.total} {dinas.unit}</span>
                        </span>
                      </div>
                      {/* Progress Bar */}
                      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${getProgressColor(percentage)}`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-gray-500 flex-shrink-0">
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  {/* Accordion Detail: Tenant Breakdown */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#0D0E10]">
                      <div className="space-y-2 mt-2">
                        {dinas.tenants.map(tenant => {
                          const tenantPercentage = dinas.used > 0 ? (tenant.used / dinas.used) * 100 : 0;
                          return (
                            <div key={tenant.id} className="bg-white dark:bg-[#25272C] p-3 rounded-lg border border-gray-200 dark:border-white/5 flex items-center justify-between ml-4 shadow-sm dark:shadow-none">
                              <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-gray-100 dark:bg-white/5 rounded text-gray-500 dark:text-gray-400">
                                  <Server className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-300">{tenant.name}</span>
                              </div>
                              <div className="flex items-center gap-4 w-1/3 justify-end">
                                <div className="w-24 h-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden hidden sm:block">
                                  <div 
                                    className="h-full bg-emerald-500/50 rounded-full"
                                    style={{ width: `${Math.min(tenantPercentage, 100)}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">{tenant.used} MB</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}