import React from 'react';
import { Eye, Edit2, ShieldAlert, VenetianMask } from 'lucide-react';

export default function TenantTable({ 
  tenants, 
  onViewDetail, 
  onEditTenant, 
  onManageStatus 
}) {
  const getStatusBadge = (status) => {
    switch(status) {
      case 'Active':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">Active</span>;
      case 'Pending':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700">Pending</span>;
      case 'Suspended':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">Suspended</span>;
      case 'Archived':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">Archived</span>;
      default:
        return null;
    }
  };

  // Toggle mask
  const toggleMask = (tenantId, tenantName) => {
    const maskKey = `mask_tenant_${tenantId}`;
    const isMasked = localStorage.getItem(maskKey) === 'true';
    const newState = !isMasked;
    localStorage.setItem(maskKey, String(newState));
    alert(`🔒 Masking untuk "${tenantName}" ${newState ? 'diaktifkan' : 'dinonaktifkan'}!`);
    window.location.reload();
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800/50">
        <thead className="bg-gray-50 dark:bg-[#131518]">
          <tr>
            <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Nama Dinas</th>
            <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Kode Tenant</th>
            <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Status</th>
            <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Domain</th>
            <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Dibuat Pada</th>
            <th scope="col" className="px-6 py-4 text-center text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Aksi</th>
          </tr>
        </thead>
        <tbody className="bg-transparent divide-y divide-gray-200 dark:divide-gray-800/50">
          {tenants.map((tenant) => {
            const isMasked = localStorage.getItem(`mask_tenant_${tenant.id}`) === 'true';
            const displayName = isMasked ? '••••••••' : tenant.nama_dinas;

            return (
              <tr key={tenant.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-medium shadow-sm">
                      {displayName.charAt(0)}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{displayName}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 font-medium">
                  {isMasked ? '••••••' : tenant.kode_dinas}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(tenant.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline">
                  <a href={`https://${tenant.domain}`} target="_blank" rel="noreferrer">
                    {isMasked ? '••••••••.go.id' : tenant.domain}
                  </a>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                  {tenant.dibuatPada}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                  <div className="flex items-center justify-center space-x-2">
                    <button 
                      onClick={() => onViewDetail(tenant)}
                      className="p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-800/80 hover:text-gray-900 dark:hover:text-zinc-200 rounded-md transition-colors"
                      title="Detail"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onEditTenant(tenant)}
                      className="p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-800/80 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onManageStatus(tenant)}
                      className="p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-800/80 hover:text-orange-600 dark:hover:text-orange-400 rounded-md transition-colors"
                      title="Kelola Status"
                    >
                      <ShieldAlert className="w-4 h-4" />
                    </button>
                    {/* TOMBOL MASK */}
                    <button 
                      onClick={() => toggleMask(tenant.id, tenant.nama_dinas)}
                      className={`p-1.5 rounded border border-white/5 transition-colors ${
                        isMasked 
                          ? 'text-emerald-500 bg-emerald-500/20 border-emerald-500/30 hover:bg-emerald-500/30' 
                          : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-800/80 hover:text-gray-900 dark:hover:text-zinc-200'
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
          {tenants.length === 0 && (
            <tr>
              <td colSpan="6" className="px-6 py-12 text-center text-gray-400 bg-transparent">
                <div className="flex flex-col items-center justify-center">
                  <span className="text-lg font-medium text-gray-900 dark:text-white mb-1">Tidak ada tenant ditemukan</span>
                  <p className="text-sm">Coba sesuaikan kata kunci pencarian atau filter Anda.</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}