import React from 'react';
import { Edit2, UserCog, VenetianMask } from 'lucide-react';
import AdminToggle from './AdminToggle';

export default function AdminTable({ 
  admins, 
  onEditAdmin, 
  onToggleStatus, 
  onImpersonate 
}) {
  // FUNGSI TOGGLE MASK TANPA ALERT
  const toggleMask = (adminId) => {
    const maskKey = `mask_admin_${adminId}`;
    const isMasked = localStorage.getItem(maskKey) === 'true';
    const newState = !isMasked;
    localStorage.setItem(maskKey, String(newState));
    window.location.reload();
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#131518]">
            <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Nama Pegawai
            </th>
            <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Email
            </th>
            <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Dinas (Tenant)
            </th>
            <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Status Akses
            </th>
            <th className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider text-center">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
          {admins.map((admin) => {
            // CEK STATUS MASK
            const isMasked = localStorage.getItem(`mask_admin_${admin.id}`) === 'true';
            const displayName = isMasked ? '••••••••' : (admin.nama || '-');
            const displayEmail = isMasked ? '••••••••@•••••••' : admin.email;

            return (
              <tr key={admin.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">
                  {displayName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-400">
                  {displayEmail}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-400">
                  {admin.role === 'super_admin' ? (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">Super Admin</span>
                  ) : (
                    admin.tenant || '-'
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {admin.role === 'super_admin' ? (
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                      Super Admin
                    </span>
                  ) : (
                    <AdminToggle 
                      checked={admin.is_active === true || admin.status === 'Aktif'}
                      onToggle={() => {
                        const newStatus = admin.is_active ? 'Nonaktif' : 'Aktif';
                        console.log("AdminTable - toggle clicked:", { id: admin.id, newStatus });
                        if (onToggleStatus) {
                          onToggleStatus(admin.id, newStatus);
                        }
                      }}
                    />
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button 
                      onClick={() => onEditAdmin(admin)}
                      className="p-1.5 text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 rounded border border-white/5 transition-colors" 
                      title="Edit Admin"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onImpersonate(admin)}
                      className={`p-1.5 rounded border border-white/5 transition-colors ${
                        admin.role === 'super_admin' 
                          ? 'text-gray-500 opacity-50 cursor-not-allowed' 
                          : 'text-purple-500 hover:text-white hover:bg-purple-500/20'
                      }`} 
                      title={admin.role === 'super_admin' ? 'Tidak dapat impersonate Super Admin' : 'Impersonate'}
                      disabled={admin.role === 'super_admin'}
                    >
                      <UserCog className="w-4 h-4" />
                    </button>
                    {/* TOMBOL MASK */}
                    <button 
                      onClick={() => toggleMask(admin.id)}
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
      </table>
    </div>
  );
}