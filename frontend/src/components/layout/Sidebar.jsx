import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Award,
  Bell,
  User,
  Users,
  Megaphone,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Layout.css';

const Sidebar = ({
  collapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const studentNavGroups = [
    {
      groupTitle: null,
      items: [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      groupTitle: 'Academic',
      items: [
        { to: '/exams', label: 'Exams Schedule', icon: Calendar },
        { to: '/results', label: 'Grades & Results', icon: Award },
      ],
    },
    {
      groupTitle: 'Updates',
      items: [
        { to: '/notifications', label: 'Notifications', icon: Bell },
      ],
    },
    {
      groupTitle: 'Account',
      items: [
        { to: '/profile', label: 'My Profile', icon: User },
      ],
    },
  ];

  const adminNavGroups = [
    {
      groupTitle: null,
      items: [
        { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      groupTitle: 'Academic Management',
      items: [
        { to: '/admin/students', label: 'Students', icon: Users },
        { to: '/admin/exams', label: 'Exams', icon: Calendar },
        { to: '/admin/results', label: 'Results', icon: Award },
        { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
      ],
    },
    {
      groupTitle: 'Account',
      items: [
        { to: '/admin/profile', label: 'Admin Profile', icon: User },
      ],
    },
  ];

  const navGroups = role === 'admin' ? adminNavGroups : studentNavGroups;

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="sidebar-mobile-backdrop animate-fade-in"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`app-sidebar ${collapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}
      >
        {/* Brand Header */}
        <div className="sidebar-brand-row">
          <div className="sidebar-brand-identity">
            <button
              type="button"
              className="sidebar-logo-icon"
              onClick={collapsed ? onToggleCollapse : undefined}
              aria-label={collapsed ? 'Expand sidebar' : 'ExamPortal'}
              title={collapsed ? 'Expand sidebar' : undefined}
            >
              <BookOpen size={20} />
            </button>
            {!collapsed && (
              <div className="sidebar-brand-text">
                <span className="sidebar-app-name">ExamPortal</span>
                <span className="sidebar-app-role">
                  {role === 'admin' ? 'Administration' : 'Student Portal'}
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            className="sidebar-collapse-toggle"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation links */}
        <div className="sidebar-nav-scroll">
          {navGroups.map((group, gIdx) => (
            <div key={`group-${gIdx}`} className="sidebar-nav-group">
              {group.groupTitle && !collapsed && (
                <div className="sidebar-group-label">
                  <span>{group.groupTitle}</span>
                </div>
              )}
              <div className="sidebar-group-items">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/dashboard' || item.to === '/admin/dashboard'}
                      onClick={() => isMobileOpen && onCloseMobile()}
                      className={({ isActive }) =>
                        `sidebar-nav-item ${isActive ? 'active' : ''}`
                      }
                      title={collapsed ? item.label : undefined}
                    >
                      <div className="nav-item-icon">
                        <Icon size={18} />
                      </div>
                      {!collapsed && <span className="nav-item-label">{item.label}</span>}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="sidebar-logout-footer">
          <button
            type="button"
            className="sidebar-logout-btn"
            onClick={handleLogout}
            title="Log out"
            aria-label="Log out"
          >
            <LogOut size={18} />
            {!collapsed && <span>Log out</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
