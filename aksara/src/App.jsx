import React, { useState, useEffect } from 'react';
import { Plus, MessageSquare } from 'lucide-react';
import api from "./services/api";
import MainLayout from './components/layout/MainLayout';
import TenantList from './components/tenant/TenantList';
import AdminList from './components/admin/AdminList';
import ClaimInvitationPage from './components/public/ClaimInvitationPage';
import MainDashboard from './components/dashboard/MainDashboard';
import AIConfigTab from './components/dashboard/AIConfigTab';
import MonitoringTab from './components/dashboard/MonitoringTab';
import SystemHealthTab from './components/dashboard/SystemHealthTab';
import AuditLogsPage from './components/dashboard/AuditLogsPage';
import DashboardDinas from './components/DashboardDinas';
import AuditLogDinas from './components/AuditLogDinas';
import LoginGateway from './components/public/LoginGateway';
import PublicWidgetSimulation from './components/public/PublicWidgetSimulation';
import StandaloneChat from './components/public/StandaloneChat';
import StafManagement from './components/admin/StafManagement';
import ChatbotWidget from './components/ChatbotWidget';

// Tenant Modals
import TambahTenantModal from './components/modals/TambahTenantModal';
import EditTenantModal from './components/modals/EditTenantModal';
import KelolaStatusModal from './components/modals/KelolaStatusModal';
import DetailTenantModal from './components/modals/DetailTenantModal';
import ImpersonateWarningModal from './components/modals/ImpersonateWarningModal';
import ManajemenWidgetChatbot from './components/ManajemenWidgetChatbot';
import KelolaKnowledgeBase from './components/KelolaKnowledgeBase';
import RiwayatInteraksi from './components/RiwayatInteraksi';
import DataWarga from './components/DataWarga';

// Admin Modals
import UndangAdminModal from './components/modals/UndangAdminModal';
import EditAdminModal from './components/modals/EditAdminModal';

// TRANSFORMASI
const statusMap = {
  'aktif': 'Active',
  'nonaktif': 'Suspended',
  'ditangguhkan': 'Archived',
  'Active': 'Active',
  'Suspended': 'Suspended',
  'Archived': 'Archived'
};

const reverseStatusMap = {
  'Active': 'aktif',
  'Suspended': 'nonaktif',
  'Archived': 'ditangguhkan'
};

const transformTenant = (tenant) => {
  return {
    ...tenant,
    nama_dinas: tenant.nama_dinas || tenant.nama || tenant.nama_dinas,
    kode_dinas: tenant.kode_dinas || tenant.kode || tenant.kode_dinas,
    domain: tenant.domain || '',
    status: statusMap[tenant.status] || 'Active',
    totalTenant: tenant.totalTenant || 0,
    namaAdmin: tenant.nama_admin || tenant.namaAdmin || '',
    createdAt: tenant.createdAt || new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
    totalDokumen: tenant.totalDokumen || 0,
    sesiChat: tenant.sesiChat || 0,
    tenants: Array.isArray(tenant.websites) ? tenant.websites.map(w => ({
      id: w.id,
      nama: w.nama_website || w.nama || '',
      domain: w.url || w.domain || '',
      status: w.status_sync || w.status || 'Active',
    })) : [],
  };
};

const transformAdmin = (admin) => ({
  ...admin,
  nama: admin.nama_lengkap || admin.nama || '',
  tenant: admin.tenant_name || admin.tenant || admin.tenant_nama || '',
  is_active: admin.is_active ?? false,
  status: admin.is_active ? 'Aktif' : 'Nonaktif',
});

function App() {
  const initAuth = localStorage.getItem('isAuthenticated') === 'true';
  const [isLoggedIn, setIsLoggedIn] = useState(initAuth);
  
  const initCurrentUser = JSON.parse(localStorage.getItem('aksara_current_user')) || (initAuth ? { name: 'User', isGlobalAdmin: true } : null);
  const [currentUser, setCurrentUser] = useState(initCurrentUser);
  
  const initActiveRole = localStorage.getItem('aksara_active_role') || (initAuth ? 'super_admin' : null);
  const [activeRole, setActiveRole] = useState(initActiveRole);

  const [activeTenantAdmin, setActiveTenantAdmin] = useState(null);

  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const [activeView, setActiveView] = useState(() => {
    const path = window.location.pathname.replace('/', '');
    
    if (['tenant', 'admin', 'dashboard', 'dashboard_dinas', 'health', 'system', 'audit', 'widget_config', 'knowledge_base', 'riwayat', 'warga', 'public_claim', 'public_widget_simulation', 'aksara-chat-fullscreen', 'login', 'staf'].includes(path)) {
      return path;
    }
    
    if (!initAuth) return 'login';
    if (initActiveRole === 'user') return 'public_widget_simulation';
    return initActiveRole === 'admin_dinas' ? 'dashboard_dinas' : 'tenant';
  });

  // ========== STATE ==========
  const [tenants, setTenants] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tenantSkip, setTenantSkip] = useState(0);
  const [tenantLimit] = useState(50);
  const [tenantHasMore, setTenantHasMore] = useState(true);
  const [tenantTotal, setTenantTotal] = useState(0);

  // ========== API FUNCTIONS ==========
  const loadTenants = async (reset = true, search = '') => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.warn('[loadTenants] No token, skipping...');
      return;
    }

    try {
      setLoading(true);
      const skip = reset ? 0 : tenantSkip;
      const searchParam = search || searchName;
      
      const res = await api.get("/tenants", {
        params: {
          skip: skip,
          limit: tenantLimit,
          search: searchParam || undefined,
          status_filter: appliedSearchStatus || undefined,
        }
      });
      
      const rawData = res.data?.data ?? res.data;
      const list = Array.isArray(rawData) ? rawData : [];
      const transformed = list.map(transformTenant);
      
      const pagination = res.data?.pagination || { total: 0, next: null };
      
      if (reset) {
        setTenants(transformed);
      } else {
        setTenants(prev => [...prev, ...transformed]);
      }
      
      setTenantSkip(skip + tenantLimit);
      setTenantHasMore(pagination.next !== null);
      setTenantTotal(pagination.total || 0);

    } catch (err) {
      console.error("Load Tenant gagal:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadAdmins = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.warn('[loadAdmins] No token, skipping...');
      return;
    }

    try {
      const res = await api.get("/users");
      console.log("Raw response users:", res.data);
      
      const rawData = res.data?.data ?? res.data;
      const list = Array.isArray(rawData) ? rawData : [];
      const transformed = list.map(transformAdmin);
      setAdmins(transformed);
      console.log("DATA ADMIN setelah transform:", transformed);
    } catch (err) {
      console.error("Load Admin gagal", err);
    }
  };

  // ========== LOAD MORE ==========
  const loadMoreTenants = () => {
    if (!loading && tenantHasMore) {
      loadTenants(false);
    }
  };

  // ========== CRUD TENANT ==========
  const handleAddTenant = async (tenantData) => {
    try {
      setLoading(true);
      console.log("Data dari modal:", tenantData);

      const payload = {
        nama_dinas: tenantData.nama,
        kode_dinas: tenantData.kode,
        logo_url: "", 
        deskripsi: tenantData.deskripsi || "",
        status: "aktif",
        nama_admin: tenantData.adminName || "", 
        email_admin: tenantData.adminEmail || "", 
        password_admin: "default123",
      };

      console.log("Payload ke API:", payload);

      const response = await api.post("/tenants", payload);
      console.log("Response:", response.data);
      await loadTenants();
      return true;
    } catch (err) {
      console.error("Gagal tambah tenant:", err);
      
      let errorMsg = "Terjadi kesalahan";
      if (err.response) {
        console.log("Status:", err.response.status);
        console.log("Data:", err.response.data);
        errorMsg = err.response.data?.detail || err.response.data?.message || JSON.stringify(err.response.data);
      } else if (err.request) {
        errorMsg = "Server tidak merespon. Periksa koneksi.";
      } else {
        errorMsg = err.message;
      }
      
      alert(`Gagal menambah tenant: ${errorMsg}`);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleEditTenant = async (id, data) => {
    try {
      setLoading(true);
      console.log("Edit tenant ID:", id);
      console.log("Data dari modal:", data);

      if (!data) {
        console.error("Data tidak ditemukan!");
        alert("Data tidak lengkap. Silakan coba lagi.");
        return;
      }

      const payload = {
        nama_dinas: data.nama_dinas || data.nama || '',
        kode_dinas: data.kode_dinas || data.kode || '',
        deskripsi: data.deskripsi || '',
        status: data.status || 'Active',
        nama_admin: data.namaAdmin || data.nama_admin || '',
      };

      console.log("Payload ke API:", payload);

      const response = await api.put(`/tenants/${id}`, payload);
      console.log("Response:", response.data);
      await loadTenants();
      return true;
    } catch (err) {
      console.error("Gagal update tenant:", err);
      alert("Gagal memperbarui tenant");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTenant = async (id) => {
    if (!window.confirm('Yakin ingin menghapus tenant ini?')) return;
    try {
      setLoading(true);
      await api.delete(`/tenants/${id}`);
      await loadTenants();
    } catch (err) {
      console.error("Gagal hapus tenant:", err);
      alert("Gagal menghapus tenant");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      setLoading(true);
      const backendStatus = reverseStatusMap[newStatus] || newStatus;
      await api.patch(`/tenants/${id}/status`, { status: backendStatus });
      await loadTenants();
    } catch (err) {
      console.error("Gagal update status:", err);
      alert("Gagal mengubah status tenant");
    } finally {
      setLoading(false);
    }
  };

  // ========== CRUD WEBSITE TENANT ==========
  const handleAddWebsite = async (tenantId, websiteData) => {
    try {
      setLoading(true);
      console.log("Tambah website untuk tenant:", tenantId);
      console.log("Data website:", websiteData);

      if (!websiteData.nama || !websiteData.domain) {
        alert("Nama dan domain wajib diisi");
        return false;
      }

      const payload = {
        nama_website: websiteData.nama.trim(),   
        url: websiteData.domain.trim(),          
        status_sync: "synced",                   
      };

      console.log("Payload ke API:", payload);

      const response = await api.post(`/tenants/${tenantId}/websites`, payload);
      console.log("Response:", response.data);
      await loadTenants();
      return true;
    } catch (err) {
      console.error("Gagal tambah website:", err);
      let errorMsg = "Terjadi kesalahan";
      if (err.response) {
        errorMsg = err.response.data?.detail || JSON.stringify(err.response.data);
      }
      alert(`Gagal menambah website: ${errorMsg}`);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleEditWebsite = async (tenantId, websiteId, data) => {
    try {
      setLoading(true);
      console.log("Edit website:", { tenantId, websiteId, data });

      const payload = {};

      if (data.nama || data.nama_website) {
        payload.nama_website = data.nama || data.nama_website;
      }
      if (data.domain || data.url) {
        payload.url = data.domain || data.url;
      }
      if (data.status) {
        const statusMap = {
          'Active': 'synced',
          'Suspended': 'pending',
          'Archived': 'error',
          'synced': 'synced',
          'pending': 'pending',
          'error': 'error',
        };
        payload.status_sync = statusMap[data.status] || data.status;
      }

      console.log("Payload ke API:", payload);

      const response = await api.put(`/tenants/${tenantId}/websites/${websiteId}`, payload);
      console.log("Response:", response.data);
      await loadTenants();
      return true;
    } catch (err) {
      console.error("Gagal update website:", err);
      let errorMsg = "Terjadi kesalahan";
      if (err.response) {
        errorMsg = err.response.data?.detail || JSON.stringify(err.response.data);
      }
      alert(`Gagal memperbarui website: ${errorMsg}`);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWebsite = async (tenantId, websiteId) => {
    try {
      setLoading(true);
      await api.delete(`/tenants/${tenantId}/websites/${websiteId}`);
      await loadTenants();
    } catch (err) {
      console.error("Gagal hapus website:", err);
      alert("Gagal menghapus website");
    } finally {
      setLoading(false);
    }
  };

  // ========== CRUD ADMIN ==========
  const handleUndangAdmin = async (adminData) => {
    try {
      setLoading(true);
      await api.post("/users", {
        email: adminData.email,
        tenant: adminData.tenant,
        is_active: adminData.status === 'Aktif',
      });
      await loadAdmins();
    } catch (err) {
      console.error("Gagal undang admin:", err);
      alert("Gagal mengundang admin");
    } finally {
      setLoading(false);
    }
  };

  const handleEditAdmin = async (id, data) => {
    try {
      setLoading(true);
      console.log("Edit Admin:", { id, data });

      const payload = {
        nama_lengkap: data.nama,
        email: data.email,
        is_active: data.status === 'Aktif',
      };

      if (data.tenant_id) {
        payload.tenant_id = data.tenant_id;
      }
      if (data.nip) {
        payload.nip = data.nip;
      }

      console.log("Payload ke API:", payload);

      await api.put(`/users/${id}`, payload);
      await loadAdmins();
    } catch (err) {
      console.error("Gagal update admin:", err);
      alert("Gagal memperbarui admin");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdminStatus = async (id, newStatus) => {
    try {
      console.log("Toggle admin status:", { id, newStatus });
      const isActive = newStatus === 'Aktif';
      await api.patch(`/users/${id}/status?is_active=${isActive}`);
      await loadAdmins();
    } catch (err) {
      console.error("Gagal toggle status admin:", err);
      alert("Gagal mengubah status admin");
    }
  };

  // ========== SEARCH / FILTER ==========
  const [searchName, setSearchName] = useState('');
  const [searchKode, setSearchKode] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [appliedSearchName, setAppliedSearchName] = useState('');
  const [appliedSearchKode, setAppliedSearchKode] = useState('');
  const [appliedSearchStatus, setAppliedSearchStatus] = useState('');

  const handleApplySearch = () => {
    setAppliedSearchName(searchName);
    setAppliedSearchKode(searchKode);
    setAppliedSearchStatus(searchStatus);

    loadTenants(true, searchName);
  };

  const filteredTenants = tenants.filter(tenant => {
    const matchName = tenant.nama_dinas?.toLowerCase().includes(appliedSearchName.toLowerCase()) ?? true;
    const matchKode = tenant.kode_dinas?.toLowerCase().includes(appliedSearchKode.toLowerCase()) ?? true;
    const matchStatus = appliedSearchStatus === '' || tenant.status === appliedSearchStatus;
    return matchName && matchKode && matchStatus;
  });

  // ========== MODAL STATES ==========
  const [isTambahModalOpen, setIsTambahModalOpen] = useState(false);
  const [editTenantData, setEditTenantData] = useState(null);
  const [kelolaStatusData, setKelolaStatusData] = useState(null);
  const [detailTenantData, setDetailTenantData] = useState(null);
  const [impersonateTenantData, setImpersonateTenantData] = useState(null);

  const [isUndangAdminOpen, setIsUndangAdminOpen] = useState(false);
  const [editAdminData, setEditAdminData] = useState(null);
  const [wizardTenantData, setWizardTenantData] = useState(null);

  // ========== IMPERSONATION ==========
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedTenantName, setImpersonatedTenantName] = useState('');

  const getDefaultTenantCode = () => {
    // Ambil tenant pertama sebagai fallback
    if (tenants.length > 0) {
      return tenants[0].kode_dinas || tenants[0].kode || 'kominfo';
    }
    return 'kominfo';
  };

  const handleConfirmImpersonate = (tenant) => {
    setImpersonateTenantData(null);
    setIsImpersonating(true);
    setImpersonatedTenantName(tenant.nama_dinas);
    const tenantCode = tenant.kode_dinas || tenant.kode || getDefaultTenantCode();
    localStorage.setItem('aksara_impersonated_tenant', tenantCode);
  };

  const handleAdminImpersonate = (admin) => {
    const foundTenant = tenants.find(t => t.nama_dinas === admin.tenant);
    const tenantCode = foundTenant ? foundTenant.kode_dinas : getDefaultTenantCode();
    setIsImpersonating(true);
    setImpersonatedTenantName(admin.tenant || admin.nama_dinas || 'Tenant');
    localStorage.setItem('aksara_impersonated_tenant', tenantCode);
    setActiveView('dashboard_dinas');
  };

  const handleExitImpersonation = () => {
    setIsImpersonating(false);
    setImpersonatedTenantName('');
    localStorage.removeItem('aksara_impersonated_tenant');
    setActiveView('admin');
  };

  // ========== AUTH ==========
  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('aksara_current_user');
    localStorage.removeItem('aksara_active_role');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('aksara_impersonated_tenant');
    setIsLoggedIn(false);
    setCurrentUser(null);
    setActiveRole(null);
    setActiveView('login');
  };

  const handleRoleSwitch = () => {
    if (activeRole === 'super_admin') {
      setActiveRole('admin_dinas');
      localStorage.setItem('aksara_active_role', 'admin_dinas');
      setActiveView('dashboard_dinas');
      setActiveTenantAdmin(getDefaultTenantCode());
    } else if (activeRole === 'admin_dinas') {
      setActiveRole('super_admin');
      localStorage.setItem('aksara_active_role', 'super_admin');
      setActiveView('dashboard');
      setActiveTenantAdmin(null);
    } else {
      setActiveRole('super_admin');
      localStorage.setItem('aksara_active_role', 'super_admin');
      setActiveView('dashboard');
    }
  };

  const openTambahModal = () => {
    setIsTambahModalOpen(true);
  };

  // ====== GET TENANT CODE CHATBOT ======
  const getTenantCode = () => {
    // 1. Cek impersonation
    const impersonated = localStorage.getItem('aksara_impersonated_tenant');
    if (impersonated) return impersonated;

    // 2. Cek user yang login
    const user = JSON.parse(localStorage.getItem('aksara_current_user'));
    if (user?.tenant_id && tenants.length > 0) {
      const tenant = tenants.find(t => t.id === user.tenant_id);
      if (tenant?.kode_dinas) return tenant.kode_dinas;
    }

    // 3. Fallback: Ambil tenant pertama yang ada
    return getDefaultTenantCode();
  };

  // ========== EFFECTS ==========
  useEffect(() => {
    // CEK APAKAH USER SUDAH LOGIN SEBELUM PANGGIL API
    const isLoggedIn = localStorage.getItem('isAuthenticated') === 'true';
    const token = localStorage.getItem('access_token');
    
    if (isLoggedIn && token) {
      console.log('User logged in, loading data...');
      loadTenants(true);
      loadAdmins();
    } else {
      console.log('User not logged in, skipping API calls');
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem('aksara_active_view', activeView);
    if (activeView) {
      window.history.pushState({}, '', '/' + activeView);
    }
  }, [activeView]);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace('/', '');
      if (['tenant', 'admin', 'dashboard', 'dashboard_dinas', 'health', 'system', 'audit', 'widget_config', 'knowledge_base', 'riwayat', 'warga', 'public_claim', 'public_widget_simulation', 'aksara-chat-fullscreen', 'login', 'staf'].includes(path)) {
        setActiveView(path);
      } else if (path === '') {
        const auth = localStorage.getItem('isAuthenticated') === 'true';
        const role = localStorage.getItem('aksara_active_role');
        if (!auth) setActiveView('login');
        else if (role === 'user') setActiveView('public_widget_simulation');
        else setActiveView(role === 'admin_dinas' ? 'dashboard_dinas' : 'tenant');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // ========== RENDER ==========
  if (activeView === 'public_claim') {
    return <ClaimInvitationPage onBackToDashboard={() => setActiveView('admin')} />;
  }

  if (activeView === 'aksara-chat-fullscreen') {
    return <StandaloneChat />;
  }

  if (activeView === 'public_widget_simulation' || activeRole === 'user') {
    return (
      <PublicWidgetSimulation 
        onLogout={() => {
          handleLogout();
        }}
      />
    );
  }

  if (!isLoggedIn || activeView === 'login') {
    return (
      <LoginGateway 
        onLoginSuperAdmin={async (role = 'super_admin', tenant = null, tokenData = null) => {
          if (tokenData) {
            localStorage.setItem('access_token', tokenData.access_token);
            localStorage.setItem('refresh_token', tokenData.refresh_token);
          }

          localStorage.setItem('isAuthenticated', 'true');
          setIsLoggedIn(true);

          await new Promise(resolve => setTimeout(resolve, 100));
          
          // SETELAH LOGIN, LOAD DATA
          await loadTenants();
          await loadAdmins();

          if (role === 'admin_dinas') {
            const tenantId = tokenData?.user?.tenant_id || tenant;
            let tenantName = 'Dinas';
            
            if (tenantId && tenants.length > 0) {
              const found = tenants.find(t => t.id === tenantId);
              if (found) {
                tenantName = found.nama_dinas || found.nama || 'Dinas';
              }
            }
            
            const userName = tokenData?.user?.nama_lengkap || 'Admin Dinas';
            
            const user = { 
              name: userName, 
              isGlobalAdmin: false, 
              tenant: tenantName,
              tenant_id: tenantId,
              email: tokenData?.user?.email || '',
            };
            setCurrentUser(user);
            setActiveRole('admin_dinas');
            localStorage.setItem('aksara_current_user', JSON.stringify(user));
            localStorage.setItem('aksara_active_role', 'admin_dinas');
            setActiveTenantAdmin(tenantName);
            setActiveView('dashboard_dinas');
            if (tenantId) {
              localStorage.setItem('aksara_impersonated_tenant', tenantId);
            }
          } else if (role === 'user') {
            const user = { 
              name: 'Public User', 
              isGlobalAdmin: false,
              email: tokenData?.user?.email || '',
            };
            setCurrentUser(user);
            setActiveRole('user');
            localStorage.setItem('aksara_current_user', JSON.stringify(user));
            localStorage.setItem('aksara_active_role', 'user');
            setActiveView('public_widget_simulation');
          } else {
            const user = tokenData?.user ? {
              name: tokenData.user.nama_lengkap || tokenData.user.name || 'Super Admin',
              isGlobalAdmin: true,
              tenant: null,
              tenant_id: null,
              email: tokenData.user.email || '',
            } : { 
              name: 'Super Admin', 
              isGlobalAdmin: true 
            };
          
            setCurrentUser(user);
            setActiveRole('super_admin');
            localStorage.setItem('aksara_current_user', JSON.stringify(user));
            localStorage.setItem('aksara_active_role', 'super_admin');
            setActiveView('dashboard');
          }
        }}
        onPreviewPublicPage={() => {
          setIsLoggedIn(true);
          setActiveView('public_claim');
        }}
      />
    );
  }

  return (
    <MainLayout 
      isImpersonating={isImpersonating || activeRole === 'admin_dinas'}
      impersonatedTenantName={impersonatedTenantName || (activeRole === 'admin_dinas' && activeTenantAdmin ? activeTenantAdmin.toUpperCase() : '')}
      onExitImpersonation={handleExitImpersonation}
      activeView={activeView}
      onChangeView={setActiveView}
      currentUser={currentUser}
      activeRole={activeRole}
      onLogout={handleLogout}
      onSwitchRole={handleRoleSwitch}
      theme={theme}
      toggleTheme={toggleTheme}
    >
      
      {activeView === 'dashboard_dinas' ? (
        <DashboardDinas onChangeView={setActiveView} />
      ) : activeView === 'widget_config' ? (
        <ManajemenWidgetChatbot onExitImpersonate={activeRole === 'super_admin' ? handleExitImpersonation : null} />
      ) : activeView === 'knowledge_base' ? (
        <KelolaKnowledgeBase />
      ) : activeView === 'riwayat' ? (
        <RiwayatInteraksi />
      ) : activeView === 'warga' ? (
        <DataWarga onChangeView={setActiveView} />
      ) : activeView === 'audit_dinas' ? (
        <AuditLogDinas />
      ) : activeView === 'staf' ? (
        <StafManagement />
      ) : activeView === 'tenant' ? (
        <>
          <TenantList 
            tenants={filteredTenants}
            searchName={searchName}
            setSearchName={setSearchName}
            searchKode={searchKode}
            setSearchKode={setSearchKode}
            searchStatus={searchStatus}
            setSearchStatus={setSearchStatus}
            onSearch={handleApplySearch}
            onViewDetail={(tenant) => setDetailTenantData(tenant)}
            onEditTenant={(id, data) => handleEditTenant(id, data)}
            onManageStatus={(tenant) => setKelolaStatusData(tenant)}
            onAddTenant={openTambahModal}
            onDeleteTenant={handleDeleteTenant}
            onUpdateStatus={handleUpdateStatus}
            onAddWebsite={handleAddWebsite}
            onEditWebsite={handleEditWebsite}
            onDeleteWebsite={handleDeleteWebsite}
            loading={loading}
            hasMore={tenantHasMore}
            onLoadMore={loadMoreTenants}
            totalData={tenantTotal}
          />
        </>
      ) : activeView === 'admin' ? (
        <AdminList 
          admins={admins}
          tenants={tenants}
          onEditAdmin={handleEditAdmin}
          onToggleStatus={handleToggleAdminStatus}
          onPreviewPublicPage={() => setActiveView('public_claim')}
          onImpersonate={handleAdminImpersonate}
        />
      ) : activeView === 'dashboard' ? (
        <MainDashboard onViewLogs={() => setActiveView('audit')} />
      ) : activeView === 'health' ? (
        <SystemHealthTab />
      ) : activeView === 'system' ? (
        <AIConfigTab />
      ) : activeView === 'audit' ? (
        <AuditLogsPage />
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-2xl font-medium text-gray-800 mb-4">Halaman belum tersedia</h2>
        </div>
      )}

      {/* Tombol buka StandaloneChat */}
      <button
        onClick={() => window.open('/aksara-chat-fullscreen', '_blank')}
        className="fixed bottom-28 right-6 z-[999] p-3 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-colors"
      >
        <MessageSquare className="w-5 h-5" />
      </button>
      
      {/* ===== CHATBOT WIDGET MUNCUL DI SEMUA HALAMAN ===== */}
      <ChatbotWidget tenantCode={getTenantCode()} />

      {/* Render Tenant Modals */}
      <TambahTenantModal 
        isOpen={isTambahModalOpen} 
        onClose={() => setIsTambahModalOpen(false)}
        onSave={handleAddTenant}
      />
      <EditTenantModal 
        isOpen={!!editTenantData}
        onClose={() => setEditTenantData(null)}
        tenant={editTenantData}
        onSave={handleEditTenant}
      />
      <KelolaStatusModal 
        isOpen={!!kelolaStatusData}
        onClose={() => setKelolaStatusData(null)}
        tenant={kelolaStatusData}
        onSave={handleUpdateStatus}
      />
      <DetailTenantModal 
        isOpen={!!detailTenantData}
        onClose={() => setDetailTenantData(null)}
        tenant={detailTenantData}
      />
      <ImpersonateWarningModal 
        isOpen={!!impersonateTenantData}
        onClose={() => setImpersonateTenantData(null)}
        tenant={impersonateTenantData}
        onConfirm={handleConfirmImpersonate}
      />

      {/* Render Admin Modals */}
      <UndangAdminModal 
        isOpen={isUndangAdminOpen}
        onClose={() => setIsUndangAdminOpen(false)}
        onSave={handleUndangAdmin}
        tenantName={typeof wizardTenantData === 'object' ? wizardTenantData?.nama : (wizardTenantData || '')}
      />
      <EditAdminModal
        isOpen={!!editAdminData}
        onClose={() => setEditAdminData(null)}
        admin={editAdminData}
        onSave={handleEditAdmin}
        tenants={tenants}
      />

    </MainLayout>
  );
}

export default App;