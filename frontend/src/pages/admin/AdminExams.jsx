import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Calendar, Search, Plus, Edit2, Trash2, Archive, Eye, Clock, MapPin } from 'lucide-react';
import { examService } from '../../services/examService';
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

const DEPARTMENTS = [
  'All',
  'Computer Science & Engineering',
  'Electrical Engineering',
  'Information Technology',
  'Data Science & AI',
  'Mechanical Engineering',
];

const STATUSES = ['All', 'Scheduled', 'In Progress', 'Completed', 'Postponed', 'Cancelled'];

const AdminExams = () => {
  const [searchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const initialStatus = searchParams.get('status') || 'All';

  const [exams, setExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState(initialQ);
  const [department, setDepartment] = useState('All');
  const [status, setStatus] = useState(initialStatus);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal create/edit state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [currentExam, setCurrentExam] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    examCode: '',
    department: 'Computer Science & Engineering',
    program: 'B.Sc. in Software Engineering',
    semester: '6th Semester',
    academicYear: '2025 - 2026',
    date: '2026-10-20',
    startTime: '09:00 AM',
    endTime: '12:00 PM',
    duration: '180 minutes (3 hours)',
    venue: 'Auditorium Hall B',
    room: 'HCI - 401',
    totalMarks: 100,
    passingMarks: 40,
    credits: 4,
    invigilator: 'Prof. Endang Setyowati, Ph.D',
    instructions: '1. Official student ID card required.\n2. Non-programmable calculator permitted.\n3. Mobile devices prohibited.',
    status: 'Scheduled',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Delete / Archive confirmation
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    exam: null,
    isLoading: false,
  });

  const { showToast } = useToast();

  const fetchExams = async () => {
    setIsLoading(true);
    try {
      const res = await examService.getAll({
        search,
        department,
        status,
        page,
        limit: 8,
      });
      setExams(res.data.items);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error(err);
      showToast('Failed to load examination timetable', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [search, department, status, page]);

  const handleOpenCreate = () => {
    setModalMode('create');
    setFormData({
      title: '',
      subject: '',
      examCode: `CS-${Math.floor(400 + Math.random() * 90)}`,
      department: 'Computer Science & Engineering',
      program: 'B.Sc. in Software Engineering',
      semester: '6th Semester',
      academicYear: '2025 - 2026',
      date: '2026-11-05',
      startTime: '09:00 AM',
      endTime: '12:00 PM',
      duration: '180 minutes',
      venue: 'Auditorium Hall B',
      room: 'HCI - 401',
      totalMarks: 100,
      passingMarks: 40,
      credits: 4,
      invigilator: 'Dr. Dadang Nurjaman',
      instructions: '1. Official student ID card required.\n2. Arrive 20 minutes before exam time.',
      status: 'Scheduled',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (exam) => {
    setModalMode('edit');
    setCurrentExam(exam);
    setFormData({
      title: exam.title || '',
      subject: exam.subject || '',
      examCode: exam.examCode || '',
      department: exam.department || 'Computer Science & Engineering',
      program: exam.program || 'B.Sc. in Software Engineering',
      semester: exam.semester || '6th Semester',
      academicYear: exam.academicYear || '2025 - 2026',
      date: exam.date || '',
      startTime: exam.startTime || '09:00 AM',
      endTime: exam.endTime || '12:00 PM',
      duration: exam.duration || '180 minutes',
      venue: exam.venue || '',
      room: exam.room || '',
      totalMarks: exam.totalMarks || 100,
      passingMarks: exam.passingMarks || 40,
      credits: exam.credits || 4,
      invigilator: exam.invigilator || '',
      instructions: exam.instructions || '',
      status: exam.status || 'Scheduled',
    });
    setIsModalOpen(true);
  };

  const handleSaveExam = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.date || !formData.examCode) {
      showToast('Please provide exam title, code, and date', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (modalMode === 'create') {
        await examService.create(formData);
        await activityService.log('Scheduled New Exam', formData.title, `Configured timetable for ${formData.examCode}`, 'Admin Officer', 'exams');
        showToast('Exam scheduled successfully', 'success');
      } else {
        await examService.update(currentExam.id, formData);
        await activityService.log('Updated Exam Timetable', formData.title, `Modified schedule for ${formData.examCode}`, 'Admin Officer', 'exams');
        showToast('Exam updated successfully', 'success');
      }
      setIsModalOpen(false);
      fetchExams();
    } catch (err) {
      showToast(err.message || 'Operation failed', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteExam = async () => {
    const exam = deleteDialog.exam;
    if (!exam) return;

    setDeleteDialog(prev => ({ ...prev, isLoading: true }));
    try {
      await examService.delete(exam.id);
      await activityService.log('Removed Exam Record', exam.title, `Removed exam session ${exam.examCode}`, 'Admin Officer', 'exams');
      showToast('Exam record removed', 'success');
      setDeleteDialog({ isOpen: false, exam: null, isLoading: false });
      fetchExams();
    } catch (err) {
      showToast('Failed to delete exam', 'error');
      setDeleteDialog(prev => ({ ...prev, isLoading: false }));
    }
  };

  const columns = [
    {
      title: 'Code',
      key: 'examCode',
      render: (val) => <span className="table-code-chip">{val}</span>,
    },
    {
      title: 'Exam Title & Subject',
      key: 'title',
      render: (val, row) => (
        <div className="table-subject-cell">
          <span className="subject-title">{row.subject}</span>
          <span className="exam-full-name">{val}</span>
        </div>
      ),
    },
    {
      title: 'Department',
      key: 'department',
      render: (val) => <span className="table-dept-text">{val}</span>,
    },
    {
      title: 'Date & Time',
      key: 'date',
      render: (val, row) => (
        <div className="table-time-col">
          <span className="text-primary font-bold">{val}</span>
          <span className="text-muted text-xs">{row.startTime} - {row.endTime}</span>
        </div>
      ),
    },
    {
      title: 'Venue & Room',
      key: 'venue',
      render: (val, row) => (
        <div className="table-venue-col">
          <span className="venue-name">{val}</span>
          <span className="room-name">({row.room})</span>
        </div>
      ),
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
            to={`/admin/exams/${val}`}
            className="row-action-btn"
            title="View details"
          >
            <Eye size={15} />
          </Link>
          <button
            type="button"
            className="row-action-btn"
            title="Edit exam"
            onClick={() => handleOpenEdit(row)}
          >
            <Edit2 size={15} />
          </button>
          <button
            type="button"
            className="row-action-btn btn-danger-action"
            title="Delete exam"
            onClick={() => setDeleteDialog({ isOpen: true, exam: row, isLoading: false })}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="admin-exams-page animate-fade-in">
      <PageHeader
        title="Examinations Management"
        subtitle="Schedule, configure, and monitor institutional examination sessions"
        actions={
          <Button
            variant="primary"
            size="md"
            icon={Plus}
            onClick={handleOpenCreate}
          >
            Schedule New Exam
          </Button>
        }
      />

      {/* Filters Toolbar */}
      <div className="admin-toolbar-card">
        <div className="toolbar-top-row">
          <div className="toolbar-search-wrap">
            <SearchBar
              value={search}
              onChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              placeholder="Search exam code, subject..."
              size="sm"
            />
          </div>

          <div className="toolbar-selects-group">
            <div className="toolbar-select-item">
              <Select
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value);
                  setPage(1);
                }}
                options={DEPARTMENTS.map(d => ({ value: d, label: d === 'All' ? 'All Departments' : d }))}
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

      {/* Table Panel */}
      <div className="admin-table-panel">
        <DataTable
          columns={columns}
          data={exams}
          isLoading={isLoading}
          emptyTitle="No examinations scheduled"
          emptyDescription="There are currently no examinations matching your filters."
          pagination={{
            page,
            totalPages,
            total,
            limit: 8,
            onPageChange: setPage,
          }}
        />
      </div>

      {/* Create / Edit Exam Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Schedule New Examination' : 'Edit Examination Details'}
        subtitle="Configure official dates, time slots, and assigned invigilation halls."
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
              onClick={handleSaveExam}
              isLoading={isSaving}
            >
              {modalMode === 'create' ? 'Schedule Exam' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveExam}>
          <div className="form-grid-two">
            <FormField label="Exam Title" required>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Advanced Distributed Systems"
                disabled={isSaving}
              />
            </FormField>

            <FormField label="Subject Name" required>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="e.g. Distributed Systems"
                disabled={isSaving}
              />
            </FormField>
          </div>

          <div className="form-grid-three">
            <FormField label="Exam Code" required>
              <Input
                value={formData.examCode}
                onChange={(e) => setFormData(prev => ({ ...prev, examCode: e.target.value }))}
                placeholder="CS-401"
                disabled={isSaving}
              />
            </FormField>

            <FormField label="Department" required>
              <Select
                value={formData.department}
                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                options={DEPARTMENTS.filter(d => d !== 'All')}
                disabled={isSaving}
              />
            </FormField>

            <FormField label="Semester" required>
              <Input
                value={formData.semester}
                onChange={(e) => setFormData(prev => ({ ...prev, semester: e.target.value }))}
                disabled={isSaving}
              />
            </FormField>
          </div>

          <div className="form-grid-three">
            <FormField label="Exam Date" required>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                disabled={isSaving}
              />
            </FormField>

            <FormField label="Start Time" required>
              <Input
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                placeholder="09:00 AM"
                disabled={isSaving}
              />
            </FormField>

            <FormField label="End Time" required>
              <Input
                value={formData.endTime}
                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                placeholder="12:00 PM"
                disabled={isSaving}
              />
            </FormField>
          </div>

          <div className="form-grid-two">
            <FormField label="Venue / Complex" required>
              <Input
                value={formData.venue}
                onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
                placeholder="Auditorium Hall B"
                disabled={isSaving}
              />
            </FormField>

            <FormField label="Room Code" required>
              <Input
                value={formData.room}
                onChange={(e) => setFormData(prev => ({ ...prev, room: e.target.value }))}
                placeholder="HCI - 401"
                disabled={isSaving}
              />
            </FormField>
          </div>

          <div className="form-grid-three">
            <FormField label="Total Marks">
              <Input
                type="number"
                value={formData.totalMarks}
                onChange={(e) => setFormData(prev => ({ ...prev, totalMarks: e.target.value }))}
                disabled={isSaving}
              />
            </FormField>

            <FormField label="Passing Marks">
              <Input
                type="number"
                value={formData.passingMarks}
                onChange={(e) => setFormData(prev => ({ ...prev, passingMarks: e.target.value }))}
                disabled={isSaving}
              />
            </FormField>

            <FormField label="Status" required>
              <Select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                options={STATUSES.filter(s => s !== 'All')}
                disabled={isSaving}
              />
            </FormField>
          </div>

          <FormField label="Chief Invigilator">
            <Input
              value={formData.invigilator}
              onChange={(e) => setFormData(prev => ({ ...prev, invigilator: e.target.value }))}
              placeholder="Prof. Name, Ph.D"
              disabled={isSaving}
            />
          </FormField>

          <FormField label="Official Candidate Instructions">
            <Textarea
              value={formData.instructions}
              onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
              rows={3}
              placeholder="Specific regulations and prohibited items for this paper"
              disabled={isSaving}
            />
          </FormField>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Examination Session?"
        message={`Are you sure you want to remove "${deleteDialog.exam?.title}" (${deleteDialog.exam?.examCode}) from the timetable?`}
        confirmText="Delete Exam"
        confirmVariant="danger"
        type="danger"
        isLoading={deleteDialog.isLoading}
        onConfirm={handleDeleteExam}
        onCancel={() => setDeleteDialog({ isOpen: false, exam: null, isLoading: false })}
      />
    </div>
  );
};

export default AdminExams;
