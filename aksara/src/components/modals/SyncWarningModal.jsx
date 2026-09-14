import React from 'react';
import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

export default function SyncWarningModal({ isOpen, onClose, onConfirm }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sinkronisasi Ulang Diperlukan">
      <div className="flex flex-col items-center justify-center p-4">
        <div className="bg-red-50 text-red-600 p-4 rounded-full mb-4">
          <AlertTriangle className="w-10 h-10" />
        </div>
        <p className="text-center text-gray-700 text-sm mb-6 max-w-sm">
          Mengubah model akan mengatur ulang seluruh database vektor. Proses ini memakan waktu lama. Lanjutkan?
        </p>
        <div className="flex space-x-3 w-full">
          <button
            className="text-gray-600 bg-white hover:bg-gray-50 border border-black/10 font-medium px-4 py-1.5 text-[13px] rounded-lg shadow-sm transition-all"
            type="button"
            onClick={onClose}
          >
            Batal
          </button>
          <button
            className="bg-orange-600 hover:bg-orange-700 text-white text-[13px] font-medium px-4 py-1.5 rounded-lg shadow-sm border border-orange-700/50 transition-all flex items-center gap-1.5 justify-center"
            type="button"
            onClick={onConfirm}
          >
            Ya, Lanjutkan
          </button>
        </div>
      </div>
    </Modal>
  );
}
