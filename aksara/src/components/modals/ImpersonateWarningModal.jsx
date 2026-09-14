import React from 'react';
import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

export default function ImpersonateWarningModal({ isOpen, onClose, tenant, onConfirm }) {
  if (!tenant) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Konfirmasi Impersonasi" maxWidth="max-w-md">
      <div className="flex flex-col items-center text-center space-y-4 pt-4">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-2 shadow-sm border border-red-100">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-medium text-gray-900">Perhatian!</h3>
        <p className="text-gray-600 text-sm leading-relaxed">
          Anda akan masuk ke dalam sesi <strong className="text-gray-900 font-medium">{tenant.nama_dinas}</strong>. Segala aktivitas Anda akan terekam dalam Audit Log atas nama Anda sebagai admin yang melakukan impersonasi.
        </p>
        <p className="text-gray-900 font-medium pt-4">Lanjutkan?</p>
      </div>
      
      <div className="flex items-center justify-end space-x-2 mt-8 pb-2">
        <button
          type="button"
          onClick={onClose}
          className="text-gray-600 bg-white hover:bg-gray-50 border border-black/10 font-medium px-4 py-1.5 text-[13px] rounded-lg shadow-sm transition-all"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={() => onConfirm(tenant)}
          className="bg-red-600 hover:bg-red-700 text-white text-[13px] font-medium px-4 py-1.5 rounded-lg shadow-sm border border-red-700/50 transition-all flex items-center gap-1.5 justify-center"
        >
          Ya, Impersonate
        </button>
      </div>
    </Modal>
  );
}
