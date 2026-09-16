import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Award, Search, Plus, Edit2, Trash2, Eye, CheckCircle, FileText, Send, Undo2 } from 'lucide-react';
import { resultService } from '../../services/resultService';
import { studentService } from '../../services/studentService';
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
];

const STATUSES = ['All', 'Published', 'Draft', 'Under Review'];

const AdminResults = () => {
  const [results, setResults] = useState([]);
  const [students, setStudents] = useState([]);
  const [exams, setExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal create/edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [currentResult, setCurrentResult] = useState(null);
  const [formData, setFormData] = useState({
    studentId: '',
    studentName: '',
    examId: '',
    examTitle: '',
    examCode: '',
    subject: '',
    department: 'Computer Science & Engineering',
    semester: '6th Semester',
    academicYear: '2025 - 2026',
    marks: 85,
    maxMarks: 100,
    remarks: 'Approved by board of examiners.',
    status: 'Published',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    result: null,
    isLoading: false,
  });

  const { showToast } = useToast();

  const fetchResults = async () => {
    setIsLoading(true);
    try {
      const res = await resultService.getAll({
        search,
        department,
        status,
        page,
        limit: 8,
      });
      setResults(res.data.items);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch (e) {
      console.error(e);
      showToast('Failed to load examination results', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchSelectOptions = async () => {
      try {
        const sRes = await studentService.getAll({ limit: 50 });
        setStudents(sRes.data.items);
        const eRes = await examService.getAll({ limit: 50 });
        setExams(eRes.data.items);
      } catch (err) {
        console.error(err);
      }
    };
    fetchSelectOptions();
  }, []);

  useEffect(() => {
    fetchResults();
  }, [search, department, status, page]);

  const handleOpenCreate = () => {
    setModalMode('create');
    const firstStudent = students[0];
    const firstExam = exams[0];

    setFormData({
      studentId: firstStudent?.studentId || 'STU-2024-8842',
      studentName: firstStudent?.name || 'Rohmad Khoirudin',
      examId: firstExam?.id || 'ex-101',
      examTitle: firstExam?.title || 'Distributed Systems',
      examCode: firstExam?.examCode || 'CS-401',
      subject: firstExam?.subject || 'Distributed Systems',
      department: firstStudent?.department || 'Computer Science & Engineering',
      semester: firstStudent?.semester || '6th Semester',
      academicYear: '2025 - 2026',
      marks: 88,
      maxMarks: 100,
      remarks: 'Verified by departmental board.',
      status: 'Published',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (result) => {
    setModalMode('edit');
    setCurrentResult(result);
    setFormData({
      studentId: result.studentId,
      studentName: result.studentName,
      examId: result.examId,
      examTitle: result.examTitle,
      examCode: result.examCode,
      subject: result.subject,
      department: result.department,
      semester: result.semester,
      academicYear: result.academicYear,
      marks: result.marks,
      maxMarks: result.maxMarks,
      remarks: result.remarks,
      status: result.status,
    });
    setIsModalOpen(true);
  };

  const handleSaveResult = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (modalMode === 'create') {
        await resultService.create(formData);
        await activityService.log('Entered Examination Mark', formData.examTitle, `Score entered for candidate ${formData.studentName}`, 'Admin Officer', 'results');
        showToast('Examination result recorded', 'success');
      } else {
        await resultService.update(currentResult.id, formData);
        await activityService.log('Updated Examination Mark', formData.examTitle, `Score updated for ${formData.studentName}`, 'Admin Officer', 'results');
        showToast('Result updated successfully', 'success');
      }
      setIsModalOpen(false);
      fetchResults();
    } catch (err) {
      showToast(err.message || 'Operation failed', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublish = async (result) => {
    try {
      if (result.status === 'Published') {
        await resultService.unpublish(result.id);
        await activityService.log('Unpublished Marksheet', result.examTitle, `Reverted mark transcript to draft for ${result.studentName}`, 'Admin Officer', 'results');
        showToast(`Result reverted to Draft status`, 'info');
      } else {
        await resultService.publish(result.id);
        await activityService.log('Published Marksheet', result.examTitle, `Published verified grade certificate for ${result.studentName}`, 'Admin Officer', 'results');
        showToast(`Result published to student portal`, 'success');
      }
      fetchResults();
    } catch (err) {
      showToast('Failed to update result status', 'error');
    }
  };

  const handleDeleteResult = async () => {
    const resItem = deleteDialog.result;
    if (!resItem) return;

    setDeleteDialog(prev => ({ ...prev, isLoading: true }));
    try {
      await resultService.delete(resItem.id);
      showToast('Result record removed', 'success');
      setDeleteDialog({ isOpen: false, result: null, isLoading: false });
      fetchResults();
    } catch (err) {
      showToast('Failed to delete result', 'error');
      setDeleteDialog(prev => ({ ...prev, isLoading: false }));
    }
  };

  const columns = [
    {
      title: 'Candidate Name & ID',
      key: 'studentName',
      render: (val, row) => (
        <div className="table-user-info">
          <span className="user-primary-name">{val}</span>
          <span className="table-code-chip">{row.studentId}</span>
        </div>
      ),
    },
    {
      title: 'Course Paper',
      key: 'subject',
      render: (val, row) => (
        <div className="table-subject-cell">
          <span className="subject-title">{val}</span>
          <span className="exam-full-name">{row.examCode} • {row.examTitle}</span>
        </div>
      ),
    },
    {
      title: 'Marks / Percentage',
      key: 'marks',
      render: (val, row) => (
        <div className="table-score-col">
          <span className="score-number">{val} / {row.maxMarks}</span>
          <span className="score-percent">({row.percentage}%)</span>
        </div>
      ),
    },
    {
      title: 'Grade',
      key: 'grade',
      render: (val) => (
        <span className={`table-grade-pill grade-${val.replace('+', 'plus')}`}>
          {val}
        </span>
      ),
    },
    {
      title: 'Standing',
      key: 'passFail',
      render: (val) => <StatusBadge status={val} size="sm" />,
    },
    {
      title: 'Publish State',
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
            to={`/admin/results/${val}`}
            className="row-action-btn"
            title="View statement slip"
          >
            <Eye size={15} />
          </Link>
          <button
            type="button"
            className="row-action-btn"
            title={row.status === 'Published' ? 'Unpublish to Draft' : 'Publish to Student Portal'}
            onClick={() => handleTogglePublish(row)}
          >
            {row.status === 'Published' ? <Undo2 size={15} /> : <Send size={15} />}
          </button>
          <button
            type="button"
            className="row-action-btn"
            title="Edit mark"
            onClick={() => handleOpenEdit(row)}
          >
            <Edit2 size={15} />
          </button>
          <button
            type="button"
            className="row-action-btn btn-danger-action"
            title="Delete mark"
            onClick={() => setDeleteDialog({ isOpen: true, result: row, isLoading: false })}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="admin-results-page animate-fade-in">
      <PageHeader
        title="Grades & Results Management"
        subtitle="Manage marks entry, grade distribution, and official marksheet publication"
        actions={
          <Button
            variant="primary"
            size="md"
            icon={Plus}
            onClick={handleOpenCreate}
          >
            Record Grade Entry
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
              placeholder="Search candidate name or ID..."
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

      <div className="admin-table-panel">
        <DataTable
          columns={columns}
          data={results}
          isLoading={isLoading}
          emptyTitle="No results found"
          emptyDescription="There are no examination marks records matching your filter."
          pagination={{
            page,
            totalPages,
            total,
            limit: 8,
            onPageChange: setPage,
          }}
        />
      </div>

      {/* Record/Edit Result Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Record Examination Result' : 'Modify Result Entry'}
        subtitle="Grade calculations and passing criteria will be updated automatically."
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
              onClick={handleSaveResult}
              isLoading={isSaving}
            >
              {modalMode === 'create' ? 'Save & Record' : 'Update Record'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveResult}>
          <div className="form-grid-two">
            <FormField label="Candidate Name" required>
              <Input
                value={formData.studentName}
                onChange={(e) => setFormData(prev => ({ ...prev, studentName: e.target.value }))}
                placeholder="Candidate Full Name"
                disabled={isSaving}
              />
            </FormField>

            <FormField label="Student ID" required>
              <Input
                value={formData.studentId}
                onChange={(e) => setFormData(prev => ({ ...prev, studentId: e.target.value }))}
                placeholder="STU-2024-XXXX"
                disabled={isSaving}
              />
            </FormField>
          </div>

          <div className="form-grid-two">
            <FormField label="Exam Title" required>
              <Input
                value={formData.examTitle}
                onChange={(e) => setFormData(prev => ({ ...prev, examTitle: e.target.value }))}
                placeholder="Course Exam Title"
                disabled={isSaving}
              />
            </FormField>

            <FormField label="Course Code" required>
              <Input
                value={formData.examCode}
                onChange={(e) => setFormData(prev => ({ ...prev, examCode: e.target.value }))}
                placeholder="e.g. CS-401"
                disabled={isSaving}
              />
            </FormField>
          </div>

          <div className="form-grid-three">
            <FormField label="Marks Secured" required>
              <Input
                type="number"
                value={formData.marks}
                onChange={(e) => setFormData(prev => ({ ...prev, marks: e.target.value }))}
                disabled={isSaving}
              />
            </FormField>

            <FormField label="Maximum Marks" required>
              <Input
                type="number"
                value={formData.maxMarks}
                onChange={(e) => setFormData(prev => ({ ...prev, maxMarks: e.target.value }))}
                disabled={isSaving}
              />
            </FormField>

            <FormField label="Status" required>
              <Select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                options={[
                  { value: 'Published', label: 'Published' },
                  { value: 'Draft', label: 'Draft' },
                  { value: 'Under Review', label: 'Under Review' },
                ]}
                disabled={isSaving}
              />
            </FormField>
          </div>

          <FormField label="Evaluation Remarks">
            <Textarea
              value={formData.remarks}
              onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
              rows={3}
              placeholder="Internal moderation notes or student certificate feedback"
              disabled={isSaving}
            />
          </FormField>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Grade Record?"
        message={`Are you sure you want to permanently remove the mark entry for ${deleteDialog.result?.studentName} in ${deleteDialog.result?.subject}?`}
        confirmText="Delete Record"
        confirmVariant="danger"
        type="danger"
        isLoading={deleteDialog.isLoading}
        onConfirm={handleDeleteResult}
        onCancel={() => setDeleteDialog({ isOpen: false, result: null, isLoading: false })}
      />
    </div>
  );
};

export default AdminResults;
