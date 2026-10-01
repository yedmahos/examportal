import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit2, Trash2, Eye, Send, Undo2 } from 'lucide-react';
import { announcementService } from '../../services/announcementService';
import PageHeader from '../../components/common/PageHeader';
import SearchBar from '../../components/common/SearchBar';
import Select from '../../components/common/Select';
import Button from '../../components/common/Button';
import StatusBadge from '../../components/common/StatusBadge';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import FormField from '../../components/common/FormField';
import Input from '../../components/common/Input';
import Textarea from '../../components/common/Textarea';
import { useToast } from '../../components/common/Toast';
import './AdminPages.css';

const CATEGORIES = ['All', 'Examination', 'Academic', 'Administrative', 'Urgent', 'Result'];
const PRIORITIES = ['All', 'High', 'Normal', 'Low'];
const STATUSES = ['All', 'Published', 'Draft'];
const AUDIENCES = ['All Students', 'Students', 'Admins'];

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

const recordId = (record) => record?.id || record?._id;

const isPublished = (announcement) => announcement?.published === true;

const categoryLabel = (value) => CATEGORY_TO_LABEL[value] || value || 'N/A';

const priorityLabel = (value) => (
  PRIORITY_TO_LABEL[String(value || '').toLowerCase()] || value || 'N/A'
);

const audienceLabel = (announcement) => (
  AUDIENCE_TO_LABEL[announcement?.targetAudience] || announcement?.targetAudience || 'N/A'
);

const authorName = (announcement) => announcement?.createdBy?.name || 'N/A';

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

const emptyForm = () => ({
  title: '',
  category: 'Examination',
  priority: 'Normal',
  audience: 'All Students',
  content: '',
  status: 'Published',
});

const AdminAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [priority, setPriority] = useState('All');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [currentAnn, setCurrentAnn] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    announcement: null,
    isLoading: false,
  });

  const { showToast } = useToast();

  const fetchAnnouncements = async () => {
    setIsLoading(true);
    try {
      const res = await announcementService.getAll({
        search,
        category,
        priority,
        status,
        page,
        limit: 8,
      });
      setAnnouncements(res.data.items);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch (e) {
      console.error(e);
      showToast('Failed to load announcements', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [search, category, priority, status, page]);

  const handleOpenCreate = () => {
    setModalMode('create');
    setFormData(emptyForm());
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ann) => {
    setModalMode('edit');
    setCurrentAnn(ann);
    setFormData({
      title: ann.title || '',
      category: CATEGORY_TO_LABEL[ann.category] || ann.category || 'Examination',
      priority: PRIORITY_TO_LABEL[String(ann.priority || '').toLowerCase()] || 'Normal',
      audience: AUDIENCE_TO_LABEL[ann.targetAudience] || 'All Students',
      content: ann.content || '',
      status: isPublished(ann) ? 'Published' : 'Draft',
    });
    setIsModalOpen(true);
  };

  const handleSaveAnnouncement = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      showToast('Title and content are required', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (modalMode === 'create') {
        await announcementService.create(formData);
        showToast('Announcement saved successfully', 'success');
      } else {
        const announcementId = recordId(currentAnn);
        if (!announcementId) {
          showToast('Announcement is missing an ID', 'error');
          return;
        }
        await announcementService.update(announcementId, formData);
        showToast('Announcement updated', 'success');
      }
      setIsModalOpen(false);
      fetchAnnouncements();
    } catch (err) {
      showToast(err.message || 'Operation failed', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublish = async (ann) => {
    const announcementId = recordId(ann);
    if (!announcementId) {
      showToast('Announcement is missing an ID', 'error');
      return;
    }

    try {
      if (isPublished(ann)) {
        await announcementService.unpublish(announcementId);
        showToast('Announcement reverted to Draft', 'info');
      } else {
        await announcementService.publish(announcementId);
        showToast('Announcement published', 'success');
      }
      fetchAnnouncements();
    } catch (e) {
      showToast(e.message || 'Failed to change publish status', 'error');
    }
  };

  const handleDelete = async () => {
    const ann = deleteDialog.announcement;
    if (!ann) return;

    setDeleteDialog(prev => ({ ...prev, isLoading: true }));
    try {
      await announcementService.delete(recordId(ann));
      showToast('Announcement deleted', 'success');
      setDeleteDialog({ isOpen: false, announcement: null, isLoading: false });
      fetchAnnouncements();
    } catch (err) {
      showToast('Failed to delete announcement', 'error');
      setDeleteDialog(prev => ({ ...prev, isLoading: false }));
    }
  };

  const columns = [
    {
      title: 'Announcement Title',
      key: 'title',
      render: (val, row) => (
        <div className="table-ann-cell">
          <span className="ann-title-text">{val}</span>
          <span className="ann-author-text">By {authorName(row)} • {formatDate(row.publishDate || row.createdAt)}</span>
        </div>
      ),
    },
    {
      title: 'Category',
      key: 'category',
      render: (val) => <StatusBadge status={categoryLabel(val)} size="sm" />,
    },
    {
      title: 'Priority',
      key: 'priority',
      render: (val) => <StatusBadge status={priorityLabel(val)} size="sm" />,
    },
    {
      title: 'Audience',
      key: 'targetAudience',
      render: (_val, row) => <span className="table-audience-badge">{audienceLabel(row)}</span>,
    },
    {
      title: 'Status',
      key: 'published',
      render: (_val, row) => <StatusBadge status={isPublished(row) ? 'Published' : 'Draft'} size="sm" />,
    },
    {
      title: 'Actions',
      key: 'id',
      align: 'right',
      render: (_val, row) => {
        const announcementId = recordId(row);
        return (
        <div className="table-row-actions">
          <Link
            to={`/admin/announcements/${announcementId}`}
            className="row-action-btn"
            title="View announcement"
          >
            <Eye size={15} />
          </Link>
          <button
            type="button"
            className="row-action-btn"
            title={isPublished(row) ? 'Unpublish' : 'Publish'}
            onClick={() => handleTogglePublish(row)}
          >
            {isPublished(row) ? <Undo2 size={15} /> : <Send size={15} />}
          </button>
          <button
            type="button"
            className="row-action-btn"
            title="Edit notice"
            onClick={() => handleOpenEdit(row)}
          >
            <Edit2 size={15} />
          </button>
          <button
            type="button"
            className="row-action-btn btn-danger-action"
            title="Delete notice"
            onClick={() => setDeleteDialog({ isOpen: true, announcement: row, isLoading: false })}
          >
            <Trash2 size={15} />
          </button>
        </div>
        );
      },
    },
  ];

  return (
    <div className="admin-announcements-page animate-fade-in">
      <PageHeader
        title="Announcements & Circulars"
        subtitle="Publish examination schedules, hall guidelines, and university notices"
        actions={
          <Button
            variant="primary"
            size="md"
            icon={Plus}
            onClick={handleOpenCreate}
          >
            Create Announcement
          </Button>
        }
      />

      <div className="admin-toolbar-card">
        <div className="toolbar-top-row">
          <div className="toolbar-search-wrap">
            <SearchBar
              value={search}
              onChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              placeholder="Search circulars..."
              size="sm"
            />
          </div>

          <div className="toolbar-selects-group">
            <div className="toolbar-select-item">
              <Select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
                options={CATEGORIES.map(c => ({ value: c, label: c === 'All' ? 'All Categories' : c }))}
              />
            </div>

            <div className="toolbar-select-item">
              <Select
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value);
                  setPage(1);
                }}
                options={PRIORITIES.map(p => ({ value: p, label: p === 'All' ? 'All Priorities' : p }))}
              />
            </div>

            <div className="toolbar-select-item">
              <Select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                options={STATUSES.map(s => ({ value: s, label: s === 'All' ? 'All Statuses' : s }))}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="admin-table-panel">
        <DataTable
          columns={columns}
          data={announcements}
          isLoading={isLoading}
          emptyTitle="No announcements found"
          emptyDescription="There are no notices matching your filter criteria."
          pagination={{
            page,
            totalPages,
            total,
            limit: 8,
            onPageChange: setPage,
          }}
        />
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Draft New Circular Announcement' : 'Edit Circular Announcement'}
        subtitle="Notices marked as Published will appear on student notification feeds."
        size="lg"
        footer={
          <div className="modal-footer-btns">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveAnnouncement}
              isLoading={isSaving}
            >
              {modalMode === 'create' ? 'Broadcast Notice' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveAnnouncement}>
          <FormField label="Announcement Title" required>
            <Input
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. Mid-Term Examination Schedule Fall 2026"
              disabled={isSaving}
            />
          </FormField>

          <div className="form-grid-three">
            <FormField label="Category" required>
              <Select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                options={CATEGORIES.filter(c => c !== 'All')}
                disabled={isSaving}
              />
            </FormField>

            <FormField label="Priority" required>
              <Select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                options={PRIORITIES.filter(p => p !== 'All')}
                disabled={isSaving}
              />
            </FormField>

            <FormField label="Target Audience" required>
              <Select
                value={formData.audience}
                onChange={(e) => setFormData(prev => ({ ...prev, audience: e.target.value }))}
                options={AUDIENCES}
                disabled={isSaving}
              />
            </FormField>
          </div>

          <FormField label="Circular Content" required>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              rows={4}
              placeholder="Type official notification message here..."
              disabled={isSaving}
            />
          </FormField>

          <FormField label="Publication">
            <Select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              options={['Published', 'Draft']}
              disabled={isSaving}
            />
          </FormField>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Announcement?"
        message={`Are you sure you want to delete "${deleteDialog.announcement?.title}"? This cannot be undone.`}
        confirmText="Delete Notice"
        confirmVariant="danger"
        type="danger"
        isLoading={deleteDialog.isLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ isOpen: false, announcement: null, isLoading: false })}
      />
    </div>
  );
};

export default AdminAnnouncements;
