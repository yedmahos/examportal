import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Trash2, Filter } from 'lucide-react';
import { notificationService } from '../../services/notificationService';
import PageHeader from '../../components/common/PageHeader';
import Tabs from '../../components/common/Tabs';
import Button from '../../components/common/Button';
import NotificationItem from '../../components/notifications/NotificationItem';
import LoadingState from '../../components/common/LoadingState';
import EmptyState from '../../components/common/EmptyState';
import { useToast } from '../../components/common/Toast';
import './StudentPages.css';

const StudentNotifications = () => {
  const [activeTab, setActiveTab] = useState('All');
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
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
      const res = await notificationService.getAll({
        type: activeTab,
        isRead: unreadOnly ? false : undefined,
      });
      setNotifications(res.data.items);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [activeTab, unreadOnly]);

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

  return (
    <div className="student-notifications-page animate-fade-in">
      <PageHeader
        title="Notification Center"
        subtitle="Important timetable releases, hall arrangements, and marksheet publications"
        actions={
          <Button
            variant="outline"
            size="md"
            icon={CheckCheck}
            onClick={handleMarkAllRead}
          >
            Mark All as Read
          </Button>
        }
      />

      {/* Tabs and Filters bar */}
      <div className="notifications-filter-card">
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          variant="pill"
        />

        <div className="unread-filter-toggle">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="custom-checkbox"
            />
            <span>Show unread only</span>
          </label>
        </div>
      </div>

      {/* Notification items */}
      <div className="notifications-full-list-card">
        {isLoading ? (
          <LoadingState message="Loading updates..." />
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No notifications"
            description="You are all caught up! No recent circulars or updates in this category."
          />
        ) : (
          <div className="notifications-container">
            {notifications.map((notif) => (
              <NotificationItem
                key={notif.id}
                notification={notif}
                onMarkAsRead={handleMarkAsRead}
                onOpenAttachment={handleOpenAttachment}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentNotifications;
