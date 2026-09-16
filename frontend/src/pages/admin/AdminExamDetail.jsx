import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Award,
  UserCheck,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Edit2
} from 'lucide-react';
import { examService } from '../../services/examService';
import { activityService } from '../../services/activityService';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/common/Button';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import { useToast } from '../../components/common/Toast';
import './AdminPages.css';

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
    try {
      const res = await examService.update(exam.id, { status: newStatus });
      setExam(res.data);
      await activityService.log('Updated Exam Status', exam.title, `Status updated to ${newStatus}`, 'Admin Officer', 'exams');
      showToast(`Exam session marked as ${newStatus}`, 'success');
    } catch (e) {
      showToast('Failed to update status', 'error');
    }
  };

  if (isLoading) return <LoadingState message="Loading exam administration record..." />;
  if (error || !exam) return <ErrorState message={error} onRetry={fetchExam} />;

  return (
    <div className="admin-exam-detail-page animate-fade-in">
      <PageHeader
        title={exam.title}
        subtitle={`${exam.examCode} • ${exam.department}`}
        backUrl="/admin/exams"
        backText="Back to Exams Management"
        badge={<StatusBadge status={exam.status} size="md" />}
        actions={
          <div className="exam-status-action-btns">
            {exam.status === 'Scheduled' && (
              <Button
                variant="primary"
                size="md"
                onClick={() => handleUpdateStatus('Completed')}
              >
                Mark as Completed
              </Button>
            )}
            {exam.status === 'Completed' && (
              <Button
                variant="outline"
                size="md"
                onClick={() => handleUpdateStatus('Scheduled')}
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
                <span className="spec-value">{exam.date}</span>
              </div>
            </div>

            <div className="spec-card">
              <div className="spec-card-icon text-warning bg-warning-light">
                <Clock size={18} />
              </div>
              <div className="spec-card-text">
                <span className="spec-title">Scheduled Hours</span>
                <span className="spec-value">{exam.startTime} - {exam.endTime}</span>
                <span className="spec-sub">{exam.duration}</span>
              </div>
            </div>

            <div className="spec-card">
              <div className="spec-card-icon text-success bg-success-light">
                <MapPin size={18} />
              </div>
              <div className="spec-card-text">
                <span className="spec-title">Venue & Seating</span>
                <span className="spec-value">{exam.venue}</span>
                <span className="spec-sub">Room: {exam.room}</span>
              </div>
            </div>

            <div className="spec-card">
              <div className="spec-card-icon text-info bg-info-light">
                <Award size={18} />
              </div>
              <div className="spec-card-text">
                <span className="spec-title">Evaluation Weight</span>
                <span className="spec-value">{exam.totalMarks} Total Marks</span>
                <span className="spec-sub">Passing: {exam.passingMarks}</span>
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
                {exam.instructions}
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
                <span className="meta-v">{exam.department}</span>
              </div>
              <div className="meta-pair">
                <span className="meta-k">Degree Program</span>
                <span className="meta-v">{exam.program}</span>
              </div>
              <div className="meta-pair">
                <span className="meta-k">Semester</span>
                <span className="meta-v">{exam.semester}</span>
              </div>
              <div className="meta-pair">
                <span className="meta-k">Academic Year</span>
                <span className="meta-v">{exam.academicYear}</span>
              </div>
              <div className="meta-pair">
                <span className="meta-k">Credits</span>
                <span className="meta-v">{exam.credits} Credits</span>
              </div>
            </div>
          </div>

          <div className="detail-meta-card">
            <h4 className="detail-sidebar-title">Designated Invigilator</h4>
            <div className="invigilator-box">
              <UserCheck size={20} className="text-primary" />
              <div className="invigilator-text">
                <span className="invigilator-name">{exam.invigilator}</span>
                <span className="invigilator-role">Head of Examination Hall</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminExamDetail;
