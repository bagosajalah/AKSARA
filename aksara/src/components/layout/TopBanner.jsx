import React from 'react';
import { AlertTriangle, LogOut } from 'lucide-react';

export default function TopBanner({ isImpersonating, tenantName, onExitImpersonation }) {
  if (!isImpersonating) return null;

  const displayName = tenantName || 'Tenant';

  return (
    <div className="bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/20 px-4 py-2 flex items-center justify-between">
      {/* Peringatan */}
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
        <AlertTriangle className="w-4 h-4" />
        <span className="text-sm font-medium">
          Mode Impersonasi: Anda sedang bertindak sebagai <strong>{displayName}</strong>
        </span>
      </div>

      {/* Tombol keluar */}
      <button
        onClick={onExitImpersonation}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/20 hover:bg-amber-200 dark:hover:bg-amber-500/30 rounded-lg transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Keluar Impersonasi
      </button>
    </div>
  );
}