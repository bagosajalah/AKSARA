import React from 'react';
import Modal from './Modal';
import { Users, FileText, LayoutTemplate, MessageSquare, ThumbsUp } from 'lucide-react';

export default function DetailTenantModal({ isOpen, onClose, tenant }) {
  if (!tenant) return null;

  const stats = [
    { label: 'Admin Dinas', value: '3', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    { label: 'Dokumen', value: '25', icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
    { label: 'Widget', value: '1', icon: LayoutTemplate, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
    { label: 'Total Percakapan', value: '5,230', icon: MessageSquare, color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-100' },
    { label: 'Feedback Positif', value: '92%', icon: ThumbsUp, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detail Tenant" maxWidth="max-w-4xl">
      <div className="space-y-8">
        
        {/* Section 1 - Informasi Tenant */}
        <div>
          <h4 className="text-lg font-medium text-gray-800 mb-4 border-b border-gray-100 pb-2">Informasi Tenant</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Nama Dinas</p>
              <p className="text-sm font-medium text-gray-900">{tenant.nama_dinas}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Kode Tenant</p>
              <p className="text-sm font-medium text-gray-900">{tenant.kode_dinas}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Domain Website</p>
              <p className="text-sm font-medium text-blue-600 hover:underline">
                <a href={`https://${tenant.domain}`} target="_blank" rel="noreferrer">{tenant.domain}</a>
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Status</p>
              <p className="text-sm font-medium text-gray-900">{tenant.status}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Dibuat Oleh</p>
              <p className="text-sm font-medium text-gray-900">Super Admin (System)</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Dibuat Pada</p>
              <p className="text-sm font-medium text-gray-900">{tenant.dibuatPada}</p>
            </div>
          </div>
        </div>

        {/* Section 2 - Ringkasan Tenant */}
        <div>
          <h4 className="text-lg font-medium text-gray-800 mb-4 border-b border-gray-100 pb-2">Ringkasan Penggunaan</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className={`p-4 rounded-2xl border ${stat.border} ${stat.bg} flex flex-col items-center justify-center text-center transition-all hover:shadow-sm`}>
                  <div className={`p-2.5 rounded-xl bg-white shadow-sm ${stat.color} mb-3`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-2xl font-medium text-gray-900 mb-1">{stat.value}</p>
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-100 mt-6">
          <button
            className="text-gray-600 bg-white hover:bg-gray-50 border border-black/10 font-medium px-4 py-1.5 text-[13px] rounded-lg shadow-sm transition-all"
            type="button"
            onClick={onClose}
          >
            Tutup
          </button>
        </div>

      </div>
    </Modal>
  );
}
