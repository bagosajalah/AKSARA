import React, { useState } from 'react';
import Modal from './Modal';
import Button from '../ui/Button';

export default function UbahStatusModal({ isOpen, onClose, onSubmit, targetName, currentStatus, targetType }) {
    const [selectedStatus, setSelectedStatus] = useState(currentStatus || 'Active');
    const [reason, setReason] = useState('');

    const handleSubmit = (e) => {
    e.preventDefault();
    console.log("UbahStatusModal - SUBMIT DIKLIK!");
    console.log("selectedStatus:", selectedStatus);
    console.log("reason:", reason);
    console.log("targetName:", targetName);
    console.log("targetType:", targetType);
    
    if (!selectedStatus) {
      alert('Pilih status terlebih dahulu');
      return;
    }
    
    console.log("Memanggil onSubmit dengan:", selectedStatus, reason);
    onSubmit(selectedStatus, reason);
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ubah Status Tenant" maxWidth="max-w-md">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Target</label>
            <p className="text-white font-medium">{targetName || 'Tenant'}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Status Saat Ini</label>
            <p className="text-white font-medium">{currentStatus || 'Active'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Status Baru</label>
            <div className="flex flex-wrap gap-2">
              {['Active', 'Suspended', 'Archived'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setSelectedStatus(status)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    selectedStatus === status
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : 'border-white/10 text-gray-400 hover:border-white/30 hover:text-white'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Alasan Perubahan</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows="3"
              placeholder="Tuliskan alasan perubahan status..."
              className="w-full rounded-xl border border-white/10 bg-[#0D0E10] text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 px-4 py-2.5 outline-none transition-colors resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t border-white/5">
          <Button type="button" onClick={onClose} variant="secondary">Batal</Button>
          <Button type="submit" variant="primary" className="!bg-emerald-500 !text-white hover:!bg-emerald-400">
            Simpan Status
          </Button>
        </div>
      </form>
    </Modal>
  );
}
