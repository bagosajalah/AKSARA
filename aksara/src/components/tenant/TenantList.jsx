import React, { useState, useEffect } from 'react';
import { Search, Plus, X, Eye, Edit2, MonitorPlay, FileText, Users, VenetianMask, Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import TambahTenantWebsiteModal from '../modals/TambahTenantWebsiteModal';
import StatusConfirmationModal from '../modals/StatusConfirmationModal';
import UbahStatusModal from '../modals/UbahStatusModal';
import EditTenantModal from '../modals/EditTenantModal';
import EditDinasModal from '../modals/EditDinasModal';

// Status Badge UI Component
const StatusBadge = ({ status, onClick, disabled }) => {
  const displayStatus = {
    'synced': 'Active',
    'pending': 'Suspended',
    'error': 'Archived'
  }[status] || status;
  
  const isInteractive = !disabled && status !== 'Archived' && status !== 'error';
  
  const colors = {
    'Active': `text-emerald-500 bg-emerald-500/10 border-emerald-500/20 ${isInteractive ? 'hover:bg-emerald-500/20 hover:ring-1 hover:ring-emerald-500/50' : ''}`,
    'Suspended': `text-amber-500 bg-amber-500/10 border-amber-500/20 ${isInteractive ? 'hover:bg-amber-500/20 hover:ring-1 hover:ring-amber-500/50' : ''}`,
    'Archived': 'text-slate-400 bg-slate-500/10 border-slate-500/20',
    'synced': `text-emerald-500 bg-emerald-500/10 border-emerald-500/20 ${isInteractive ? 'hover:bg-emerald-500/20 hover:ring-1 hover:ring-emerald-500/50' : ''}`,
    'pending': `text-amber-500 bg-amber-500/10 border-amber-500/20 ${isInteractive ? 'hover:bg-amber-500/20 hover:ring-1 hover:ring-amber-500/50' : ''}`,
    'error': 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  };

  return (
    <button 
      onClick={isInteractive ? onClick : undefined}
      disabled={!isInteractive}
      className={`px-2.5 py-1 text-[11px] font-semibold tracking-wide rounded-full border transition-all ${isInteractive ? 'cursor-pointer' : 'cursor-default'} ${colors[status] || colors['Active']}`}
      title={isInteractive ? "Ubah Status" : ""}
    >
      {displayStatus}
    </button>
  );
};

export default function TenantList({
  tenants = [],
  searchName,
  setSearchName,
  searchKode,
  setSearchKode,
  searchStatus,
  setSearchStatus,
  onSearch,
  onViewDetail,
  onEditTenant,
  onManageStatus,
  onAddTenant,
  onDeleteTenant,
  onUpdateStatus,
  onAddWebsite,
  onEditWebsite,
  onDeleteWebsite,
  loading = false,
  hasMore = false,
  onLoadMore = null,
  totalData = 0
}) {
  
  const [selectedDinas, setSelectedDinas] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddTenantWebsiteOpen, setIsAddTenantWebsiteOpen] = useState(false);
  const [editTenantModal, setEditTenantModal] = useState({ isOpen: false, tenant: null });
  const [editDinasModal, setEditDinasModal] = useState({ isOpen: false, dinas: null });
  const [ubahStatusModal, setUbahStatusModal] = useState({
    isOpen: false,
    targetId: null,
    targetName: '',
    targetType: '',
    currentStatus: ''
  });
  const [statusConfirmModal, setStatusConfirmModal] = useState({
    isOpen: false,
    targetId: null,
    targetName: '',
    targetType: '',
    pendingStatus: '',
    reason: ''
  });
  const [formData, setFormData] = useState({
    namaDinas: '',
    kodeDinas: '',
    namaAdmin: '',
    emailAdmin: ''
  });

  useEffect(() => {
    if (selectedDinas) {
      const updated = tenants.find(t => t.id === selectedDinas.id);
      if (updated) {
        setSelectedDinas(updated);
      }
    }
  }, [tenants]);

  const isKodeDuplicate = formData.kodeDinas.trim() !== '' && 
    tenants.some(d => d.kode_dinas?.toLowerCase() === formData.kodeDinas.trim().toLowerCase());
  
  const isEmailInvalid = formData.emailAdmin.trim() !== '' && 
    !formData.emailAdmin.trim().endsWith('@ponorogo.go.id');
  
  const hasErrors = isKodeDuplicate || isEmailInvalid;
  const isFormEmpty = !formData.namaDinas.trim() || !formData.kodeDinas.trim() || !formData.namaAdmin.trim() || !formData.emailAdmin.trim();
  const isSubmitDisabled = hasErrors || isFormEmpty;

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setFormData({ namaDinas: '', kodeDinas: '', namaAdmin: '', emailAdmin: '' });
  };

  const openUbahStatusModal = (type, targetId, name, currentStatus) => {
    setUbahStatusModal({
      isOpen: true,
      targetId,
      targetName: name,
      targetType: type,
      currentStatus
    });
  };

  const handleUbahStatusSubmit = (newStatus, reason) => {
    console.log("handleUbahStatusSubmit DIPANGGIL!", { newStatus, reason });
    
    setUbahStatusModal(prev => ({ ...prev, isOpen: false }));
    
    if (ubahStatusModal.targetType === 'Dinas') {
      console.log("Target DINAS → panggil onUpdateStatus");
      onUpdateStatus(ubahStatusModal.targetId, newStatus);
    } else if (ubahStatusModal.targetType === 'Tenant') {
      console.log("Target TENANT WEBSITE");
      const target = ubahStatusModal.targetId;
      const dinasId = target.dinasId || selectedDinas?.id;
      const tenantId = target.tenantId || target;
      
      console.log("dinasId:", dinasId, "tenantId:", tenantId);
      
      if (dinasId && tenantId) {
        const statusMap = {
          'Active': 'synced',
          'Suspended': 'pending',
          'Archived': 'error'
        };
        const mappedStatus = statusMap[newStatus] || newStatus;
        
        console.log("Mapped status:", mappedStatus);
        console.log("Memanggil onEditWebsite:", dinasId, tenantId, { status: mappedStatus });
        
        onEditWebsite(dinasId, tenantId, { status: mappedStatus });
      } else {
        console.error("ID tidak lengkap:", target);
        alert("ID tenant tidak ditemukan!");
      }
    }
  };

  const handleStatusConfirm = () => {
    onManageStatus(statusConfirmModal.targetId, statusConfirmModal.pendingStatus);
    setStatusConfirmModal({ isOpen: false, targetId: null, targetName: '', targetType: '', pendingStatus: '', reason: '' });
  };

  const handleAddTenantWebsite = async (data) => {
    if (!selectedDinas) return;
    try {
      await onAddWebsite(selectedDinas.id, {
        nama: data.nama,
        domain: data.domain,
      });
      setIsAddTenantWebsiteOpen(false);
    } catch (err) {
      console.error("Gagal tambah website:", err);
    }
  };

  const handleEditTenantSave = async (updatedData) => {
    const websiteId = updatedData.id;
    const tenantId = selectedDinas?.id;

    console.log("Edit tenant save:", { tenantId, websiteId, updatedData });

    if (!tenantId || !websiteId) {
      alert('Data tidak lengkap');
      return;
    }

    try {
      const data = {
        nama: updatedData.nama || updatedData.nama_website,
        domain: updatedData.domain || updatedData.url,
        status: updatedData.status || 'synced',
      };
      await onEditWebsite(tenantId, websiteId, data);
      setEditTenantModal({ isOpen: false, tenant: null });
    } catch (err) {
      console.error("Gagal update website:", err);
      alert("Gagal memperbarui website");
    }
  };

  const handleEditDinasSave = (updatedData) => {
    const dinasId = editDinasModal.dinas.id;
    console.log("handleEditDinasSave - dinasId:", dinasId);
    console.log("updatedData:", updatedData);
    
    onEditTenant(dinasId, updatedData);
    setEditDinasModal({ isOpen: false, dinas: null });
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  // ========== TOGGLE MASK ==========
  const toggleMask = (dinasId) => {
    const maskKey = `mask_tenant_${dinasId}`;
    const isMasked = localStorage.getItem(maskKey) === 'true';
    const newState = !isMasked;
    localStorage.setItem(maskKey, String(newState));
    window.location.reload();
  };

  const filteredDinasList = tenants;

  return (
    <div className="relative min-h-full font-sans text-gray-400">
      <div className={`space-y-6 transition-all duration-300`}>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">Manajemen Tenant</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Kelola daftar dinas dan titik tenant yang terhubung.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="text" 
                placeholder="Cari dinas..." 
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="pl-9 pr-4 py-2 bg-white dark:bg-[#131518] border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-64"
              />
            </div>
            <Button 
              onClick={() => setIsAddModalOpen(true)}
              variant="primary"
              icon={Plus}
            >
              Tambah Dinas
            </Button>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1A1C20] rounded-xl border border-gray-200 dark:border-gray-800/50 shadow-sm dark:shadow-none overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#131518]">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Nama Dinas</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Kode Dinas</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Total Tenant</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Nama Admin</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status Dinas</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                {filteredDinasList.map((dinas) => {
                  const isMasked = localStorage.getItem(`mask_tenant_${dinas.id}`) === 'true';
                  return (
                    <tr key={dinas.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">
                        {isMasked ? '••••••••' : (dinas.nama_dinas || dinas.nama)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-400">
                        {isMasked ? '••••••' : (dinas.kode_dinas || dinas.kode)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-400">
                        {dinas.tenants?.length || 0} Titik
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">
                        {isMasked ? '••••••••' : (dinas.namaAdmin || '-')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge 
                          status={dinas.status}
                          onClick={() => {
                            console.log("KLIK STATUS DINAS:", dinas);
                            openUbahStatusModal('Dinas', dinas.id, dinas.nama_dinas || dinas.nama, dinas.status);
                          }}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => setSelectedDinas(dinas)}
                            className="p-1.5 text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 rounded border border-white/5 transition-colors" 
                            title="Lihat Detail"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setEditDinasModal({ isOpen: true, dinas })}
                            className="p-1.5 text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 rounded border border-white/5 transition-colors" 
                            title="Edit Dinas"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              if (window.confirm(`Yakin hapus dinas "${dinas.nama_dinas || dinas.nama}"?`)) {
                                onDeleteTenant(dinas.id);
                              }
                            }}
                            className="p-1.5 text-red-500 hover:text-white hover:bg-red-500/20 rounded border border-white/5 transition-colors" 
                            title="Hapus Dinas"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {/* TOMBOL MASK - TANPA ALERT */}
                          <button 
                            onClick={() => toggleMask(dinas.id)}
                            className={`p-1.5 rounded border border-white/5 transition-colors ${
                              isMasked 
                                ? 'text-emerald-500 bg-emerald-500/20 border-emerald-500/30 hover:bg-emerald-500/30' 
                                : 'text-gray-500 hover:text-white bg-white/5 hover:bg-white/10'
                            }`}
                            title={isMasked ? 'Nonaktifkan Masking' : 'Aktifkan Masking'}
                          >
                            <VenetianMask className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              
              {hasMore && (
                <tfoot>
                  <tr>
                    <td colSpan="6">
                      <div className="flex justify-center py-4">
                        <button
                          onClick={onLoadMore}
                          disabled={loading}
                          className="px-6 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {loading ? 'Memuat...' : 'Muat Lebih Banyak'}
                        </button>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* MODAL DETAIL */}
      {selectedDinas && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setSelectedDinas(null)}></div>
          <div className="relative bg-white dark:bg-[#1A1C20] rounded-2xl border border-gray-200 dark:border-gray-800/50 shadow-xl dark:shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col p-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Detail Dinas</h2>
              <button onClick={() => setSelectedDinas(null)} className="p-1.5 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-8 pr-2">
              <div className="flex flex-wrap gap-x-12 gap-y-4 items-center bg-gray-50 dark:bg-[#131518] p-5 rounded-xl border border-gray-200 dark:border-gray-800">
                <div><p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Nama Dinas</p><p className="text-base font-semibold text-gray-900 dark:text-gray-200">{selectedDinas.nama_dinas || selectedDinas.nama}</p></div>
                <div><p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Kode Dinas</p><p className="text-base font-medium text-gray-700 dark:text-gray-300">{selectedDinas.kode_dinas || selectedDinas.kode}</p></div>
                <div><p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Dibuat Pada</p><p className="text-base font-medium text-gray-700 dark:text-gray-300">{selectedDinas.createdAt || '-'}</p></div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Ringkasan Penggunaan</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-gray-50 dark:bg-[#121315] border border-gray-200 dark:border-white/5 rounded-xl p-4 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-2 text-gray-500 dark:text-gray-400"><Users className="w-4 h-4" /><span className="text-xs font-medium uppercase tracking-wider">Nama Admin</span></div>
                    <span className="text-lg font-bold text-gray-900 dark:text-white truncate">{selectedDinas.namaAdmin || '-'}</span>
                  </div>
                  <div className="bg-gray-50 dark:bg-[#121315] border border-gray-200 dark:border-white/5 rounded-xl p-4 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-2 text-gray-500 dark:text-gray-400"><FileText className="w-4 h-4" /><span className="text-xs font-medium uppercase tracking-wider">Total Dokumen</span></div>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{selectedDinas.totalDokumen || 0}</span>
                  </div>
                  <div className="bg-gray-50 dark:bg-[#121315] border border-gray-200 dark:border-white/5 rounded-xl p-4 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-2 text-gray-500 dark:text-gray-400"><MonitorPlay className="w-4 h-4" /><span className="text-xs font-medium uppercase tracking-wider">Widget/Tenant</span></div>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{selectedDinas.tenants?.length || 0}</span>
                  </div>
                  <div className="bg-gray-50 dark:bg-[#121315] border border-gray-200 dark:border-white/5 rounded-xl p-4 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-2 text-gray-500 dark:text-gray-400"><MonitorPlay className="w-4 h-4" /><span className="text-xs font-medium uppercase tracking-wider">Sesi Chat</span></div>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{selectedDinas.sesiChat?.toLocaleString() || 0}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Daftar Tenant Terhubung</h3>
                  <Button onClick={() => setIsAddTenantWebsiteOpen(true)} variant="secondary" className="!py-1.5 !px-3 !text-xs">+ Tambah Tenant</Button>
                </div>
                <div className="mt-4 max-h-[260px] overflow-y-auto border border-gray-200 dark:border-white/5 rounded-lg">
                  <table className="min-w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#121315]">
                        <th className="px-5 py-3 text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Nama Tenant</th>
                        <th className="px-5 py-3 text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Domain Website</th>
                        <th className="px-5 py-3 text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-5 py-3 text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800/50">
                      {selectedDinas.tenants && selectedDinas.tenants.length > 0 ? (
                        selectedDinas.tenants.map((tenant) => (
                          <tr key={tenant.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                            <td className="px-5 py-3.5 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{tenant.nama_dinas || tenant.nama}</td>
                            <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{tenant.domain}</td>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <StatusBadge 
                                status={tenant.status}
                                disabled={selectedDinas.status === 'Archived'}
                                onClick={() => openUbahStatusModal('Tenant', { dinasId: selectedDinas.id, tenantId: tenant.id }, tenant.nama_dinas || tenant.nama, tenant.status)}
                              />
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button 
                                onClick={() => {
                                console.log("EDIT TENANT:", tenant);
                                console.log("tenant.id:", tenant.id);
                                setEditTenantModal({ isOpen: true, tenant: tenant });
                                }}
                                className="p-1.5 text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 rounded border border-white/5 transition-colors" 
                                 title="Edit Tenant"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => {
                                    if (window.confirm(`Yakin hapus tenant "${tenant.nama_dinas || tenant.nama}"?`)) {
                                      onDeleteWebsite(selectedDinas.id, tenant.id);
                                    }
                                  }}
                                  className="p-1.5 text-red-500 hover:text-white hover:bg-red-500/20 rounded border border-white/5 transition-colors" 
                                  title="Hapus Tenant"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan="4" className="px-5 py-8 text-center text-gray-500 text-sm">Tidak ada tenant terhubung.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      <TambahTenantWebsiteModal isOpen={isAddTenantWebsiteOpen} onClose={() => setIsAddTenantWebsiteOpen(false)} onSave={handleAddTenantWebsite} />
      <EditTenantModal isOpen={editTenantModal.isOpen} onClose={() => setEditTenantModal({ isOpen: false, tenant: null })} tenant={editTenantModal.tenant} onSave={handleEditTenantSave} />
      <EditDinasModal isOpen={editDinasModal.isOpen} onClose={() => setEditDinasModal({ isOpen: false, dinas: null })} dinas={editDinasModal.dinas} onSave={handleEditDinasSave} />
      <UbahStatusModal isOpen={ubahStatusModal.isOpen} onClose={() => setUbahStatusModal(prev => ({ ...prev, isOpen: false }))} onSubmit={handleUbahStatusSubmit} targetName={ubahStatusModal.targetName} currentStatus={ubahStatusModal.currentStatus} targetType={ubahStatusModal.targetType} />
      <StatusConfirmationModal isOpen={statusConfirmModal.isOpen} onClose={() => setStatusConfirmModal({ isOpen: false, targetId: null, targetName: '', targetType: '', pendingStatus: '', reason: '' })} onConfirm={handleStatusConfirm} targetName={statusConfirmModal.targetName} targetType={statusConfirmModal.targetType} pendingStatus={statusConfirmModal.pendingStatus} />

      {/* ADD DINAS MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={closeAddModal}></div>
          <div className="relative bg-white dark:bg-[#1C1E22] rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col p-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Tambah Dinas Baru</h2>
              <button onClick={closeAddModal} className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-8 pr-2">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">A. Informasi Dinas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Nama Dinas</label>
                    <input type="text" placeholder="Contoh: Dinas Kesehatan" value={formData.namaDinas} onChange={(e) => setFormData({...formData, namaDinas: e.target.value})} className="w-full px-4 py-2.5 bg-white dark:bg-[#121315] border border-gray-300 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Kode Dinas</label>
                    <input type="text" placeholder="Contoh: dinkes" value={formData.kodeDinas} onChange={(e) => setFormData({...formData, kodeDinas: e.target.value})} className={`w-full px-4 py-2.5 bg-white dark:bg-[#121315] border rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-1 transition-colors ${isKodeDuplicate ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-white/10 focus:border-emerald-500 focus:ring-emerald-500'}`} />
                    {isKodeDuplicate && <p className="text-xs text-red-500 mt-1">Kode dinas sudah terdaftar.</p>}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">B. Penugasan Admin</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Nama Lengkap Admin</label>
                    <input type="text" placeholder="Masukkan nama PIC" value={formData.namaAdmin} onChange={(e) => setFormData({...formData, namaAdmin: e.target.value})} className="w-full px-4 py-2.5 bg-white dark:bg-[#121315] border border-gray-300 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Email Admin</label>
                    <input type="email" placeholder="admin@ponorogo.go.id" value={formData.emailAdmin} onChange={(e) => setFormData({...formData, emailAdmin: e.target.value})} className={`w-full px-4 py-2.5 bg-white dark:bg-[#121315] border rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-1 transition-colors ${isEmailInvalid ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-white/10 focus:border-emerald-500 focus:ring-emerald-500'}`} />
                    {isEmailInvalid && <p className="text-xs text-red-500 mt-1">Email harus menggunakan domain @ponorogo.go.id.</p>}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-white/5">
              <Button onClick={closeAddModal} variant="secondary">Batal</Button>
              <Button onClick={() => { if (!isSubmitDisabled) { onAddTenant({ nama: formData.namaDinas, kode: formData.kodeDinas, namaAdmin: formData.namaAdmin, emailAdmin: formData.emailAdmin }); closeAddModal(); } }} disabled={isSubmitDisabled} variant="primary">Simpan & Buat Dinas</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}