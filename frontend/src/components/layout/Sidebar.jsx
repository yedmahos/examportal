import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Award,
  Bell,
  User,
  Users,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { roleBase, roleLabel } from '../../utils/roles';
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

  const base = roleBase(role);
  const link = (path, label, icon) => ({ to: `${base}${path}`, label, icon });

  const navigation = {
    student: [
      { items: [link('/dashboard', 'Dashboard', LayoutDashboard)] },
      { groupTitle: 'Academic', items: [
        link('/schedule', 'My Schedule', Calendar),
        link('/results', 'Results', Award),
      ] },
      { groupTitle: 'Updates', items: [link('/notifications', 'Notifications', Bell)] },
      { groupTitle: 'Account', items: [link('/profile', 'Profile', User)] },
    ],
    faculty: [
      { items: [link('/dashboard', 'Dashboard', LayoutDashboard)] },
      { groupTitle: 'Duties', items: [
        link('/duties', 'My Duties', Calendar),
        link('/schedule', 'My Schedule', BookOpen),
      ] },
      { groupTitle: 'Updates', items: [link('/notifications', 'Notifications', Bell)] },
      { groupTitle: 'Account', items: [link('/profile', 'Profile', User)] },
    ],
    department_admin: [
      { items: [link('/dashboard', 'Dashboard', LayoutDashboard)] },
      { groupTitle: 'Department', items: [
        link('/students', 'Students', Users),
        link('/subjects', 'Subjects', BookOpen),
        link('/batches', 'Batches', Users),
        link('/registrations', 'Registrations', BookOpen),
        link('/eligibility', 'Eligibility', Award),
        link('/schedules', 'Department Schedules', Calendar),
      ] },
      { groupTitle: 'Updates', items: [link('/notifications', 'Notifications', Bell)] },
      { groupTitle: 'Account', items: [link('/profile', 'Profile', User)] },
    ],
    examination_cell: [
      { items: [link('/dashboard', 'Dashboard', LayoutDashboard)] },
      { groupTitle: 'Examination', items: [
        link('/structure', 'Academic Structure', BookOpen),
        link('/examinations', 'Examinations', Calendar),
        link('/subjects', 'Subjects', BookOpen),
        link('/eligibility', 'Eligibility', Award),
        link('/schedules', 'Schedules', Calendar),
        link('/rooms', 'Rooms', BookOpen),
      ] },
      { groupTitle: 'Updates', items: [link('/notifications', 'Notifications', Bell)] },
      { groupTitle: 'Account', items: [link('/profile', 'Profile', User)] },
    ],
    super_admin: [
      { items: [link('/dashboard', 'Dashboard', LayoutDashboard)] },
      { groupTitle: 'Administration', items: [
        link('/users', 'Users', Users),
        link('/departments', 'Departments', BookOpen),
        link('/configuration', 'System Configuration', Award),
        link('/students', 'Students', Users),
        link('/examinations', 'Examinations', Calendar),
        link('/subjects', 'Subjects', BookOpen),
        link('/eligibility', 'Eligibility', Award),
        link('/schedules', 'Schedules', Calendar),
        link('/rooms', 'Rooms', BookOpen),
      ] },
      { groupTitle: 'Updates', items: [link('/notifications', 'Notifications', Bell)] },
      { groupTitle: 'Account', items: [link('/profile', 'Profile', User)] },
    ],
  };

  const navGroups = navigation[role] || (role && role !== "student" ? navigation.super_admin : navigation.student);

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
                  {roleLabel(role)}
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
                      end={item.to.endsWith('/dashboard')}
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
