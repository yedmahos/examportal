import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import FloatingNotification from '../components/layout/FloatingNotification';
import '../components/layout/Layout.css';

const AppShell = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    if (!isMobileOpen) return undefined;
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      setIsMobileOpen(false);
      document.querySelector('.shell-menu-toggle')?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isMobileOpen]);

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      <div className="app-main-viewport">
        <div className="shell-float-controls">
          <button
            type="button"
            className="shell-menu-toggle"
            onClick={() => setIsMobileOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={isMobileOpen}
            aria-controls="app-sidebar"
          >
            <Menu size={18} />
          </button>
          <FloatingNotification />
        </div>
        <main className="app-content-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppShell;
