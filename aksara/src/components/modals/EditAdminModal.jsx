import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function EditAdminModal({ isOpen, onClose, admin, onSave, tenants = [] }) {
  const [formData, setFormData] = useState({
    nama: '',
    nip: '',
    email: '',
    tenant_id: ''
  });

  useEffect(() => {
    if (admin) {
      console.log("EditAdminModal - admin:", admin);
      setFormData({
        nama: admin.nama || admin.nama_lengkap || '',
        nip: admin.nip || '',
        email: admin.email || '',
        tenant_id: admin.tenant_id || admin.tenantId || ''
      });
    }
  }, [admin]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("EditAdminModal - submit:", {
      id: admin.id,
      nama: formData.nama,
      nip: formData.nip,
      email: formData.email,
      tenant_id: formData.tenant_id,
    });
    onSave(admin.id, {
      nama: formData.nama,
      nip: formData.nip,
      email: formData.email,
      tenant_id: formData.tenant_id,
    });
  };

  if (!isOpen || !admin) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-[#1C1E22] rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col p-8 animate-in fade-in zoom-in-95 duration-200 transition-colors">
        
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white transition-colors">Ubah Data & Penugasan Admin</h2>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          <form id="editAdminForm" onSubmit={handleSubmit} className="space-y-6">
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2 transition-colors">Pilih Dinas (Tenant)</label>
              <select 
                name="tenant_id"
                value={formData.tenant_id}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white dark:bg-[#0D0E10] border border-gray-300 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="">-- Pilih Tenant --</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nama_dinas || t.nama}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 transition-colors">Pilih tenant lain untuk memutasi admin ini ke instansi berbeda.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2 transition-colors">Email Undangan / SSO</label>
              <input 
                name="email"
                type="email" 
                value={formData.email}
                disabled
                className="w-full px-4 py-2.5 bg-gray-100 dark:bg-[#0D0E10] border border-gray-300 dark:border-white/10 rounded-lg text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed opacity-70 transition-colors"
              />
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 transition-colors">Email tidak dapat diubah karena sudah terikat dengan sistem SSO Pemkab.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2 transition-colors">Nama Pegawai</label>
              <input 
                name="nama"
                type="text" 
                value={formData.nama}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white dark:bg-[#0D0E10] border border-gray-300 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
                required 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2 transition-colors">NIP (Opsional)</label>
              <input 
                name="nip"
                type="text" 
                value={formData.nip}
                onChange={handleChange}
                placeholder="Masukkan NIP (18 digit)"
                className="w-full px-4 py-2.5 bg-white dark:bg-[#0D0E10] border border-gray-300 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

          </form>
        </div>

        <div className="mt-8 flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-white/5">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-400 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-300 dark:border-white/10 transition-colors"
            type="button"
          >
            Batal
          </button>
          <button 
            form="editAdminForm"
            type="submit"
            className="px-5 py-2.5 text-sm font-medium rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
          >
            Simpan Perubahan
          </button>
        </div>
        
      </div>
    </div>
  );
}
