import React from 'react';
import Modal from './Modal';
import Button from '../ui/Button';
import { AlertTriangle, Info } from 'lucide-react';

export default function StatusConfirmationModal({ isOpen, onClose, onConfirm, targetName, targetType, pendingStatus }) {
  const isArchived = pendingStatus === 'Archived';
  const isSuspended = pendingStatus === 'Suspended';
  
  const Icon = isArchived ? AlertTriangle : Info;
  const iconColor = isArchived ? 'text-red-500' : 'text-amber-500';
  const iconBg = isArchived ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20';
  const titleText = isArchived ? `Arsipkan ${targetName}?` : `Tangguhkan ${targetName}?`;
  const confirmText = isArchived ? 'Archive Permanen' : 'Konfirmasi Suspend';
  const btnClasses = isArchived 
    ? '!bg-red-500 !text-white hover:!bg-red-600 !border-none' 
    : '!bg-amber-500 !text-zinc-950 hover:!bg-amber-400 !border-none font-bold';
    
  let warningMessage = '';
  if (isArchived) {
    warningMessage = `PERINGATAN: Anda akan mengarsipkan ${targetType} ini secara permanen. Tindakan ini tidak bisa dibatalkan dan semua data terkait akan diarsipkan. Lanjutkan?`;
  } else if (isSuspended) {
    warningMessage = `Anda akan menangguhkan ${targetType} ini.${targetType === 'Dinas' ? ' Semua tenant di bawahnya akan ikut ditangguhkan.' : ''} Lanjutkan?`;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Konfirmasi Status ${targetType}`} maxWidth="max-w-md">
      <div className="flex flex-col items-center justify-center text-center py-4">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 border ${iconBg}`}>
          <Icon className={`w-8 h-8 ${iconColor}`} />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{titleText}</h3>
        <p className="text-sm text-gray-400 mb-8 px-4 leading-relaxed">
          {warningMessage}
        </p>

        <div className="flex w-full gap-3 pt-6 border-t border-white/5">
          <Button
            type="button"
            onClick={onClose}
            variant="secondary"
            className="flex-1"
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            variant="primary"
            className={`flex-1 ${btnClasses}`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
