import React from 'react';
import { FileText, Download, ExternalLink, Calendar, Award, BellRing, Megaphone, AlertTriangle } from 'lucide-react';
import './Notification.css';

const SCHEDULE_EXAM_TITLES = new Set([
  'Examination Schedule Published',
  'Examination Rescheduled',
  'Examination Room Changed',
  'Seat Allocation Published',
  'Seat Allocation Updated',
  'Examination Cancelled',
  'Examination Postponed',
]);

export const scheduleReferenceId = (notification) => {
  if (!notification || String(notification.type || '').toLowerCase() !== 'exam') return '';
  if (!SCHEDULE_EXAM_TITLES.has(String(notification.title || ''))) return '';
  if (!notification.referenceId) return '';
  return String(notification.referenceId);
};

const NotificationItem = ({
  notification,
  onMarkAsRead,
  onOpenAttachment,
  onViewExamination,
  compact = false,
}) => {
  const {
    _id,
    id = _id,
    title,
    message,
    createdAt,
    date,
    timestamp,
    isRead,
    attachment,
    type,
  } = notification;

  const scheduleId = scheduleReferenceId(notification);

  const displayTime = createdAt
    ? new Date(createdAt).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    : timestamp || date || 'N/A';

  const getAttachmentIcon = (attType = '') => {
    switch (attType.toLowerCase()) {
      case 'ppt':
        return <span className="att-file-badge badge-ppt">PPT</span>;
      case 'doc':
      case 'docx':
        return <span className="att-file-badge badge-doc">DOC</span>;
      case 'form':
        return <span className="att-file-badge badge-form">FORM</span>;
      default:
        return <span className="att-file-badge badge-pdf">PDF</span>;
    }
  };

  const getTypeFallbackIcon = () => {
    switch (String(type || '').toLowerCase()) {
      case 'exam':
        return <Calendar size={18} />;
      case 'result':
        return <Award size={18} />;
      case 'announcement':
        return <Megaphone size={18} />;
      case 'important':
        return <AlertTriangle size={18} />;
      default:
        return <BellRing size={18} />;
    }
  };

  return (
    <div
      className={`notif-item-wrapper ${!isRead ? 'unread' : ''} ${compact ? 'compact' : ''}`}
      onClick={() => {
        if (scheduleId && onViewExamination) {
          onViewExamination(notification);
          return;
        }
        if (!isRead && onMarkAsRead) onMarkAsRead(id);
      }}
    >
      <div className="notif-item-avatar-col">
        <div className="notif-type-icon-chip">
          {getTypeFallbackIcon()}
        </div>
      </div>

      <div className="notif-item-content-col">
        <div className="notif-item-header-text">
          <span className="notif-sender-name">{title || 'Notification'}</span>
          {!isRead && <span className="notif-unread-dot" />}
        </div>

        <div className="notif-action-text">{message}</div>

        <div className="notif-item-time-line">
          {displayTime}
        </div>

        {scheduleId && onViewExamination && (
          <button
            type="button"
            className="notif-view-exam-btn"
            onClick={(event) => {
              event.stopPropagation();
              onViewExamination(notification);
            }}
          >
            View Examination
          </button>
        )}

        {attachment && (
          <div
            className="notif-attachment-subcard"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenAttachment) onOpenAttachment(attachment);
            }}
          >
            <div className="att-subcard-left">
              {getAttachmentIcon(attachment.type)}
              <div className="att-subcard-details">
                <span className="att-name">{attachment.name}</span>
                <span className="att-meta">{attachment.format || `${attachment.type} • ${attachment.size || 'Document'}`}</span>
              </div>
            </div>
            <button
              type="button"
              className="att-action-btn"
              aria-label="Open document"
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenAttachment) onOpenAttachment(attachment);
              }}
            >
              {attachment.type === 'form' ? <ExternalLink size={15} /> : <Download size={15} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationItem;
