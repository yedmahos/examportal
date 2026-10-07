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
import { canAccess, profilePath, roleLabel } from '../../utils/roles';
import Avatar from '../common/Avatar';
import './Layout.css';

const Sidebar = ({
  collapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const accountName = user?.name || 'Account';
  const accountRole = roleLabel(role);
  const showRole = Boolean(accountRole)
    && accountName.trim().toLowerCase() !== accountRole.trim().toLowerCase();
  const showAccountCopy = !collapsed || isMobileOpen;

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
  ];

  const staffRoles = ['admin', 'super_admin', 'examination_cell', 'department_admin', 'faculty'];

  const adminNavGroups = [
    {
      groupTitle: null,
      items: [
        { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: staffRoles },
      ],
    },
    {
      groupTitle: 'Academic Structure',
      items: [
        { to: '/admin/academic-years', label: 'Academic Years', icon: Calendar, roles: ['super_admin'] },
        { to: '/admin/departments', label: 'Departments', icon: BookOpen, roles: ['super_admin', 'department_admin', 'examination_cell'] },
        { to: '/admin/programs', label: 'Programs', icon: BookOpen, roles: ['super_admin', 'department_admin', 'examination_cell'] },
        { to: '/admin/batches', label: 'Batches', icon: Users, roles: ['super_admin', 'department_admin', 'examination_cell'] },
        { to: '/admin/sections', label: 'Sections', icon: Users, roles: ['super_admin', 'department_admin', 'examination_cell'] },
      ],
    },
    {
      groupTitle: 'Examination',
      items: [
        { to: '/admin/exam-types', label: 'Exam Types', icon: Award, roles: ['super_admin', 'examination_cell', 'department_admin'] },
        { to: '/admin/examinations', label: 'Examinations', icon: Calendar, roles: ['super_admin', 'examination_cell'] },
        { to: '/admin/sessions', label: 'Sessions', icon: Calendar, roles: ['super_admin', 'examination_cell', 'department_admin'] },
        { to: '/admin/subjects', label: 'Subjects', icon: BookOpen, roles: ['super_admin', 'examination_cell', 'department_admin'] },
        { to: '/admin/enrollments', label: 'Enrollment', icon: Users, roles: ['super_admin', 'examination_cell', 'department_admin'] },
        { to: '/admin/eligibility', label: 'Eligibility', icon: Award, roles: ['super_admin', 'examination_cell', 'department_admin'] },
        { to: '/admin/schedules', label: 'Schedules', icon: Calendar, roles: ['super_admin', 'examination_cell', 'department_admin'] },
        { to: '/admin/rooms', label: 'Rooms', icon: BookOpen, roles: ['super_admin', 'examination_cell'] },
      ],
    },
    {
      groupTitle: 'Academic Management',
      items: [
        { to: '/admin/faculty', label: 'Faculty', icon: User, roles: ['super_admin'] },
        { to: '/admin/students', label: 'Students', icon: Users, roles: ['admin', 'super_admin', 'department_admin', 'examination_cell'] },
        { to: '/admin/exams', label: 'Exam Notices', icon: Calendar, roles: ['admin', 'super_admin', 'examination_cell'] },
        { to: '/admin/results', label: 'Results', icon: Award, roles: ['admin', 'super_admin'] },
        { to: '/admin/announcements', label: 'Announcements', icon: Megaphone, roles: ['admin', 'super_admin'] },
      ],
    },
  ].map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccess(role, item.roles)),
  })).filter((group) => group.items.length);

  const link = (to, label, icon) => ({ to, label, icon });
  const roleNav = {
    student: [
      { items: [link('/student/dashboard', 'Dashboard', LayoutDashboard)] },
      { groupTitle: 'Academic', items: [
        link('/student/schedule', 'My Schedule', Calendar),
        link('/student/results', 'Results', Award),
      ] },
      { groupTitle: 'Updates', items: [link('/student/notifications', 'Notifications', Bell)] },
    ],
    faculty: [
      { items: [link('/faculty/dashboard', 'Dashboard', LayoutDashboard)] },
      { groupTitle: 'Duties', items: [
        link('/faculty/duties', 'My Duties', Calendar),
        link('/faculty/schedule', 'My Schedule', BookOpen),
      ] },
      { groupTitle: 'Updates', items: [link('/faculty/notifications', 'Notifications', Bell)] },
    ],
    department_admin: [
      { items: [link('/department-admin/dashboard', 'Dashboard', LayoutDashboard)] },
      { groupTitle: 'Department', items: [
        link('/department-admin/students', 'Students', Users),
        link('/department-admin/subjects', 'Subjects', BookOpen),
        link('/department-admin/batches', 'Batches', Users),
        link('/department-admin/registrations', 'Registrations', BookOpen),
        link('/department-admin/eligibility', 'Eligibility', Award),
        link('/department-admin/schedules', 'Department Schedules', Calendar),
      ] },
      { groupTitle: 'Updates', items: [link('/department-admin/notifications', 'Notifications', Bell)] },
    ],
    examination_cell: [
      { items: [link('/examination-cell/dashboard', 'Dashboard', LayoutDashboard)] },
      { groupTitle: 'Examination', items: [
        link('/examination-cell/structure', 'Academic Structure', BookOpen),
        link('/examination-cell/examinations', 'Examinations', Calendar),
        link('/examination-cell/subjects', 'Subjects', BookOpen),
        link('/examination-cell/eligibility', 'Eligibility', Award),
        link('/examination-cell/schedules', 'Schedules', Calendar),
        link('/examination-cell/rooms', 'Rooms', BookOpen),
      ] },
      { groupTitle: 'Updates', items: [link('/examination-cell/notifications', 'Notifications', Bell)] },
    ],
    super_admin: [
      { items: [link('/super-admin/dashboard', 'Dashboard', LayoutDashboard)] },
      { groupTitle: 'Administration', items: [
        link('/super-admin/users', 'Users', Users),
        link('/super-admin/departments', 'Departments', BookOpen),
        link('/super-admin/configuration', 'System Configuration', Award),
        link('/super-admin/examinations', 'Examinations', Calendar),
        link('/super-admin/subjects', 'Subjects', BookOpen),
        link('/super-admin/eligibility', 'Eligibility', Award),
        link('/super-admin/schedules', 'Schedules', Calendar),
        link('/super-admin/rooms', 'Rooms', BookOpen),
      ] },
      { groupTitle: 'Updates', items: [link('/super-admin/notifications', 'Notifications', Bell)] },
    ],
  };

  const navGroups = roleNav[role] || (role && role !== 'student' ? adminNavGroups : studentNavGroups);

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
        id="app-sidebar"
        aria-label="Main navigation"
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
          <NavLink
            to={profilePath(role)}
            className={({ isActive }) => `sidebar-account ${isActive ? 'active' : ''}`}
            title={showAccountCopy ? undefined : accountName}
            aria-label={showRole ? `${accountName}, ${accountRole}` : accountName}
            onClick={() => isMobileOpen && onCloseMobile()}
          >
            <Avatar
              src={user?.profileImage || user?.avatar}
              name={accountName}
              size="sm"
            />
            {showAccountCopy && (
              <span className="sidebar-account-copy">
                <span className="sidebar-account-name">{accountName}</span>
                {showRole && <span className="sidebar-account-role">{accountRole}</span>}
              </span>
            )}
          </NavLink>
          <button
            type="button"
            className="sidebar-logout-btn btn btn-ghost btn-ghost-danger"
            onClick={handleLogout}
            title="Log out"
            aria-label="Log out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
