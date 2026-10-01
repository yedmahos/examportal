import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit2, Trash2, Eye, Send, Undo2 } from 'lucide-react';
import { resultService } from '../../services/resultService';
import { studentService } from '../../services/studentService';
import { examService } from '../../services/examService';
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
import { useToast } from '../../components/common/Toast';
import './AdminPages.css';

const DEPARTMENTS = [
  'All',
  'Computer Science & Engineering',
  'Electrical Engineering',
  'Information Technology',
  'Data Science & AI',
];

const STATUSES = ['All', 'Published', 'Draft'];

const resultIdOf = (result) => result?.id || result?._id;

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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [currentResult, setCurrentResult] = useState(null);
  const [formData, setFormData] = useState({
    student: '',
    exam: '',
    marks: '',
    maxMarks: '',
    published: false,
  });
  const [isSaving, setIsSaving] = useState(false);

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
    } catch (err) {
      console.error(err);
      showToast('Failed to load examination results', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchSelectOptions = async () => {
      try {
        const sRes = await studentService.getAll({ limit: 100 });
        setStudents(sRes.data.items);
        const eRes = await examService.getAll({ limit: 100 });
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
    setCurrentResult(null);
    setFormData({
      student: '',
      exam: '',
      marks: '',
      maxMarks: '',
      published: false,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (result) => {
    setModalMode('edit');
    setCurrentResult(result);
    setFormData({
      student: result.student?._id || result.student?.id || '',
      exam: result.exam?._id || result.exam?.id || '',
      marks: result.marksObtained ?? '',
      maxMarks: result.maximumMarks ?? '',
      published: Boolean(result.published),
    });
    setIsModalOpen(true);
  };

  const handleSaveResult = async (e) => {
    e.preventDefault();

    if (!formData.student || !formData.exam) {
      showToast('Select a student and an exam before saving', 'error');
      return;
    }

    if (formData.marks === '' || formData.maxMarks === '') {
      showToast('Marks secured and maximum marks are required', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (modalMode === 'create') {
        const created = await resultService.create({
          student: formData.student,
          exam: formData.exam,
          marksObtained: Number(formData.marks),
          maximumMarks: Number(formData.maxMarks),
        });

        if (formData.published) {
          const createdId = created.data?.id || created.data?._id;
          if (!createdId) {
            throw new Error('Result was saved but could not be published');
          }
          await resultService.publish(createdId);
        }

        showToast('Examination result recorded', 'success');
      } else {
        const currentId = resultIdOf(currentResult);
        if (!currentId) {
          throw new Error('Could not identify this result');
        }

        await resultService.update(currentId, {
          marksObtained: Number(formData.marks),
          maximumMarks: Number(formData.maxMarks),
        });

        if (Boolean(formData.published) !== Boolean(currentResult.published)) {
          if (formData.published) {
            await resultService.publish(currentId);
          } else {
            await resultService.unpublish(currentId);
          }
        }

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
    const id = resultIdOf(result);
    if (!id) {
      showToast('Could not identify this result', 'error');
      return;
    }

    try {
      if (result.published) {
        await resultService.unpublish(id);
        showToast('Result reverted to Draft status', 'info');
      } else {
        await resultService.publish(id);
        showToast('Result published to student portal', 'success');
      }
      fetchResults();
    } catch (err) {
      showToast(err.message || 'Failed to update result status', 'error');
    }
  };

  const handleDeleteResult = async () => {
    const resItem = deleteDialog.result;
    const id = resultIdOf(resItem);
    if (!id) return;

    setDeleteDialog((prev) => ({ ...prev, isLoading: true }));
    try {
      await resultService.delete(id);
      showToast('Result record removed', 'success');
      setDeleteDialog({ isOpen: false, result: null, isLoading: false });
      fetchResults();
    } catch (err) {
      showToast(err.message || 'Failed to delete result', 'error');
      setDeleteDialog((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const columns = [
    {
      title: 'Candidate Name & ID',
      key: 'student',
      render: (_, row) => (
        <div className="table-user-info">
          <span className="user-primary-name">{row.student?.name || 'N/A'}</span>
          <span className="table-code-chip">{row.student?.studentId || 'N/A'}</span>
        </div>
      ),
    },
    {
      title: 'Course Paper',
      key: 'exam',
      render: (_, row) => (
        <div className="table-subject-cell">
          <span className="subject-title">{row.exam?.subject || 'N/A'}</span>
          <span className="exam-full-name">
            {row.exam?.examCode || 'N/A'} • {row.exam?.title || 'N/A'}
          </span>
        </div>
      ),
    },
    {
      title: 'Marks / Percentage',
      key: 'marksObtained',
      render: (_, row) => (
        <div className="table-score-col">
          <span className="score-number">
            {row.marksObtained ?? 'N/A'} / {row.maximumMarks ?? 'N/A'}
          </span>
          <span className="score-percent">
            ({row.percentage !== undefined && row.percentage !== null ? `${row.percentage}%` : 'N/A'})
          </span>
        </div>
      ),
    },
    {
      title: 'Grade',
      key: 'grade',
      render: (val) => {
        if (!val) return 'N/A';
        return (
          <span className={`table-grade-pill grade-${String(val).replace('+', 'plus')}`}>
            {val}
          </span>
        );
      },
    },
    {
      title: 'Standing',
      key: 'status',
      render: (val) => <StatusBadge status={val || 'N/A'} size="sm" />,
    },
    {
      title: 'Publish State',
      key: 'published',
      render: (val) => <StatusBadge status={val ? 'Published' : 'Draft'} size="sm" />,
    },
    {
      title: 'Actions',
      key: 'id',
      align: 'right',
      render: (_, row) => {
        const id = resultIdOf(row);
        return (
          <div className="table-row-actions">
            <Link
              to={`/admin/results/${id}`}
              className="row-action-btn"
              title="View statement slip"
            >
              <Eye size={15} />
            </Link>
            <button
              type="button"
              className="row-action-btn"
              title={row.published ? 'Unpublish to Draft' : 'Publish to Student Portal'}
              onClick={() => handleTogglePublish(row)}
            >
              {row.published ? <Undo2 size={15} /> : <Send size={15} />}
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
        );
      },
    },
  ];

  const deleteName = deleteDialog.result?.student?.name || 'this student';
  const deleteSubject = deleteDialog.result?.exam?.subject || 'this exam';

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
                options={DEPARTMENTS.map((d) => ({ value: d, label: d === 'All' ? 'All Departments' : d }))}
              />
            </div>

            <div className="toolbar-select-item">
              <Select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                options={STATUSES.map((s) => ({ value: s, label: s === 'All' ? 'All Statuses' : s }))}
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Record Examination Result' : 'Modify Result Entry'}
        subtitle="Grade and pass status are calculated from the marks you enter."
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
            <FormField label="Student" required>
              <Select
                value={formData.student}
                onChange={(e) => setFormData((prev) => ({ ...prev, student: e.target.value }))}
                placeholder="Select a student"
                options={students.map((student) => ({
                  value: student.id || student._id,
                  label: `${student.name}${student.studentId ? ` (${student.studentId})` : ''}`,
                }))}
                disabled={isSaving || modalMode === 'edit'}
              />
            </FormField>

            <FormField label="Exam" required>
              <Select
                value={formData.exam}
                onChange={(e) => setFormData((prev) => ({ ...prev, exam: e.target.value }))}
                placeholder="Select an exam"
                options={exams.map((exam) => ({
                  value: exam.id || exam._id,
                  label: `${exam.examCode ? `${exam.examCode} — ` : ''}${exam.subject || exam.title}`,
                }))}
                disabled={isSaving || modalMode === 'edit'}
              />
            </FormField>
          </div>

          <div className="form-grid-three">
            <FormField label="Marks Secured" required>
              <Input
                type="number"
                value={formData.marks}
                onChange={(e) => setFormData((prev) => ({ ...prev, marks: e.target.value }))}
                disabled={isSaving}
              />
            </FormField>

            <FormField label="Maximum Marks" required>
              <Input
                type="number"
                value={formData.maxMarks}
                onChange={(e) => setFormData((prev) => ({ ...prev, maxMarks: e.target.value }))}
                disabled={isSaving}
              />
            </FormField>

            <FormField label="Publication" required>
              <Select
                value={formData.published ? 'Published' : 'Draft'}
                onChange={(e) => setFormData((prev) => ({
                  ...prev,
                  published: e.target.value === 'Published',
                }))}
                options={[
                  { value: 'Draft', label: 'Draft' },
                  { value: 'Published', label: 'Published' },
                ]}
                disabled={isSaving}
              />
            </FormField>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Grade Record?"
        message={`Are you sure you want to permanently remove the mark entry for ${deleteName} in ${deleteSubject}?`}
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
