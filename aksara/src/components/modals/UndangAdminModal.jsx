import React, { useState } from 'react';
import Modal from './Modal';
import AdminToggle from '../admin/AdminToggle';
import { AlertCircle } from 'lucide-react';

export default function UndangAdminModal({ isOpen, onClose, onSave, tenantName }) {
  const [formData, setFormData] = useState({
    email: '',
    nip: '',
    status: true
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    setFormData({ email: '', nip: '', status: true });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tambah Admin untuk Tenant Ini" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit}>
        <div className="space-y-5">
          
          <div className="bg-amber-50 text-amber-800 px-4 py-3 rounded-xl border border-amber-200/60 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
            <div className="text-sm font-medium">
              <p>Catatan Penting</p>
              <p className="text-xs text-amber-700 font-normal mt-0.5">Sistem hanya mengizinkan maksimal 1 Admin Utama per Dinas/Tenant.</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Pilih Dinas (Tenant)</label>
            <input 
              type="text"
              disabled
              value={tenantName || 'Pilih tenant terlebih dahulu...'}
              className="w-full rounded-xl border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed sm:text-sm border py-2.5 px-3"
            />
            <p className="mt-1.5 text-xs text-gray-500">Tenant dikunci otomatis berdasarkan konteks saat ini.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Email Undangan</label>
            <input 
              type="email" 
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-xl border-gray-200 bg-gray-50 hover:bg-white focus:bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border py-2.5 px-3 transition-colors"
              placeholder="Contoh: admin@kominfo.ponorogo.go.id"
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">NIP Pegawai (Opsional)</label>
            <input 
              type="text" 
              value={formData.nip}
              onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
              className="w-full rounded-xl border-gray-200 bg-gray-50 hover:bg-white focus:bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border py-2.5 px-3 transition-colors"
              placeholder="Masukkan NIP jika ada"
            />
          </div>

          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-900">Status Akses</p>
              <p className="text-xs text-gray-500">Tentukan apakah admin dapat langsung login setelah klaim.</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`text-sm font-medium ${formData.status ? 'text-blue-600' : 'text-gray-500'}`}>
                {formData.status ? 'Aktif' : 'Nonaktif'}
              </span>
              <AdminToggle checked={formData.status} onChange={(val) => setFormData({ ...formData, status: val })} />
            </div>
          </div>

        </div>

        <div className="flex items-center justify-end space-x-3 mt-8 pt-4 border-t border-gray-100">
          <button
            className="text-gray-600 bg-white hover:bg-gray-50 border border-black/10 font-medium px-4 py-1.5 text-[13px] rounded-lg shadow-sm transition-all"
            type="button"
            onClick={onClose}
          >
            Batal
          </button>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-medium px-4 py-1.5 rounded-lg shadow-sm border border-blue-700/50 transition-all flex items-center gap-1.5 justify-center"
            type="submit"
          >
            Simpan & Kirim Undangan
          </button>
        </div>
      </form>
    </Modal>
  );
}
