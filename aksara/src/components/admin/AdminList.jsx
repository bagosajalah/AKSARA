import React, { useState } from 'react';
import { Search, Plus, Filter, ExternalLink } from 'lucide-react';
import AdminTable from './AdminTable';
import Button from '../ui/Button';
import EditAdminModal from '../modals/EditAdminModal';

export default function AdminList({ 
  admins, 
  onEditAdmin,
  onToggleStatus,
  onPreviewPublicPage,
  onImpersonate,
  tenants = []
}) {
  const [editAdminData, setEditAdminData] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleEditClick = (admin) => {
    console.log("AdminList - Edit diklik:", admin);
    setEditAdminData(admin);
    setIsEditModalOpen(true);
  };

  const handleSaveAdmin = (id, data) => {
    console.log("AdminList - handleSaveAdmin:", { id, data });
    onEditAdmin(id, data);
    setIsEditModalOpen(false);
    setEditAdminData(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
            Daftar Admin Dinas
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 font-normal">
            Kelola akses dan penugasan admin untuk masing-masing tenant.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            onClick={onPreviewPublicPage}
            variant="secondary"
            icon={ExternalLink}
          >
            Preview Halaman Undangan Publik
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1A1C20] border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none rounded-3xl overflow-hidden transition-colors">
        <AdminTable 
          admins={admins}
          onEditAdmin={handleEditClick}
          onToggleStatus={onToggleStatus}
          onImpersonate={onImpersonate}
        />
      </div>

      {/* Edit Admin Modal */}
      <EditAdminModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditAdminData(null);
        }}
        admin={editAdminData}
        onSave={handleSaveAdmin}
        tenants={tenants}
      />
    </div>
  );
}
