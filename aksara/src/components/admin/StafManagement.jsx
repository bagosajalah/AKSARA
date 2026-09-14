import React, { useState, useEffect } from 'react';
import { Plus, UserPlus, Shield, Check, Trash2, MoreVertical, Edit2, X } from 'lucide-react';
import Button from '../ui/Button';
import TambahRoleModal from '../modals/TambahRoleModal';
import { roleService } from '../../services/role.service';
import { userService } from '../../services/user.service';

// ===== DEFAULT PERMISSIONS =====
const defaultPermissions = {
  tenant: { lihatDaftar: false, tambahTenant: false, hapusTenant: false, killSwitch: false },
  ai: { lihatKonfigurasi: false, editKonfigurasi: false, pantauHealth: false },
  audit: { lihatDaftar: false, unduhDokumen: false, hapusLog: false }
};

export default function StafManagement() {
  const [activeTab, setActiveTab] = useState('roles');
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [roleModalConfig, setRoleModalConfig] = useState({ isOpen: false, initialData: null });
  const [staffModalConfig, setStaffModalConfig] = useState({ isOpen: false, initialData: null });
  const [deleteConfig, setDeleteConfig] = useState({ isOpen: false, type: '', id: null, name: '' });
  
  const [roles, setRoles] = useState([]);
  const [staffList, setStaffList] = useState([]);

  // ===== PAGINATION STATE =====
  const [roleSkip, setRoleSkip] = useState(0);
  const [roleLimit] = useState(50);
  const [roleHasMore, setRoleHasMore] = useState(true);
  const [roleTotal, setRoleTotal] = useState(0);

  const [userSkip, setUserSkip] = useState(0);
  const [userLimit] = useState(50);
  const [userHasMore, setUserHasMore] = useState(true);
  const [userTotal, setUserTotal] = useState(0);

  // ===== LOAD ROLES =====
  const loadRoles = async (reset = true) => {
    try {
      setLoading(true);
      const skip = reset ? 0 : roleSkip;
      
      const res = await roleService.getRoles(skip, roleLimit);
      const rawData = res.data?.data || res.data || [];
      const pagination = res.data?.pagination || { total: 0, next: null };
      
      if (reset) {
        setRoles(rawData);
      } else {
        setRoles(prev => [...prev, ...rawData]);
      }
      
      setRoleSkip(skip + roleLimit);
      setRoleHasMore(pagination.next !== null);
      setRoleTotal(pagination.total || 0);
    } catch (err) {
      console.error('Gagal load roles:', err);
    } finally {
      setLoading(false);
    }
  };

  // ===== LOAD USERS =====
  const loadUsers = async (reset = true) => {
    try {
      const skip = reset ? 0 : userSkip;
      
      const res = await userService.getUsers(skip, userLimit);
      const rawData = res.data?.data || res.data || [];
      const pagination = res.data?.pagination || { total: 0, next: null };
      
      const staff = rawData.map(user => ({
        id: user.id,
        name: user.nama_lengkap || '-',
        email: user.email,
        status: user.is_active ? 'Aktif' : 'Nonaktif',
        roleIds: user.roles?.map(r => r.id) || [],
        roles: user.roles || [],
      }));
      
      if (reset) {
        setStaffList(staff);
      } else {
        setStaffList(prev => [...prev, ...staff]);
      }
      
      setUserSkip(skip + userLimit);
      setUserHasMore(pagination.next !== null);
      setUserTotal(pagination.total || 0);
    } catch (err) {
      console.error('Gagal load users:', err);
    }
  };

  // ===== LOAD MORE =====
  const loadMoreRoles = () => {
    if (!loading && roleHasMore) {
      loadRoles(false);
    }
  };

  const loadMoreUsers = () => {
    if (!loading && userHasMore) {
      loadUsers(false);
    }
  };

  // ===== INITIAL LOAD =====
  useEffect(() => {
    loadRoles(true);
    loadUsers(true);
  }, []);

  // ===== CRUD HANDLERS =====
  const handleSaveRole = async (roleData) => {
    try {
      if (roleModalConfig.initialData) {
        await roleService.updateRole(roleModalConfig.initialData.id, roleData);
      } else {
        await roleService.createRole(roleData);
      }
      await loadRoles(true);
      setRoleModalConfig({ isOpen: false, initialData: null });
    } catch (err) {
      console.error('Gagal simpan role:', err);
      alert(err.response?.data?.detail || 'Gagal menyimpan role');
    }
  };

  const handleDeleteRole = async (id) => {
    try {
      await roleService.deleteRole(id);
      await loadRoles(true);
      setDeleteConfig({ isOpen: false, type: '', id: null, name: '' });
    } catch (err) {
      console.error('Gagal hapus role:', err);
      alert(err.response?.data?.detail || 'Gagal menghapus role');
    }
  };

  const handleSaveStaff = async (staffData) => {
    try {
      if (staffModalConfig.initialData) {
        await userService.updateUser(staffModalConfig.initialData.id, {
          nama_lengkap: staffData.name,
          is_active: staffData.status === 'Aktif',
        });
        await roleService.assignRolesToUser(staffModalConfig.initialData.id, staffData.roleIds);
      } else {
        const userRes = await userService.createUser({
          email: staffData.email,
          nama_lengkap: staffData.name || '-',
          password: 'default123',
          is_active: staffData.status === 'Aktif',
        });
        if (staffData.roleIds.length > 0) {
          await roleService.assignRolesToUser(userRes.data.id, staffData.roleIds);
        }
      }
      await loadUsers(true);
      setStaffModalConfig({ isOpen: false, initialData: null });
    } catch (err) {
      console.error('Gagal simpan staff:', err);
      alert(err.response?.data?.detail || 'Gagal menyimpan staff');
    }
  };

  const handleDeleteStaff = async (id) => {
    try {
      await userService.deleteUser(id);
      await loadUsers(true);
      setDeleteConfig({ isOpen: false, type: '', id: null, name: '' });
    } catch (err) {
      console.error('Gagal hapus staff:', err);
      alert(err.response?.data?.detail || 'Gagal menghapus staff');
    }
  };

  const getRoleUserCount = (roleId) => staffList.filter(s => s.roleIds.includes(roleId)).length;

  // ===== DROPDOWN =====
  const toggleDropdown = (id) => {
    console.log('Toggle dropdown:', id);
    setOpenDropdownId(prev => prev === id ? null : id);
  };

  const handleEditRole = (role) => {
    console.log('Edit role:', role);
    setOpenDropdownId(null);
    setRoleModalConfig({ isOpen: true, initialData: role });
  };

  const handleDeleteRoleClick = (role) => {
    console.log('Delete role:', role);
    setOpenDropdownId(null);
    setDeleteConfig({ isOpen: true, type: 'role', id: role.id, name: role.name });
  };

  const handleEditStaff = (staff) => {
    console.log('Edit staff:', staff);
    setOpenDropdownId(null);
    setStaffModalConfig({ isOpen: true, initialData: staff });
  };

  const handleDeleteStaffClick = (staff) => {
    console.log('Delete staff:', staff);
    setOpenDropdownId(null);
    setDeleteConfig({ isOpen: true, type: 'staff', id: staff.id, name: staff.name !== '-' ? staff.name : staff.email });
  };

  // ===== RENDER ROLES TAB =====
  const renderRolesTab = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Daftar Role</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Kelola grup perizinan untuk memberikan hak akses kepada staf.</p>
        </div>
        <Button onClick={() => setRoleModalConfig({ isOpen: true, initialData: null })} icon={Plus} className="bg-emerald-600 hover:bg-emerald-500 text-white">Tambah Role</Button>
      </div>

      <div className="bg-white dark:bg-[#1A1C20] border border-gray-200 dark:border-gray-800/50 rounded-2xl overflow-visible shadow-sm">
        <div className="overflow-x-auto" style={{ overflow: 'visible' }}>
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800/50">
            <thead className="bg-gray-50 dark:bg-[#131518]">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Nama Role</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Jumlah Staf</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Dibuat Pada</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Hak Akses Utama</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-transparent divide-y divide-gray-200 dark:divide-gray-800/50">
              {roles.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-sm text-gray-500">Belum ada role.</td></tr>
              ) : (
                roles.map((role) => {
                  const isOwner = role.name === 'Owner';
                  const dropdownId = `role-${role.id}`;
                  const isOpen = openDropdownId === dropdownId;

                  return (
                    <tr key={role.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <Shield className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{role.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{getRoleUserCount(role.id)} Pengguna</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isOwner || !role.created_at ? (
                          <span className="text-sm text-gray-400">—</span>
                        ) : (
                          <span className="text-xs text-gray-500">{new Date(role.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-2">
                          {role.permissions?.tenant?.lihatDaftar && <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400">Manajemen Tenant</span>}
                          {role.permissions?.ai?.lihatKonfigurasi && <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">Platform AI</span>}
                          {role.permissions?.audit?.lihatDaftar && <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400">Audit Keamanan</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {!isOwner && (
                          <div className="relative inline-block text-left" style={{ zIndex: 999 }}>
                            <button
                              onClick={() => toggleDropdown(dropdownId)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>
                            {isOpen && (
                              <div 
                                className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1A1C20] border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-[9999] py-1"
                                style={{ minWidth: '180px' }}
                              >
                                <button
                                  onClick={() => handleEditRole(role)}
                                  className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2"
                                >
                                  <Edit2 className="w-4 h-4" /> Edit Hak Akses
                                </button>
                                <button
                                  onClick={() => handleDeleteRoleClick(role)}
                                  className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" /> Hapus Role
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* ✅ TOMBOL LOAD MORE ROLES */}
            {roleHasMore && (
              <tfoot>
                <tr>
                  <td colSpan="5">
                    <div className="flex justify-center py-4">
                      <button
                        onClick={loadMoreRoles}
                        disabled={loading}
                        className="px-6 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {loading ? 'Memuat...' : `Muat Lebih Banyak (${roles.length}/${roleTotal})`}
                      </button>
                    </div>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );

  // ===== RENDER USERS TAB =====
  const renderUsersTab = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Daftar User</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Direktori semua pengguna dan penugasan role staf.</p>
        </div>
        <Button onClick={() => setStaffModalConfig({ isOpen: true, initialData: null })} icon={UserPlus} className="bg-blue-600 hover:bg-blue-500 text-white">Undang Staf / User Baru</Button>
      </div>

      <div className="bg-white dark:bg-[#1A1C20] border border-gray-200 dark:border-gray-800/50 rounded-2xl overflow-visible shadow-sm">
        <div className="overflow-x-auto" style={{ overflow: 'visible' }}>
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800/50">
            <thead className="bg-gray-50 dark:bg-[#131518]">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Nama & Email</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Role yang Dimiliki</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-transparent divide-y divide-gray-200 dark:divide-gray-800/50">
              {staffList.length === 0 ? (
                <tr><td colSpan="4" className="px-6 py-8 text-center text-sm text-gray-500">Belum ada user.</td></tr>
              ) : (
                staffList.map((staff) => {
                  const hasOwnerRole = staff.roleIds.some(rid => roles.find(r => r.id === rid)?.name === 'Owner');
                  const dropdownId = `staff-${staff.id}`;
                  const isOpen = openDropdownId === dropdownId;

                  return (
                    <tr key={staff.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-sm">
                            {staff.name === '-' ? staff.email.substring(0,2).toUpperCase() : staff.name.split(' ').map(n=>n[0]).join('').substring(0,2)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-bold text-gray-900 dark:text-white">{staff.name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{staff.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${
                          staff.status === 'Aktif' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' : 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${staff.status === 'Aktif' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                          {staff.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-2">
                          {staff.roleIds.length === 0 ? (
                            <span className="text-xs text-gray-400 italic">Tanpa Role</span>
                          ) : (
                            staff.roleIds.map(rid => {
                              const role = roles.find(r => r.id === rid);
                              return role ? (
                                <span key={rid} className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">{role.name}</span>
                              ) : null;
                            })
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {!hasOwnerRole && (
                          <div className="relative inline-block text-left" style={{ zIndex: 999 }}>
                            <button
                              onClick={() => toggleDropdown(dropdownId)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>
                            {isOpen && (
                              <div 
                                className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1A1C20] border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-[9999] py-1"
                                style={{ minWidth: '180px' }}
                              >
                                <button
                                  onClick={() => handleEditStaff(staff)}
                                  className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2"
                                >
                                  <Edit2 className="w-4 h-4" /> Edit User
                                </button>
                                <button
                                  onClick={() => handleDeleteStaffClick(staff)}
                                  className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" /> Hapus User
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* ✅ TOMBOL LOAD MORE USERS */}
            {userHasMore && (
              <tfoot>
                <tr>
                  <td colSpan="4">
                    <div className="flex justify-center py-4">
                      <button
                        onClick={loadMoreUsers}
                        disabled={loading}
                        className="px-6 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {loading ? 'Memuat...' : `Muat Lebih Banyak (${staffList.length}/${userTotal})`}
                      </button>
                    </div>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );

  // ===== MAIN RETURN =====
  return (
    <>
      <div className="mb-8 border-b border-gray-200 dark:border-gray-800">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('roles')}
            className={`pb-4 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'roles' ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Daftar Role
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-4 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'users' ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Daftar User
          </button>
        </nav>
      </div>

      {activeTab === 'roles' && renderRolesTab()}
      {activeTab === 'users' && renderUsersTab()}

      <TambahRoleModal
        isOpen={roleModalConfig.isOpen}
        initialData={roleModalConfig.initialData}
        onClose={() => setRoleModalConfig({ isOpen: false, initialData: null })}
        onSave={handleSaveRole}
      />

      {staffModalConfig.isOpen && (
        <StaffModal
          isOpen={staffModalConfig.isOpen}
          initialData={staffModalConfig.initialData}
          roles={roles}
          onClose={() => setStaffModalConfig({ isOpen: false, initialData: null })}
          onSave={handleSaveStaff}
        />
      )}

      {deleteConfig.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1A1C20] rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl border border-gray-200 dark:border-gray-800">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Konfirmasi Hapus</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {deleteConfig.type === 'role' 
                ? `Hapus Role "${deleteConfig.name}"? ${getRoleUserCount(deleteConfig.id)} staf akan kehilangan akses.`
                : `Hapus user "${deleteConfig.name}" dari sistem?`}
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="ghost" onClick={() => setDeleteConfig({ isOpen: false, type: '', id: null, name: '' })}>Batal</Button>
              <Button
                onClick={() => {
                  if (deleteConfig.type === 'role') handleDeleteRole(deleteConfig.id);
                  else handleDeleteStaff(deleteConfig.id);
                }}
                className="bg-red-600 hover:bg-red-500 text-white border-transparent"
              >
                Ya, Hapus
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ===== STAFF MODAL =====
function StaffModal({ isOpen, initialData, roles, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    status: 'Pending',
    roleIds: []
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name === '-' ? '' : initialData.name,
        email: initialData.email,
        status: initialData.status,
        roleIds: initialData.roleIds || []
      });
    } else {
      setFormData({ name: '', email: '', status: 'Pending', roleIds: [] });
    }
  }, [initialData]);

  if (!isOpen) return null;

  const toggleRole = (roleId) => {
    setFormData(prev => ({
      ...prev,
      roleIds: prev.roleIds.includes(roleId) 
        ? prev.roleIds.filter(id => id !== roleId)
        : [...prev.roleIds, roleId]
    }));
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1A1C20] border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {initialData ? 'Edit User' : 'Undang User Baru'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">Nama Lengkap</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="Cth: Budi Santoso"
              className="w-full bg-white dark:bg-[#131518] border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">Email Staf</label>
            <input 
              type="email" 
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              placeholder="Cth: staf@domain.go.id"
              className="w-full bg-white dark:bg-[#131518] border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-900 dark:text-white mb-3">Penugasan Role</label>
            <div className="space-y-3">
              {roles.filter(r => r.name !== 'Owner').map(role => (
                <label key={role.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer">
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      checked={formData.roleIds.includes(role.id)}
                      onChange={() => toggleRole(role.id)}
                      className="peer appearance-none w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded-md checked:bg-blue-600 checked:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                    />
                    <Check className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
                  </div>
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-300">{role.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3 bg-gray-50 dark:bg-transparent">
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={() => onSave({ ...formData, name: formData.name || '-' })} disabled={!formData.email} className="bg-blue-600 hover:bg-blue-500 text-white border-transparent">
            {initialData ? 'Simpan Perubahan' : 'Undang User'}
          </Button>
        </div>
      </div>
    </div>
  );
}
