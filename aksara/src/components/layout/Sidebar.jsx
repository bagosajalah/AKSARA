import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  BrainCircuit, 
  ShieldAlert,
  PanelLeft,
  FileText,
  Settings,
  Activity,
  Command,
  ArrowRightLeft,
  LogOut,
  Sun,
  Moon,
  UserCog
} from 'lucide-react';
import clsx from 'clsx';

export default function Sidebar({ isExpanded = true, onToggle, activeView, onChangeView, currentUser, activeRole = 'super_admin', onLogout, onSwitchRole, theme, toggleTheme }) {

  const [activeMenu, setActiveMenu] = useState(activeRole === 'admin_dinas' ? 'dashboard_dinas' : 'tenant');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const currentActive = activeView || activeMenu;

  const handleMenuClick = (id) => {
    setActiveMenu(id);
    if (onChangeView) onChangeView(id);
  };

  const superAdminNav = [
    {
      category: "UTAMA",
      items: [
        { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
      ]
    },
    {
      category: "EKOSISTEM TENANT",
      items: [
        { id: 'tenant', name: 'Daftar Dinas', icon: Building2 },
        { id: 'admin', name: 'Akun Admin', icon: Users },
        { id: 'staf', name: 'Staf Management', icon: UserCog },
      ]
    },
    {
      category: "PLATFORM & AI",
      items: [
        { id: 'health', name: 'System Health', icon: Activity },
        { id: 'system', name: 'Konfigurasi AI', icon: BrainCircuit },
        { id: 'audit', name: 'Audit Logs', icon: ShieldAlert },
      ]
    }
  ];

  const adminDinasNav = [
    {
      category: "UTAMA",
      items: [
        { id: 'dashboard_dinas', name: 'Dashboard Analitik', icon: LayoutDashboard },
      ]
    },
    {
      category: "PENGATURAN",
      items: [
        { id: 'widget_config', name: 'Integrasi & Chatbot', icon: Settings },
        { id: 'knowledge_base', name: 'Kelola Knowledge Base', icon: BrainCircuit },
        { id: 'riwayat', name: 'Riwayat Interaksi', icon: Activity },
        { id: 'audit_dinas', name: 'Audit Log', icon: ShieldAlert },
      ]
    },
    {
      category: "MANAJEMEN PENGGUNA",
      items: [
        { id: 'warga', name: 'Data Warga', icon: Users },
      ]
    }
  ];

  const navGroups = activeRole === 'admin_dinas' ? adminDinasNav : superAdminNav;

  const displayName = currentUser?.nama_lengkap || currentUser?.name || 'Super Admin';
  const displayRole = activeRole === 'super_admin' ? 'Super Admin' : `${currentUser?.tenant || 'Admin Dinas'}`;
  const userInitial = displayName.charAt(0).toUpperCase();

  return (
    <div 
      className={clsx(
        "flex flex-col h-full bg-white dark:bg-[#141517] border-r border-gray-200 dark:border-white/5 transition-all duration-300 relative z-20 shadow-xl dark:shadow-2xl",
        isExpanded ? "w-64" : "w-20"
      )}
    >
      {/* Header / Logo */}
      <div className={clsx(
        "flex items-center h-16 px-4 border-b border-gray-200 dark:border-white/5",
        isExpanded ? "justify-between" : "justify-center"
      )}>
        {isExpanded && (
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2 text-gray-900 dark:text-white">
              Aksara 
              {activeRole === 'super_admin' && (
                <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-[#10B981]/10 text-emerald-700 dark:text-[#00FF66] text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Super Admin</span>
              )}
              {activeRole === 'admin_dinas' && (
                <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-[#10B981]/10 text-emerald-700 dark:text-[#00FF66] text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Admin</span>
              )}
            </h1>
          </div>
        )}
        
        <button 
          onClick={onToggle}
          className={clsx(
            "rounded-xl transition-colors focus:outline-none flex-shrink-0",
            isExpanded ? "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1" : "text-gray-500 hover:bg-slate-100 dark:hover:bg-gray-800 p-2"
          )}
          title="Toggle Sidebar"
        >
          <PanelLeft className="w-5 h-5" strokeWidth={1.5} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="mb-2">
            {isExpanded ? (
              <div className="text-[11px] font-bold uppercase tracking-wider mt-6 mb-2 px-6 text-gray-500">
                {group.category}
              </div>
            ) : (
              <div className="h-4 mt-6 mb-2 border-b w-8 mx-auto border-gray-200 dark:border-white/5" />
            )}

            <div className="px-3 space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentActive === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleMenuClick(item.id)}
                    title={!isExpanded ? item.name : ""}
                    className={clsx(
                      "flex items-center w-full rounded-xl text-sm transition-colors",
                      isExpanded ? "px-3 py-2.5 gap-3" : "justify-center py-3",
                      isActive 
                        ? "bg-gray-100 dark:bg-[#2A2D31] text-gray-900 dark:text-white font-medium"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                    )}
                  >
                    <Icon className={clsx("w-5 h-5 flex-shrink-0", isActive ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400")} />
                    {isExpanded && (
                      <span className="truncate">{item.name}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* FOOTER - PROFILE + TOGGLE THEME */}
      {isExpanded && (
        <div className="p-3 border-t border-gray-200 dark:border-white/5">
          {/* Popup Menu */}
          {isProfileMenuOpen && (
            <div className="relative mb-2 bg-[#1C1E22] border border-gray-800 rounded-lg shadow-xl overflow-hidden z-50">
              {currentUser?.isGlobalAdmin && (
                <button 
                  onClick={() => {
                    if(onSwitchRole) onSwitchRole();
                    setIsProfileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors text-left border-b border-gray-800"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>{activeRole === 'super_admin' ? 'Switch to Admin Dinas' : 'Switch to Super Admin'}</span>
                </button>
              )}
              <button 
                onClick={() => {
                  localStorage.removeItem('isAuthenticated');
                  if(onLogout) onLogout();
                  setIsProfileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors text-left"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          )}

          {/* Profile + Toggle Theme */}
          <div className="flex items-center gap-2">
            {/* Profile */}
            <div 
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex-1 flex items-center gap-3 px-2 py-1.5 rounded-lg transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-[#25272C] min-w-0"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md">
                {userInitial}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium truncate text-gray-900 dark:text-gray-200 leading-tight">
                  {displayName}
                </span>
                <span className="text-[11px] text-gray-500 truncate leading-tight">
                  {displayRole}
                </span>
              </div>
            </div>

            {/* Toggle Theme */}
            <button
              onClick={toggleTheme}
              className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-[#1C1E22] border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-[#2A2D32] transition-all duration-200 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}