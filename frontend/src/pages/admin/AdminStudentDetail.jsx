import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  GraduationCap,
  Award,
  UserX,
  UserCheck
} from 'lucide-react';
import { studentService } from '../../services/studentService';
import { resultService } from '../../services/resultService';
import PageHeader from '../../components/common/PageHeader';
import Avatar from '../../components/common/Avatar';
import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import { useToast } from '../../components/common/Toast';
import './AdminPages.css';

const AdminStudentDetail = () => {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [studentResults, setStudentResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const { showToast } = useToast();

  const fetchStudentData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const sRes = await studentService.getById(id);
      setStudent(sRes.data);

      const recordId = sRes.data?.id || sRes.data?._id;
      const rRes = await resultService.getAll({
        student: recordId,
        limit: 100,
      });
      setStudentResults(rRes.data.items || []);
    } catch (err) {
      setError(err.message || 'Student record could not be loaded');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, [id]);

  const handleToggleStatus = async () => {
    const recordId = student.id || student._id;
    const nextStatus = student.status === 'active' ? 'inactive' : 'active';

    if (!recordId) {
      showToast('Student record is missing an ID', 'error');
      return;
    }

    setIsToggling(true);
    try {
      const res = await studentService.toggleStatus(recordId, nextStatus);
      setStudent(res.data);
      setIsConfirmOpen(false);
      showToast(`Student status updated to ${res.data?.status || nextStatus}`, 'success');
    } catch (e) {
      showToast(e.message || 'Failed to update status', 'error');
    } finally {
      setIsToggling(false);
    }
  };

  if (isLoading) return <LoadingState message="Loading candidate dossier..." />;
  if (error || !student) return <ErrorState message={error} onRetry={fetchStudentData} />;

  const isActive = student.status === 'active';
  const gpaLabel = typeof student.gpa === 'number' ? student.gpa.toFixed(2) : 'N/A';
  const creditsLabel = typeof student.creditsCompleted === 'number' ? student.creditsCompleted : 'N/A';
  const semesterLabel = student.semester ? `Semester ${student.semester}` : 'N/A';

  return (
    <div className="admin-student-detail-page animate-fade-in">
      <PageHeader
        title={student.name}
        subtitle={`${student.studentId} • ${student.department}`}
        backUrl="/admin/students"
        backText="Back to Students Directory"
        badge={<StatusBadge status={student.status} size="md" />}
        actions={
          <Button
            variant={isActive ? 'outline' : 'primary'}
            icon={isActive ? UserX : UserCheck}
            onClick={() => setIsConfirmOpen(true)}
          >
            {isActive ? 'Deactivate Student' : 'Activate Student'}
          </Button>
        }
      />

      <div className="profile-layout-grid">
        {/* Left Column: Summary Card */}
        <div className="profile-hero-card">
          <div className="profile-hero-top">
            <Avatar src={student.profileImage || student.avatar} name={student.name} size="xl" />
            <div className="profile-name-stack">
              <h2 className="profile-full-name">{student.name}</h2>
              <span className="profile-student-id">{student.studentId}</span>
              <div className="profile-status-row">
                <StatusBadge status={student.status} />
                <span className="profile-program-tag">{semesterLabel}</span>
              </div>
            </div>
          </div>

          <div className="profile-quick-stats">
            <div className="p-stat-box">
              <span className="p-stat-num text-primary">{gpaLabel}</span>
              <span className="p-stat-lbl">Cumulative GPA</span>
            </div>
            <div className="p-stat-box">
              <span className="p-stat-num">{creditsLabel}</span>
              <span className="p-stat-lbl">Credits Done</span>
            </div>
            <div className="p-stat-box">
              <span className="p-stat-num text-success">{studentResults.length}</span>
              <span className="p-stat-lbl">Papers Graded</span>
            </div>
          </div>
        </div>

        {/* Right Column: Academic Details and Results History */}
        <div className="profile-info-column">
          <div className="profile-section-card">
            <div className="section-card-title-row">
              <GraduationCap size={18} className="text-primary" />
              <h3 className="section-card-title">Enrolled Academic Program</h3>
            </div>

            <div className="profile-fields-grid">
              <div className="p-field-item">
                <span className="p-field-label">Department</span>
                <span className="p-field-value">{student.department}</span>
              </div>
              <div className="p-field-item">
                <span className="p-field-label">Degree Program</span>
                <span className="p-field-value">{student.program}</span>
              </div>
              <div className="p-field-item">
                <span className="p-field-label">Current Semester</span>
                <span className="p-field-value">{semesterLabel}</span>
              </div>
              <div className="p-field-item">
                <span className="p-field-label">Academic Session</span>
                <span className="p-field-value">{student.academicYear}</span>
              </div>
              <div className="p-field-item">
                <span className="p-field-label">Email</span>
                <span className="p-field-value">{student.email}</span>
              </div>
              <div className="p-field-item">
                <span className="p-field-label">Phone</span>
                <span className="p-field-value">{student.phone || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Published Results Table for this student */}
          <div className="profile-section-card">
            <div className="section-card-title-row">
              <Award size={18} className="text-primary" />
              <h3 className="section-card-title">Completed Examination Papers</h3>
            </div>

            {studentResults.length === 0 ? (
              <p className="empty-subtext">No examination marks recorded for this candidate yet.</p>
            ) : (
              <div className="table-responsive">
                <table className="enlight-styled-table">
                  <thead>
                    <tr>
                      <th>Exam Code</th>
                      <th>Subject</th>
                      <th>Marks</th>
                      <th>Grade</th>
                      <th>Result</th>
                      <th>Publication</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentResults.map((r) => (
                      <tr key={r.id || r._id}>
                        <td className="table-id-cell">{r.exam?.examCode || 'N/A'}</td>
                        <td style={{ fontWeight: 600 }}>{r.exam?.subject || r.exam?.title || 'N/A'}</td>
                        <td>
                          {r.marksObtained ?? 'N/A'} / {r.maximumMarks ?? 'N/A'}
                          {' '}({r.percentage ?? 'N/A'}%)
                        </td>
                        <td><span className="grade-badge">{r.grade || 'N/A'}</span></td>
                        <td><StatusBadge status={r.status || 'N/A'} size="sm" /></td>
                        <td><StatusBadge status={r.published ? 'Published' : 'Draft'} size="sm" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title={isActive ? 'Deactivate Student?' : 'Activate Student?'}
        message={`Are you sure you want to change the status of ${student.name}?`}
        confirmText={isActive ? 'Deactivate' : 'Activate'}
        confirmVariant={isActive ? 'danger' : 'primary'}
        isLoading={isToggling}
        onConfirm={handleToggleStatus}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
};

export default AdminStudentDetail;
