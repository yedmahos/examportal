import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  BookOpen,
  UserCheck,
  ShieldCheck
} from 'lucide-react';
import { examService } from '../../services/examService';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/common/Button';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import { useToast } from '../../components/common/Toast';
import './AdminPages.css';

const display = (value) => (
  value === undefined || value === null || value === '' ? 'N/A' : value
);

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

const formatSemester = (value) => {
  if (value === undefined || value === null || value === '') return 'N/A';
  return `Semester ${value}`;
};

const AdminExamDetail = () => {
  const { id } = useParams();
  const [exam, setExam] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { showToast } = useToast();

  const fetchExam = async () => {
    setIsLoading(true);
    try {
      const res = await examService.getById(id);
      setExam(res.data);
    } catch (err) {
      setError(err.message || 'Exam record not found');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExam();
  }, [id]);

  const handleUpdateStatus = async (newStatus) => {
    const examId = exam.id || exam._id;
    if (!examId) {
      showToast('Exam record is missing an ID', 'error');
      return;
    }

    try {
      const res = await examService.update(examId, { status: newStatus });
      setExam(res.data);
      showToast(`Exam session marked as ${newStatus}`, 'success');
    } catch (e) {
      showToast(e.message || 'Failed to update status', 'error');
    }
  };

  if (isLoading) return <LoadingState message="Loading exam administration record..." />;
  if (error || !exam) return <ErrorState message={error} onRetry={fetchExam} />;

  const status = String(exam.status || '').toLowerCase();

  return (
    <div className="admin-exam-detail-page animate-fade-in">
      <PageHeader
        title={exam.title}
        subtitle={`${display(exam.examCode)} • ${display(exam.department)}`}
        backUrl="/admin/exams"
        backText="Back to Exams Management"
        badge={<StatusBadge status={exam.status} size="md" />}
        actions={
          <div className="exam-status-action-btns">
            {(status === 'scheduled' || status === 'ongoing') && (
              <Button
                variant="primary"
                size="md"
                onClick={() => handleUpdateStatus('completed')}
              >
                Mark as Completed
              </Button>
            )}
            {status === 'completed' && (
              <Button
                variant="outline"
                size="md"
                onClick={() => handleUpdateStatus('scheduled')}
              >
                Reopen Session
              </Button>
            )}
          </div>
        }
      />

      <div className="exam-detail-grid">
        <div className="exam-detail-main">
          <div className="exam-spec-cards-row">
            <div className="spec-card">
              <div className="spec-card-icon text-primary bg-primary-light">
                <Calendar size={18} />
              </div>
              <div className="spec-card-text">
                <span className="spec-title">Exam Date</span>
                <span className="spec-value">{formatDate(exam.examDate)}</span>
              </div>
            </div>

            <div className="spec-card">
              <div className="spec-card-icon text-warning bg-warning-light">
                <Clock size={18} />
              </div>
              <div className="spec-card-text">
                <span className="spec-title">Scheduled Hours</span>
                <span className="spec-value">{display(exam.startTime)} - {display(exam.endTime)}</span>
                <span className="spec-sub">{display(exam.duration)}</span>
              </div>
            </div>

            <div className="spec-card">
              <div className="spec-card-icon text-success bg-success-light">
                <MapPin size={18} />
              </div>
              <div className="spec-card-text">
                <span className="spec-title">Venue & Seating</span>
                <span className="spec-value">{display(exam.venue)}</span>
                <span className="spec-sub">Room: {display(exam.room)}</span>
              </div>
            </div>

            <div className="spec-card">
              <div className="spec-card-icon text-info bg-info-light">
                <BookOpen size={18} />
              </div>
              <div className="spec-card-text">
                <span className="spec-title">Subject</span>
                <span className="spec-value">{display(exam.subject)}</span>
                <span className="spec-sub">{display(exam.examCode)}</span>
              </div>
            </div>
          </div>

          <div className="exam-instructions-card">
            <div className="card-section-heading">
              <ShieldCheck size={18} className="text-primary" />
              <h3>Candidate Instructions & Regulations</h3>
            </div>
            <div className="instructions-body">
              <div className="instructions-content-pre">
                {display(exam.instructions)}
              </div>
            </div>
          </div>
        </div>

        <div className="exam-detail-sidebar">
          <div className="detail-meta-card">
            <h4 className="detail-sidebar-title">Curriculum Registry</h4>
            <div className="detail-meta-list">
              <div className="meta-pair">
                <span className="meta-k">Department</span>
                <span className="meta-v">{display(exam.department)}</span>
              </div>
              <div className="meta-pair">
                <span className="meta-k">Degree Program</span>
                <span className="meta-v">{display(exam.program)}</span>
              </div>
              <div className="meta-pair">
                <span className="meta-k">Semester</span>
                <span className="meta-v">{formatSemester(exam.semester)}</span>
              </div>
              <div className="meta-pair">
                <span className="meta-k">Academic Year</span>
                <span className="meta-v">{display(exam.academicYear)}</span>
              </div>
            </div>
          </div>

          <div className="detail-meta-card">
            <h4 className="detail-sidebar-title">Designated Invigilator</h4>
            <div className="invigilator-box">
              <UserCheck size={20} className="text-primary" />
              <div className="invigilator-text">
                <span className="invigilator-name">N/A</span>
                <span className="invigilator-role">No invigilator is stored for this exam</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminExamDetail;
