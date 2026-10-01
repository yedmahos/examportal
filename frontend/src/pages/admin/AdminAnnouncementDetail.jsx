import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Undo2 } from 'lucide-react';
import { announcementService } from '../../services/announcementService';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/common/Button';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import { useToast } from '../../components/common/Toast';
import './AdminPages.css';

const CATEGORY_TO_LABEL = {
  exam: 'Examination',
  academic: 'Academic',
  general: 'Administrative',
  important: 'Urgent',
  result: 'Result',
};

const PRIORITY_TO_LABEL = {
  high: 'High',
  normal: 'Normal',
  low: 'Low',
};

const AUDIENCE_TO_LABEL = {
  all: 'All Students',
  students: 'Students',
  admins: 'Admins',
};

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

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
    const announcementId = ann?.id || ann?._id;
    if (!announcementId) {
      showToast('Announcement is missing an ID', 'error');
      return;
    }

    try {
      const res = ann.published
        ? await announcementService.unpublish(announcementId)
        : await announcementService.publish(announcementId);
      setAnn(res.data);
      showToast(ann.published ? 'Moved to Draft' : 'Published to student portal', 'success');
    } catch (e) {
      showToast(e.message || 'Status update failed', 'error');
    }
  };

  if (isLoading) return <LoadingState message="Loading circular detail..." />;
  if (error || !ann) return <ErrorState message={error} onRetry={fetchAnnouncement} />;

  const published = ann.published === true;
  const author = ann.createdBy?.name || 'N/A';
  const publishedOn = formatDate(ann.publishDate || ann.createdAt);

  return (
    <div className="admin-ann-detail-page animate-fade-in">
      <PageHeader
        title={ann.title}
        subtitle={`Issued by ${author} • ${publishedOn}`}
        backUrl="/admin/announcements"
        backText="Back to Announcements"
        badge={<StatusBadge status={published ? 'Published' : 'Draft'} />}
        actions={
          <Button
            variant={published ? 'outline' : 'primary'}
            icon={published ? Undo2 : Send}
            onClick={handleTogglePublish}
          >
            {published ? 'Unpublish to Draft' : 'Broadcast to Students'}
          </Button>
        }
      />

      <div className="ann-detail-card">
        <div className="ann-detail-meta-band">
          <div className="ann-band-pill">
            <span className="band-lbl">Category:</span>
            <StatusBadge status={CATEGORY_TO_LABEL[ann.category] || ann.category || 'N/A'} size="sm" />
          </div>
          <div className="ann-band-pill">
            <span className="band-lbl">Priority:</span>
            <StatusBadge status={PRIORITY_TO_LABEL[ann.priority] || ann.priority || 'N/A'} size="sm" />
          </div>
          <div className="ann-band-pill">
            <span className="band-lbl">Audience:</span>
            <span className="table-audience-badge">
              {AUDIENCE_TO_LABEL[ann.targetAudience] || ann.targetAudience || 'N/A'}
            </span>
          </div>
          <div className="ann-band-pill">
            <span className="band-lbl">Publish Date:</span>
            <span className="font-bold">{publishedOn}</span>
          </div>
        </div>

        <div className="ann-content-box">
          <h4 className="ann-sec-title">Official Announcement Content</h4>
          <p className="ann-content-text">{ann.content || 'N/A'}</p>
        </div>
      </div>
    </div>
  );
};

export default AdminAnnouncementDetail;
