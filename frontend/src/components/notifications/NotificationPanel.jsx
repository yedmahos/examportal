import React, { useState, useEffect, useRef } from 'react';
import { Settings, ChevronDown, CheckCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Tabs from '../common/Tabs';
import NotificationItem from './NotificationItem';
import { notificationService } from '../../services/notificationService';
import { useToast } from '../common/Toast';
import './Notification.css';

const NotificationPanel = ({
  isOpen,
  onClose,
  anchorRef,
}) => {
  const [activeTab, setActiveTab] = useState('All');
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const tabs = [
    { id: 'All', label: 'All Updates' },
    { id: 'Exams', label: 'Exams' },
    { id: 'Results', label: 'Results' },
    { id: 'Announcements', label: 'Announcements' },
  ];

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await notificationService.getAll({ type: activeTab });
      setNotifications(res.data.items);
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, activeTab]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        isOpen &&
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, anchorRef]);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      showToast('All notifications marked as read', 'success');
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenAttachment = (attachment) => {
    showToast(`Accessing file: ${attachment.name}`, 'info');
  };

  if (!isOpen) return null;

  return (
    <div className="notif-dropdown-wrapper animate-slide-down" ref={panelRef}>
      {/* Header */}
      <div className="notif-panel-header">
        <h3 className="notif-panel-title">Notifications</h3>
        <div className="notif-header-actions">
          <button
            type="button"
            className="notif-mark-all-btn"
            onClick={handleMarkAllRead}
          >
            <CheckCheck size={14} />
            <span>Mark as read</span>
          </button>
          <button
            type="button"
            className="notif-settings-btn"
            aria-label="Notification settings"
            onClick={() => showToast('Notification preferences are up to date.', 'info')}
          >
            <Settings size={15} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="notif-tabs-container">
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          variant="pill"
        />
      </div>

      {/* Notification items list */}
      <div className="notif-items-list">
        {isLoading ? (
          <div className="notif-loading-state">
            <div className="btn-spinner" />
            <span>Loading notifications...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="notif-empty-state">
            <p>No notifications in this category</p>
          </div>
        ) : (
          notifications.map(item => (
            <NotificationItem
              key={item.id}
              notification={item}
              onMarkAsRead={handleMarkAsRead}
              onOpenAttachment={handleOpenAttachment}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="notif-panel-footer">
        <button
          type="button"
          className="notif-view-more-btn"
          onClick={() => {
            onClose();
            navigate('/notifications');
          }}
        >
          <span>View More Notification</span>
          <ChevronDown size={14} />
        </button>
      </div>
    </div>
  );
};

export default NotificationPanel;
