import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from '../ui/Button';
import { Lock } from 'lucide-react';

export default function EditDinasModal({ isOpen, onClose, dinas, onSave }) {
  const [formData, setFormData] = useState({
    nama: '',
    kode: '',
    namaAdmin: ''
  });

  useEffect(() => {
    if (dinas) {
      setFormData({
        nama: dinas.nama_dinas || dinas.nama || '',
        kode: dinas.kode_dinas || dinas.kode || '',
        namaAdmin: dinas.namaAdmin || ''
      });
    }
  }, [dinas]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.nama.trim()) {
      alert('Nama Dinas wajib diisi');
      return;
    }

    console.log("EditDinasModal - submit data:", {
      nama_dinas: formData.nama,
      kode_dinas: formData.kode,
      namaAdmin: formData.namaAdmin,
    });

    onSave({
      nama_dinas: formData.nama,
      kode_dinas: formData.kode,
      namaAdmin: formData.namaAdmin,
    });
  };

  if (!dinas) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Identitas Dinas" maxWidth="max-w-md">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Nama Dinas</label>
            <input 
              name="nama"
              type="text" 
              value={formData.nama}
              onChange={handleChange}
              className="w-full rounded-xl border border-white/10 bg-[#0D0E10] text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 px-4 py-2.5 outline-none transition-colors"
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Kode Dinas</label>
            <div className="relative">
              <input 
                name="kode"
                type="text" 
                value={formData.kode}
                disabled
                readOnly
                className="w-full rounded-xl border border-white/5 bg-[#0D0E10]/50 text-gray-500 px-4 py-2.5 outline-none cursor-not-allowed pl-10"
              />
              <Lock className="w-4 h-4 text-gray-600 absolute left-4 top-1/2 -translate-y-1/2" />
            </div>
            <p className="mt-1.5 text-xs text-gray-500">Kode unik tidak dapat diubah.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Nama Admin</label>
            <input 
              name="namaAdmin"
              type="text" 
              value={formData.namaAdmin}
              onChange={handleChange}
              className="w-full rounded-xl border border-white/10 bg-[#0D0E10] text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 px-4 py-2.5 outline-none transition-colors"
              required 
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t border-white/5">
          <Button type="button" onClick={onClose} variant="secondary">Batal</Button>
          <Button type="submit" variant="primary" className="!bg-emerald-500 !text-white hover:!bg-emerald-400">
            Simpan Perubahan
          </Button>
        </div>
      </form>
    </Modal>
  );
}
