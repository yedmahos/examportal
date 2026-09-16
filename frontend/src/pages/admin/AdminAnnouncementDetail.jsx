import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Megaphone, Calendar, FileText, Send, Undo2, UserCheck, Download } from 'lucide-react';
import { announcementService } from '../../services/announcementService';
import { activityService } from '../../services/activityService';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/common/Button';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import { useToast } from '../../components/common/Toast';
import './AdminPages.css';

const AdminAnnouncementDetail = () => {
  const { id } = useParams();
  const [ann, setAnn] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { showToast } = useToast();

  const fetchAnnouncement = async () => {
    setIsLoading(true);
    try {
      const res = await announcementService.getById(id);
      setAnn(res.data);
    } catch (e) {
      setError(e.message || 'Announcement not found');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncement();
  }, [id]);

  const handleTogglePublish = async () => {
    try {
      if (ann.status === 'Published') {
        const res = await announcementService.unpublish(ann.id);
        setAnn(res.data);
        await activityService.log('Unpublished Circular', ann.title, `Moved circular to draft status`, 'Admin Officer', 'announcements');
        showToast('Moved to Draft', 'info');
      } else {
        const res = await announcementService.publish(ann.id);
        setAnn(res.data);
        await activityService.log('Published Circular', ann.title, `Broadcasted notice`, 'Admin Officer', 'announcements');
        showToast('Published to student portal', 'success');
      }
    } catch (e) {
      showToast('Status update failed', 'error');
    }
  };

  if (isLoading) return <LoadingState message="Loading circular detail..." />;
  if (error || !ann) return <ErrorState message={error} onRetry={fetchAnnouncement} />;

  return (
    <div className="admin-ann-detail-page animate-fade-in">
      <PageHeader
        title={ann.title}
        subtitle={`Issued by ${ann.author} • ${ann.publishDate}`}
        backUrl="/admin/announcements"
        backText="Back to Announcements"
        badge={<StatusBadge status={ann.status} />}
        actions={
          <Button
            variant={ann.status === 'Published' ? 'outline' : 'primary'}
            icon={ann.status === 'Published' ? Undo2 : Send}
            onClick={handleTogglePublish}
          >
            {ann.status === 'Published' ? 'Unpublish to Draft' : 'Broadcast to Students'}
          </Button>
        }
      />

      <div className="ann-detail-card">
        <div className="ann-detail-meta-band">
          <div className="ann-band-pill">
            <span className="band-lbl">Category:</span>
            <StatusBadge status={ann.category} size="sm" />
          </div>
          <div className="ann-band-pill">
            <span className="band-lbl">Priority:</span>
            <StatusBadge status={ann.priority} size="sm" />
          </div>
          <div className="ann-band-pill">
            <span className="band-lbl">Audience:</span>
            <span className="table-audience-badge">{ann.audience}</span>
          </div>
          <div className="ann-band-pill">
            <span className="band-lbl">Publish Date:</span>
            <span className="font-bold">{ann.publishDate}</span>
          </div>
        </div>

        <div className="ann-content-box">
          <h4 className="ann-sec-title">Official Announcement Content</h4>
          <p className="ann-content-text">{ann.content}</p>
        </div>

        {ann.attachment && (
          <div className="ann-attachment-section">
            <h4 className="ann-sec-title">Attached Document</h4>
            <div className="ann-attachment-card">
              <FileText size={24} className="text-primary" />
              <div className="ann-att-text">
                <span className="ann-att-name">{ann.attachment.name}</span>
                <span className="ann-att-size">{ann.attachment.size} • PDF Document</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                icon={Download}
                onClick={() => showToast(`Downloading ${ann.attachment.name}...`, 'info')}
              >
                Download
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAnnouncementDetail;
