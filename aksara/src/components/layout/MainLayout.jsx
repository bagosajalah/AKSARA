import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopBanner from './TopBanner';
import clsx from 'clsx';

export default function MainLayout({ 
  children, 
  activeView, 
  onChangeView, 
  isImpersonating, 
  impersonatedTenantName, 
  onExitImpersonation,
  currentUser,
  activeRole,
  onLogout,
  onSwitchRole,
  theme,
  toggleTheme
}) {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarExpanded(!isSidebarExpanded);
  };

  const displayRole = isImpersonating ? 'admin_dinas' : activeRole;

  return (
    <div className={clsx(
      "font-sans antialiased transition-colors duration-500 flex h-screen w-full overflow-hidden bg-gray-50 dark:bg-[#0D0F12]"
    )}>
      <Sidebar 
        isExpanded={isSidebarExpanded} 
        onToggle={toggleSidebar} 
        activeView={activeView} 
        onChangeView={onChangeView} 
        currentUser={currentUser}
        activeRole={displayRole}
        onLogout={onLogout} 
        onSwitchRole={onSwitchRole}
        theme={theme}
        toggleTheme={toggleTheme}
      />
      <div className="flex flex-col flex-1 h-full overflow-hidden transition-all duration-300">
        <TopBanner 
          isImpersonating={isImpersonating} 
          tenantName={impersonatedTenantName} 
          onExitImpersonation={onExitImpersonation} 
        />
        <main className={clsx(
          "flex-1 overflow-y-auto relative",
          displayRole === 'super_admin' ? "p-8" : "p-6 md:p-8"
        )}>
          {children}
        </main>
      </div>
    </div>
  );
}