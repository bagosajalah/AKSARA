import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from '../ui/Button';
import { Info } from 'lucide-react';

export default function TambahTenantModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    nama: '',
    kode: '',
    domain: '',
    deskripsi: '',
    namaAdmin: '',
    emailAdmin: ''
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        nama: '',
        kode: '',
        domain: '',
        deskripsi: '',
        namaAdmin: '',
        emailAdmin: ''
      });
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();

    onSave({
      nama: formData.nama,
      kode: formData.kode,
      domain: formData.domain,
      deskripsi: formData.deskripsi,
      adminName: formData.namaAdmin,
      adminEmail: formData.emailAdmin,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tambah Tenant Baru" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">

          {/* Info */}
          <div className="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
            <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-300">Status Default: Active</p>
              <p className="text-xs text-blue-300/70 mt-1">Tenant baru akan langsung aktif dan dapat dikelola.</p>
            </div>
          </div>

          {/* Nama Dinas */}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Nama Dinas</label>
            <input
              type="text"
              required
              placeholder="Contoh: Dinas Kesehatan"
              value={formData.nama}
              onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-[#121315] px-4 py-3 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500 outline-none transition"
            />
          </div>

          {/* Kode Tenant */}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Kode Tenant</label>
            <input
              type="text"
              required
              placeholder="Contoh: dinkes"
              value={formData.kode}
              onChange={(e) => setFormData({ ...formData, kode: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-[#121315] px-4 py-3 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500 outline-none transition"
            />
          </div>

          {/* Domain */}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Domain</label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="dinkes"
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-[#121315] px-4 py-3 pr-40 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500 outline-none transition"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">.ponorogo.go.id</span>
            </div>
            <p className="mt-2 text-xs text-gray-500">Format wajib: [nama].ponorogo.go.id</p>
          </div>

          {/* Nama Admin */}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Nama Admin</label>
            <input
              type="text"
              required
              placeholder="Contoh: Nama Admin"
              value={formData.namaAdmin}
              onChange={(e) => setFormData({ ...formData, namaAdmin: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-[#121315] px-4 py-3 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500 outline-none transition"
            />
          </div>

          {/* Email Admin */}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Email Admin</label>
            <input
              type="email"
              required
              placeholder="admin@ponorogo.go.id"
              value={formData.emailAdmin}
              onChange={(e) => setFormData({ ...formData, emailAdmin: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-[#121315] px-4 py-3 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500 outline-none transition"
            />
          </div>

          {/* Deskripsi */}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Deskripsi Singkat</label>
            <textarea
              rows={4}
              placeholder="Tambahkan deskripsi..."
              value={formData.deskripsi}
              onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-[#121315] px-4 py-3 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:ring-emerald-500 outline-none transition resize-none"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="mt-8 flex justify-end gap-3 border-t border-white/10 pt-6">
          <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!formData.nama || !formData.kode || !formData.domain || !formData.namaAdmin || !formData.emailAdmin}
          >
            Simpan Tenant
          </Button>
        </div>

      </form>
    </Modal>
  );
}