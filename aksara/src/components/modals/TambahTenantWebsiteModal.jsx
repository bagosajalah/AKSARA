import React, { useState } from 'react';
import Modal from './Modal';
import Button from '../ui/Button';

export default function TambahTenantWebsiteModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    nama: '',
    domain: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    setFormData({ nama: '', domain: '' });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tambah Tenant Baru" maxWidth="max-w-md">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Nama Tenant</label>
            <input 
              type="text" 
              value={formData.nama}
              onChange={(e) => setFormData({...formData, nama: e.target.value})}
              className="w-full rounded-xl border border-white/10 bg-[#0D0E10] text-white placeholder-zinc-600 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 px-4 py-2.5 outline-none transition-colors"
              placeholder="Contoh: RSUD Ponorogo"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Domain Website</label>
            <input 
              type="text" 
              value={formData.domain}
              onChange={(e) => setFormData({...formData, domain: e.target.value})}
              className="w-full rounded-xl border border-white/10 bg-[#0D0E10] text-white placeholder-zinc-600 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 px-4 py-2.5 outline-none transition-colors"
              placeholder="Contoh: rsud.ponorogo.go.id"
              required
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t border-white/5">
          <Button
            type="button"
            onClick={onClose}
            variant="secondary"
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={!formData.nama || !formData.domain}
            variant="primary"
          >
            Simpan Tenant
          </Button>
        </div>
      </form>
    </Modal>
  );
}
