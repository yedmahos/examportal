import React from 'react';
import { FileText, Download, ExternalLink, Calendar, Award, BellRing } from 'lucide-react';
import Avatar from '../common/Avatar';
import './Notification.css';

const NotificationItem = ({
  notification,
  onMarkAsRead,
  onOpenAttachment,
  compact = false,
}) => {
  const {
    _id,
    id = _id,
    title,
    sender = title || 'System',
    senderAvatar,
    message,
    actionText = message,
    createdAt,
    date,
    timestamp = createdAt ? new Date(createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : date,
    isRead,
    attachment,
    type,
    link,
  } = notification;

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
    switch (type) {
      case 'Exams':
        return <Calendar size={18} />;
      case 'Results':
        return <Award size={18} />;
      default:
        return <BellRing size={18} />;
    }
  };

  return (
    <div
      className={`notif-item-wrapper ${!isRead ? 'unread' : ''} ${compact ? 'compact' : ''}`}
      onClick={() => !isRead && onMarkAsRead && onMarkAsRead(id)}
    >
      <div className="notif-item-avatar-col">
        {senderAvatar ? (
          <Avatar src={senderAvatar} name={sender} size="md" />
        ) : (
          <div className="notif-type-icon-chip">
            {getTypeFallbackIcon()}
          </div>
        )}
      </div>

      <div className="notif-item-content-col">
        <div className="notif-item-header-text">
          <span className="notif-sender-name">{sender} </span>
          <span className="notif-action-text">{actionText}</span>
          {!isRead && <span className="notif-unread-dot" />}
        </div>

        <div className="notif-item-time-line">
          {date ? `On ${date}` : timestamp}
        </div>

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
