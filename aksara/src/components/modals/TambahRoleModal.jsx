import React, { useState } from 'react';
import { X, Shield, Check } from 'lucide-react';
import Button from '../ui/Button';

const defaultPermissions = {
  tenant: { lihatDaftar: false, tambahTenant: false, hapusTenant: false, killSwitch: false },
  ai: { lihatKonfigurasi: false, editKonfigurasi: false, pantauHealth: false },
  audit: { lihatDaftar: false, unduhDokumen: false, hapusLog: false }
};

const CheckboxItem = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-lg border border-gray-100 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
    <div className="relative flex items-center justify-center">
      <input type="checkbox" checked={checked} onChange={onChange} className="peer appearance-none w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded-md checked:bg-blue-600 checked:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer" />
      <Check className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
    </div>
    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors select-none">{label}</span>
  </label>
);

export default function TambahRoleModal({ isOpen, onClose, onSave, initialData }) {
  const [roleName, setRoleName] = useState('');
  const [permissions, setPermissions] = useState(defaultPermissions);

  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setRoleName(initialData.name);
        setPermissions(initialData.permissions);
      } else {
        setRoleName('');
        setPermissions(defaultPermissions);
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleToggle = (group, key) => {
    setPermissions(prev => ({
      ...prev,
      [group]: {
        ...prev[group],
        [key]: !prev[group][key]
      }
    }));
  };

  const handleGroupToggle = (group, isSelectAll) => {
    setPermissions(prev => {
      const updatedGroup = { ...prev[group] };
      Object.keys(updatedGroup).forEach(k => {
        updatedGroup[k] = isSelectAll;
      });
      return { ...prev, [group]: updatedGroup };
    });
  };

  const handleSave = () => {
    onSave({ name: roleName, permissions });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
      <div className="bg-white dark:bg-[#1A1C20] border border-gray-200 dark:border-gray-800/50 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl transition-colors flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Shield className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {initialData ? 'Edit Akses Role' : 'Tambah Role Baru'}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nama Role</label>
            <input 
              type="text" 
              value={roleName}
              disabled={initialData?.name === 'Owner'}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="Contoh: Tim Support"
              className="w-full bg-white dark:bg-[#131518] border border-gray-300 dark:border-gray-700/50 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Hak Akses (Permissions)</label>
            <div className="space-y-6">
              {/* Tenant Section */}
              <div className="bg-white dark:bg-[#1A1C20] border border-gray-200 dark:border-gray-800/50 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800/50 bg-gray-50 dark:bg-[#131518]">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Manajemen Tenant</h3>
                  <div className="flex items-center gap-3">
                    <button onClick={() => handleGroupToggle('tenant', true)} className="text-xs font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400">Pilih Semua</button>
                    <button onClick={() => handleGroupToggle('tenant', false)} className="text-xs font-medium text-gray-500 hover:text-red-500 dark:text-gray-400">Hapus Semua</button>
                  </div>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <CheckboxItem 
                    label="Lihat Daftar Dinas" 
                    checked={permissions.tenant.lihatDaftar}
                    onChange={() => handleToggle('tenant', 'lihatDaftar')}
                  />
                  <CheckboxItem 
                    label="Tambah Tenant Baru" 
                    checked={permissions.tenant.tambahTenant}
                    onChange={() => handleToggle('tenant', 'tambahTenant')}
                  />
                  <CheckboxItem 
                    label="Hapus Data Tenant" 
                    checked={permissions.tenant.hapusTenant}
                    onChange={() => handleToggle('tenant', 'hapusTenant')}
                  />
                  <CheckboxItem 
                    label="Eksekusi Kill-Switch" 
                    checked={permissions.tenant.killSwitch}
                    onChange={() => handleToggle('tenant', 'killSwitch')}
                  />
                </div>
              </div>

              {/* Platform & AI Section */}
              <div className="bg-white dark:bg-[#1A1C20] border border-gray-200 dark:border-gray-800/50 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800/50 bg-gray-50 dark:bg-[#131518]">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Platform & AI</h3>
                  <div className="flex items-center gap-3">
                    <button onClick={() => handleGroupToggle('ai', true)} className="text-xs font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400">Pilih Semua</button>
                    <button onClick={() => handleGroupToggle('ai', false)} className="text-xs font-medium text-gray-500 hover:text-red-500 dark:text-gray-400">Hapus Semua</button>
                  </div>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <CheckboxItem 
                    label="Lihat Konfigurasi AI" 
                    checked={permissions.ai.lihatKonfigurasi}
                    onChange={() => handleToggle('ai', 'lihatKonfigurasi')}
                  />
                  <CheckboxItem 
                    label="Edit Parameter AI" 
                    checked={permissions.ai.editKonfigurasi}
                    onChange={() => handleToggle('ai', 'editKonfigurasi')}
                  />
                  <CheckboxItem 
                    label="Pantau System Health" 
                    checked={permissions.ai.pantauHealth}
                    onChange={() => handleToggle('ai', 'pantauHealth')}
                  />
                </div>
              </div>

              {/* Audit Section */}
              <div className="bg-white dark:bg-[#1A1C20] border border-gray-200 dark:border-gray-800/50 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800/50 bg-gray-50 dark:bg-[#131518]">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Audit & Keamanan</h3>
                  <div className="flex items-center gap-3">
                    <button onClick={() => handleGroupToggle('audit', true)} className="text-xs font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400">Pilih Semua</button>
                    <button onClick={() => handleGroupToggle('audit', false)} className="text-xs font-medium text-gray-500 hover:text-red-500 dark:text-gray-400">Hapus Semua</button>
                  </div>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <CheckboxItem 
                    label="Lihat Daftar Audit Log" 
                    checked={permissions.audit.lihatDaftar}
                    onChange={() => handleToggle('audit', 'lihatDaftar')}
                  />
                  <CheckboxItem 
                    label="Unduh Dokumen Audit" 
                    checked={permissions.audit.unduhDokumen}
                    onChange={() => handleToggle('audit', 'unduhDokumen')}
                  />
                  <CheckboxItem 
                    label="Hapus Log Histori" 
                    checked={permissions.audit.hapusLog}
                    onChange={() => handleToggle('audit', 'hapusLog')}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-white/5 flex justify-end gap-3 bg-gray-50 dark:bg-transparent transition-colors">
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button variant="primary" onClick={handleSave} disabled={!roleName}>
            {initialData ? 'Simpan Perubahan' : 'Simpan Role'}
          </Button>
        </div>
      </div>
    </div>
  );
}