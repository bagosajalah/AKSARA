import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from '../ui/Button';

export default function EditTenantModal({ isOpen, onClose, tenant, onSave }) {
  const [formData, setFormData] = useState({
    nama: '',
    domain: '',
  });

  useEffect(() => {
  if (tenant) {
    console.log("EditTenantModal - tenant:", tenant);
    console.log("tenant.id:", tenant.id);
    console.log("Tipe tenant:", typeof tenant);

    let tenantObj = tenant;
    if (typeof tenant === 'string') {
      tenantObj = {
        id: tenant,
        nama: '',
        domain: '',
        status: 'Active'
      };
      console.log("Tenant diubah dari string ke objek:", tenantObj);
    }

    setFormData({
      nama: tenantObj.nama || tenantObj.nama_website || tenantObj.nama_dinas || '',
      domain: tenantObj.domain || tenantObj.url || '',
      status: tenantObj.status || 'Active'
    });

    window._currentTenant = tenantObj;
  }
}, [tenant]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
  e.preventDefault();

  // AMBIL ID DARI TENANT (BISA STRING ATAU OBJEK)
  let id;
  
  if (typeof tenant === 'string') {
    // Jika tenant adalah string UUID
    id = tenant;
  } else if (tenant?.id) {
    // Jika tenant adalah objek dengan properti id
    id = tenant.id;
  } else if (tenant?.tenant_id) {
    id = tenant.tenant_id;
  } else if (tenant?.website_id) {
    id = tenant.website_id;
  }

  console.log("Submit dengan id:", id);
  console.log("Data tenant:", tenant);

  if (!id) {
    alert('ID tenant tidak ditemukan');
    return;
  }

  // KIRIM DATA KE PARENT
  onSave({
    id: id,
    nama: formData.nama,
    domain: formData.domain,
    status: formData.status,
  });
};

  if (!tenant) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Detail Tenant" maxWidth="max-w-md">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Nama Tenant</label>
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
            <label className="block text-sm font-medium text-gray-400 mb-1">Domain Website</label>
            <input 
              name="domain"
              type="text" 
              value={formData.domain}
              onChange={handleChange}
              className="w-full rounded-xl border border-white/10 bg-[#0D0E10] text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 px-4 py-2.5 outline-none transition-colors"
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
            variant="primary"
            className="!bg-emerald-500 !text-white hover:!bg-emerald-400"
          >
            Simpan Perubahan
          </Button>
        </div>
      </form>
    </Modal>
  );
}
