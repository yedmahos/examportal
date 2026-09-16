import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, Search, Plus, Edit2, Trash2, Eye, Send, Undo2, FileText } from 'lucide-react';
import { announcementService } from '../../services/announcementService';
import { activityService } from '../../services/activityService';
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

const CATEGORIES = ['All', 'Examination', 'Academic', 'Administrative', 'Urgent'];
const PRIORITIES = ['All', 'High', 'Normal', 'Low'];
const STATUSES = ['All', 'Published', 'Draft'];

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
  const [formData, setFormData] = useState({
    title: '',
    category: 'Examination',
    priority: 'Normal',
    audience: 'All Students',
    content: '',
    author: 'Office of the Controller of Examinations',
    attachmentName: '',
    status: 'Published',
  });
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
    setFormData({
      title: '',
      category: 'Examination',
      priority: 'Normal',
      audience: 'All Students',
      content: '',
      author: 'Office of the Controller of Examinations',
      attachmentName: '',
      status: 'Published',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ann) => {
    setModalMode('edit');
    setCurrentAnn(ann);
    setFormData({
      title: ann.title || '',
      category: ann.category || 'Examination',
      priority: ann.priority || 'Normal',
      audience: ann.audience || 'All Students',
      content: ann.content || '',
      author: ann.author || '',
      attachmentName: ann.attachment?.name || '',
      status: ann.status || 'Published',
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
        await activityService.log('Published Announcement', formData.title, `Broadcasted circular notice to ${formData.audience}`, 'Admin Officer', 'announcements');
        showToast('Announcement broadcasted successfully', 'success');
      } else {
        await announcementService.update(currentAnn.id, formData);
        await activityService.log('Updated Announcement', formData.title, `Edited circular content`, 'Admin Officer', 'announcements');
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
    try {
      if (ann.status === 'Published') {
        await announcementService.unpublish(ann.id);
        await activityService.log('Unpublished Circular', ann.title, `Moved circular to draft status`, 'Admin Officer', 'announcements');
        showToast('Announcement reverted to Draft', 'info');
      } else {
        await announcementService.publish(ann.id);
        await activityService.log('Published Circular', ann.title, `Activated announcement on student portal`, 'Admin Officer', 'announcements');
        showToast('Announcement published', 'success');
      }
      fetchAnnouncements();
    } catch (e) {
      showToast('Failed to change publish status', 'error');
    }
  };

  const handleDelete = async () => {
    const ann = deleteDialog.announcement;
    if (!ann) return;

    setDeleteDialog(prev => ({ ...prev, isLoading: true }));
    try {
      await announcementService.delete(ann.id);
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
          <span className="ann-author-text">By {row.author} • {row.publishDate}</span>
        </div>
      ),
    },
    {
      title: 'Category',
      key: 'category',
      render: (val) => <StatusBadge status={val} size="sm" />,
    },
    {
      title: 'Priority',
      key: 'priority',
      render: (val) => <StatusBadge status={val} size="sm" />,
    },
    {
      title: 'Audience',
      key: 'audience',
      render: (val) => <span className="table-audience-badge">{val}</span>,
    },
    {
      title: 'Status',
      key: 'status',
      render: (val) => <StatusBadge status={val} size="sm" />,
    },
    {
      title: 'Actions',
      key: 'id',
      align: 'right',
      render: (val, row) => (
        <div className="table-row-actions">
          <Link
            to={`/admin/announcements/${val}`}
            className="row-action-btn"
            title="View announcement"
          >
            <Eye size={15} />
          </Link>
          <button
            type="button"
            className="row-action-btn"
            title={row.status === 'Published' ? 'Unpublish' : 'Publish'}
            onClick={() => handleTogglePublish(row)}
          >
            {row.status === 'Published' ? <Undo2 size={15} /> : <Send size={15} />}
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
      ),
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
              <Input
                value={formData.audience}
                onChange={(e) => setFormData(prev => ({ ...prev, audience: e.target.value }))}
                placeholder="e.g. All Students"
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

          <div className="form-grid-two">
            <FormField label="Issuing Authority">
              <Input
                value={formData.author}
                onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                placeholder="e.g. Office of Controller of Exams"
                disabled={isSaving}
              />
            </FormField>

            <FormField label="Attachment File Name (Optional)">
              <Input
                value={formData.attachmentName}
                onChange={(e) => setFormData(prev => ({ ...prev, attachmentName: e.target.value }))}
                placeholder="e.g. Schedule_Fall_2026.pdf"
                disabled={isSaving}
              />
            </FormField>
          </div>
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
