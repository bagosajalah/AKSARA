import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import clsx from 'clsx';

export default function KelolaStatusModal({ isOpen, onClose, tenant, onSave }) {
  const [status, setStatus] = useState('Active');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (tenant) {
      setStatus(tenant.status);
      setReason('');
    }
  }, [tenant]);

  if (!tenant) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Kelola Status Tenant" maxWidth="max-w-md">
      <form onSubmit={(e) => { e.preventDefault(); onSave(status); }}>
        <div className="space-y-6 pt-2">
          
          <div className="bg-slate-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Tenant</span>
            <span className="text-sm font-medium text-gray-900">{tenant.nama_dinas}</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Ubah Status</label>
            <div className="grid grid-cols-2 gap-3">
              {['Active', 'Suspended', 'Archived'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setStatus(opt)}
                  className={clsx(
                    "px-4 py-2.5 rounded-xl text-sm font-medium border transition-all",
                    status === opt 
                      ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm" 
                      : "bg-white border-gray-200 text-gray-600 hover:bg-slate-50"
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Catatan / Alasan</label>
            <textarea 
              rows={3} 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full rounded-xl border-gray-200 bg-gray-50 hover:bg-white focus:bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border py-2.5 px-3 transition-colors"
              placeholder="Wajib diisi..."
            ></textarea>
          </div>

        </div>

        <div className="flex items-center justify-end space-x-3 mt-8 pt-4 border-t border-gray-100">
          <button
            className="text-gray-600 bg-white hover:bg-gray-50 border border-black/10 font-medium px-4 py-1.5 text-[13px] rounded-lg shadow-sm transition-all"
            type="button"
            onClick={onClose}
          >
            Batal
          </button>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-medium px-4 py-1.5 rounded-lg shadow-sm border border-blue-700/50 transition-all flex items-center gap-1.5 justify-center"
            type="submit"
          >
            Simpan Status
          </button>
        </div>
      </form>
    </Modal>
  );
}
