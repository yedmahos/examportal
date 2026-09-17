import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, Plus, Edit2, UserX, UserCheck, Eye, Filter } from 'lucide-react';
import { studentService } from '../../services/studentService';
import { activityService } from '../../services/activityService';
import PageHeader from '../../components/common/PageHeader';
import SearchBar from '../../components/common/SearchBar';
import Select from '../../components/common/Select';
import Button from '../../components/common/Button';
import Avatar from '../../components/common/Avatar';
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
  'Mechanical Engineering',
];

const SEMESTERS = [
  'All',
  '1st Semester',
  '2nd Semester',
  '4th Semester',
  '6th Semester',
  '8th Semester',
];

const AdminStudents = () => {
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All');
  const [semester, setSemester] = useState('All');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Edit/Create Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [currentStudent, setCurrentStudent] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    studentId: '',
    department: 'Computer Science & Engineering',
    program: 'B.Sc. in Software Engineering',
    semester: '1st Semester',
    academicYear: '2025 - 2026',
    phone: '',
    status: 'Active',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Status toggle confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    student: null,
    isLoading: false,
  });

  const { showToast } = useToast();

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const res = await studentService.getAll({
        search,
        department,
        semester,
        status,
        page,
        limit: 8,
      });
      setStudents(res.data.items);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error(err);
      showToast('Failed to load students directory', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [search, department, semester, status, page]);

  const handleOpenCreate = () => {
    setModalMode('create');
    setFormData({
      name: '',
      email: '',
      studentId: `STU-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      department: 'Computer Science & Engineering',
      program: 'B.Sc. in Software Engineering',
      semester: '1st Semester',
      academicYear: '2025 - 2026',
      phone: '',
      status: 'Active',
      gpa: '',
      creditsCompleted: '',
      totalCredits: '',
      academicStanding: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (student) => {
    setModalMode('edit');
    setCurrentStudent(student);
    setFormData({
      name: student.name || '',
      email: student.email || '',
      studentId: student.studentId || '',
      department: student.department || 'Computer Science & Engineering',
      program: student.program || 'B.Sc. in Software Engineering',
      semester: student.semester || '1st Semester',
      academicYear: student.academicYear || '2025 - 2026',
      phone: student.phone || '',
      status: student.status || 'Active',
      gpa: student.gpa !== undefined && student.gpa !== null ? student.gpa : '',
      creditsCompleted: student.creditsCompleted !== undefined && student.creditsCompleted !== null ? student.creditsCompleted : '',
      totalCredits: student.totalCredits !== undefined && student.totalCredits !== null ? student.totalCredits : '',
      academicStanding: student.academicStanding || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      showToast('Name and email are required', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (modalMode === 'create') {
        await studentService.create(formData);
        await activityService.log('Enrolled Student', formData.name, `New student account created with ID ${formData.studentId}`, 'Admin Officer', 'students');
        showToast('New student record created successfully', 'success');
      } else {
        await studentService.update(currentStudent.id, formData);
        await activityService.log('Updated Student Record', formData.name, `Updated student data for ID ${formData.studentId}`, 'Admin Officer', 'students');
        showToast('Student record updated successfully', 'success');
      }
      setIsModalOpen(false);
      fetchStudents();
    } catch (err) {
      showToast(err.message || 'Operation failed', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmToggleStatus = async () => {
    const student = confirmDialog.student;
    if (!student) return;

    setConfirmDialog(prev => ({ ...prev, isLoading: true }));
    try {
      const nextStatus = student.status === 'active' ? 'inactive' : 'active';
      await studentService.toggleStatus(student.id || student._id, nextStatus);
      try {
        await activityService.log('Changed Student Status', student.name, `Student status updated to ${nextStatus}`, 'Admin Officer', 'students');
      } catch (logErr) {
        console.warn('Activity log failed:', logErr);
      }
      showToast(`Student record is now ${nextStatus}`, 'success');
      setConfirmDialog({ isOpen: false, student: null, isLoading: false });
      fetchStudents();
    } catch (err) {
      showToast('Failed to change status', 'error');
      setConfirmDialog(prev => ({ ...prev, isLoading: false }));
    }
  };

  const columns = [
    {
      title: 'Candidate Name',
      key: 'name',
      render: (val, row) => (
        <div className="table-user-cell">
          <Avatar src={row.avatar} name={val} size="sm" />
          <div className="table-user-info">
            <span className="user-primary-name">{val}</span>
            <span className="user-sub-email">{row.email}</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Student ID',
      key: 'studentId',
      render: (val) => <span className="table-code-chip">{val}</span>,
    },
    {
      title: 'Department',
      key: 'department',
      render: (val) => <span className="table-dept-text">{val}</span>,
    },
    {
      title: 'Semester',
      key: 'semester',
    },
    {
      title: 'GPA',
      key: 'gpa',
      render: (val) => <span className="table-gpa-val">{val ? val.toFixed(2) : 'N/A'}</span>,
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
            to={`/admin/students/${val}`}
            className="row-action-btn"
            title="View full dossier"
          >
            <Eye size={15} />
          </Link>
          <button
            type="button"
            className="row-action-btn"
            title="Edit student details"
            onClick={() => handleOpenEdit(row)}
          >
            <Edit2 size={15} />
          </button>
          <button
            type="button"
            className={`row-action-btn ${row.status === 'active' ? 'btn-warn-action' : 'btn-success-action'}`}
            title={row.status === 'active' ? 'Deactivate student' : 'Activate student'}
            aria-label={row.status === 'active' ? 'Deactivate student' : 'Activate student'}
            onClick={() => setConfirmDialog({ isOpen: true, student: row, isLoading: false })}
          >
            {row.status === 'active' ? <UserX size={15} /> : <UserCheck size={15} />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="admin-students-page animate-fade-in">
      <PageHeader
        title="Students Directory"
        subtitle="Manage enrolled students, academic standing, and departmental verification"
        actions={
          <Button
            variant="primary"
            size="md"
            icon={Plus}
            onClick={handleOpenCreate}
          >
            Add Student Record
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="admin-toolbar-card">
        <div className="toolbar-top-row">
          <div className="toolbar-search-wrap">
            <SearchBar
              value={search}
              onChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              placeholder="Search name, ID, or email..."
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
                value={semester}
                onChange={(e) => {
                  setSemester(e.target.value);
                  setPage(1);
                }}
                options={SEMESTERS.map(s => ({ value: s, label: s === 'All' ? 'All Semesters' : s }))}
              />
            </div>

            <div className="toolbar-select-item">
              <Select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: 'All', label: 'All Statuses' },
                  { value: 'Active', label: 'Active' },
                  { value: 'Inactive', label: 'Inactive' },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="admin-table-panel">
        <DataTable
          columns={columns}
          data={students}
          isLoading={isLoading}
          emptyTitle="No student records found"
          emptyDescription="Try adjusting your search criteria or filters."
          pagination={{
            page,
            totalPages,
            total,
            limit: 8,
            onPageChange: setPage,
          }}
        />
      </div>

      {/* Create / Edit Student Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Create New Student Record' : 'Edit Student Record'}
        subtitle="Ensure student ID matches official institutional registry format."
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
              onClick={handleSaveStudent}
              isLoading={isSaving}
            >
              {modalMode === 'create' ? 'Create Student' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveStudent}>
          <div className="form-grid-two">
            <FormField label="Full Name" required>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Student Full Name"
                disabled={isSaving}
              />
            </FormField>

            <FormField label="Student ID" required>
              <Input
                value={formData.studentId}
                onChange={(e) => setFormData(prev => ({ ...prev, studentId: e.target.value }))}
                placeholder="STU-2026-XXXX"
                disabled={isSaving}
              />
            </FormField>
          </div>

          <div className="form-grid-two">
            <FormField label="Institutional Email" required>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="student@campus.edu"
                disabled={isSaving}
              />
            </FormField>

            <FormField label="Phone Number">
              <Input
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+1 (555) 000-0000"
                disabled={isSaving}
              />
            </FormField>
          </div>

          <div className="form-grid-two">
            <FormField label="Department" required>
              <Select
                value={formData.department}
                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                options={DEPARTMENTS.filter(d => d !== 'All')}
                disabled={isSaving}
              />
            </FormField>

            <FormField label="Degree Program" required>
              <Input
                value={formData.program}
                onChange={(e) => setFormData(prev => ({ ...prev, program: e.target.value }))}
                placeholder="e.g. B.Sc. in Software Engineering"
                disabled={isSaving}
              />
            </FormField>
          </div>

          <div className="form-grid-two">
            <FormField label="Current Semester" required>
              <Select
                value={formData.semester}
                onChange={(e) => setFormData(prev => ({ ...prev, semester: e.target.value }))}
                options={SEMESTERS.filter(s => s !== 'All')}
                disabled={isSaving}
              />
            </FormField>

            <FormField label="Account Status" required>
              <Select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                options={[
                  { value: 'Active', label: 'Active' },
                  { value: 'Inactive', label: 'Inactive' },
                ]}
                disabled={isSaving}
              />
            </FormField>
          </div>

          <div className="form-grid-two">
            <FormField label="Cumulative GPA (0.00 - 4.00)">
              <Input
                type="number"
                step="0.01"
                min="0"
                max="4"
                value={formData.gpa}
                onChange={(e) => setFormData(prev => ({ ...prev, gpa: e.target.value }))}
                placeholder="e.g. 3.75"
                disabled={isSaving}
              />
            </FormField>

            <FormField label="Academic Standing">
              <Input
                value={formData.academicStanding}
                onChange={(e) => setFormData(prev => ({ ...prev, academicStanding: e.target.value }))}
                placeholder="e.g. First Class Honours / Good"
                disabled={isSaving}
              />
            </FormField>
          </div>

          <div className="form-grid-two">
            <FormField label="Credits Completed">
              <Input
                type="number"
                min="0"
                value={formData.creditsCompleted}
                onChange={(e) => setFormData(prev => ({ ...prev, creditsCompleted: e.target.value }))}
                placeholder="e.g. 120"
                disabled={isSaving}
              />
            </FormField>

            <FormField label="Total Program Credits">
              <Input
                type="number"
                min="0"
                value={formData.totalCredits}
                onChange={(e) => setFormData(prev => ({ ...prev, totalCredits: e.target.value }))}
                placeholder="e.g. 144"
                disabled={isSaving}
              />
            </FormField>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog for Status Change */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.student?.status === 'active' ? 'Deactivate Student Account?' : 'Activate Student Account?'}
        message={
          confirmDialog.student?.status === 'active'
            ? `Are you sure you want to deactivate ${confirmDialog.student?.name} (${confirmDialog.student?.studentId})? The student will be temporarily blocked from viewing exam schedules and marks.`
            : `Are you sure you want to restore active standing for ${confirmDialog.student?.name}?`
        }
        confirmText={confirmDialog.student?.status === 'active' ? 'Deactivate' : 'Activate'}
        confirmVariant={confirmDialog.student?.status === 'active' ? 'danger' : 'primary'}
        type={confirmDialog.student?.status === 'active' ? 'warning' : 'info'}
        isLoading={confirmDialog.isLoading}
        onConfirm={handleConfirmToggleStatus}
        onCancel={() => setConfirmDialog({ isOpen: false, student: null, isLoading: false })}
      />
    </div>
  );
};

export default AdminStudents;
