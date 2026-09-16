import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Menu,
  Bell,
  MessageSquare,
  Search,
  User,
  LogOut,
  Shield,
  GraduationCap,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../common/Avatar';
import SearchBar from '../common/SearchBar';
import NotificationPanel from '../notifications/NotificationPanel';
import { notificationService } from '../../services/notificationService';
import { useToast } from '../common/Toast';
import './Layout.css';

const Topbar = ({ onOpenMobileMenu }) => {
  const { user, role, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(2);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const notifAnchorRef = useRef(null);
  const profileMenuRef = useRef(null);

  // Poll or check unread notifications count
  useEffect(() => {
    const checkUnread = async () => {
      try {
        const res = await notificationService.getAll();
        setUnreadCount(res.data.unreadCount || 0);
      } catch (e) {
        console.error(e);
      }
    };
    checkUnread();
  }, [isNotifOpen]);

  // Click outside profile menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  // Contextual title based on path
  const getContextualTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard' || path === '/admin/dashboard') {
      return `Welcome Back, ${user?.name || (role === 'admin' ? 'Administrator' : 'Student')}`;
    }
    if (path.startsWith('/exams')) return 'Exams Schedule';
    if (path.startsWith('/results')) return 'Grades & Academic Results';
    if (path.startsWith('/notifications')) return 'Notification Center';
    if (path.startsWith('/profile') || path.startsWith('/admin/profile')) return 'Account Profile';
    if (path.startsWith('/admin/students')) return 'Students Directory';
    if (path.startsWith('/admin/announcements')) return 'Announcements Management';
    return 'Exam Management Portal';
  };

  const handleSearchSubmit = (val) => {
    if (!val.trim()) return;
    showToast(`Searching for: "${val}"`, 'info');
    // If student, navigate to exams with query
    if (role === 'admin') {
      navigate(`/admin/exams?q=${encodeURIComponent(val)}`);
    } else {
      navigate(`/exams?q=${encodeURIComponent(val)}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    showToast('Signed out successfully', 'info');
    navigate('/login');
  };

  return (
    <header className="app-topbar">
      <div className="topbar-left">
        {/* Mobile menu trigger */}
        <button
          type="button"
          className="topbar-menu-toggle"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>

        {/* Dynamic page title / greeting */}
        <h1 className="topbar-page-title">{getContextualTitle()}</h1>
      </div>

      <div className="topbar-right">
        {/* Search bar */}
        <div className="topbar-search-col">
          <SearchBar
            value={searchValue}
            onChange={setSearchValue}
            onSearch={handleSearchSubmit}
            placeholder="Search Here"
            size="md"
          />
        </div>

        {/* Actions Cluster matching Enlight screenshot */}
        <div className="topbar-actions-cluster">
          {/* Chat / Messages Button */}
          <button
            type="button"
            className="topbar-icon-btn"
            aria-label="Messages"
            title="Messages"
            onClick={() => showToast('Messaging system is in read-only informational mode.', 'info')}
          >
            <MessageSquare size={18} />
          </button>

          {/* Notifications Bell Button */}
          <div className="topbar-notif-anchor" ref={notifAnchorRef}>
            <button
              type="button"
              className={`topbar-icon-btn ${isNotifOpen ? 'active' : ''}`}
              aria-label="Notifications"
              title="Notifications"
              onClick={() => setIsNotifOpen(prev => !prev)}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="topbar-notif-dot" />
              )}
            </button>

            {/* Floating Notification Popover */}
            <NotificationPanel
              isOpen={isNotifOpen}
              onClose={() => setIsNotifOpen(false)}
              anchorRef={notifAnchorRef}
            />
          </div>

          {/* User Profile Avatar with Menu */}
          <div className="topbar-profile-anchor" ref={profileMenuRef}>
            <button
              type="button"
              className="topbar-avatar-btn"
              onClick={() => setIsProfileMenuOpen(prev => !prev)}
              aria-label="User profile menu"
            >
              <Avatar
                src={user?.avatar}
                name={user?.name || 'User'}
                size="md"
              />
            </button>

            {isProfileMenuOpen && (
              <div className="topbar-profile-dropdown animate-slide-down">
                <div className="profile-dropdown-user-info">
                  <Avatar src={user?.avatar} name={user?.name} size="md" />
                  <div className="dropdown-user-details">
                    <span className="dropdown-name">{user?.name}</span>
                    <span className="dropdown-email">{user?.email}</span>
                    <span className="dropdown-role-chip">
                      {role === 'admin' ? (
                        <>
                          <Shield size={11} /> Admin Officer
                        </>
                      ) : (
                        <>
                          <GraduationCap size={11} /> Student ({user?.studentId || 'Verified'})
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <div className="dropdown-divider" />

                <Link
                  to={role === 'admin' ? '/admin/profile' : '/profile'}
                  className="profile-dropdown-item"
                  onClick={() => setIsProfileMenuOpen(false)}
                >
                  <User size={16} />
                  <span>My Profile</span>
                </Link>

                <div className="dropdown-divider" />

                <button
                  type="button"
                  className="profile-dropdown-item item-danger"
                  onClick={handleLogout}
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
