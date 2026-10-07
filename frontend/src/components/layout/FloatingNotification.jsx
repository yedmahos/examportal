import React, { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import NotificationPanel from '../notifications/NotificationPanel';
import { notificationService } from '../../services/notificationService';
import './Layout.css';

const FloatingNotification = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const anchorRef = useRef(null);

  useEffect(() => {
    let active = true;

    const checkUnread = async () => {
      try {
        const res = await notificationService.getAll();
        if (active) setUnreadCount(res.data.unreadCount || 0);
      } catch (error) {
        console.error(error);
      }
    };

    checkUnread();

    return () => {
      active = false;
    };
  }, [isOpen]);

  return (
    <div className="shell-notif-anchor" ref={anchorRef}>
      <button
        type="button"
        className={`shell-notif-btn ${isOpen ? 'active' : ''}`}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        title="Notifications"
        onClick={() => setIsOpen((open) => !open)}
      >
        <Bell size={18} />
        {unreadCount > 0 && <span className="shell-notif-dot" />}
      </button>
      <NotificationPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        anchorRef={anchorRef}
      />
    </div>
  );
};

export default FloatingNotification;
