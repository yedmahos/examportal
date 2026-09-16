import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Award,
  UserCheck,
  FileText,
  ShieldCheck,
  AlertCircle,
  Building,
  GraduationCap
} from 'lucide-react';
import { examService } from '../../services/examService';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/common/Button';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import './StudentPages.css';

const StudentExamDetail = () => {
  const { id } = useParams();
  const [exam, setExam] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchExamDetail = async () => {
    setIsLoading(true);
    setError(null);
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
    fetchExamDetail();
  }, [id]);

  if (isLoading) return <LoadingState message="Retrieving exam details..." />;
  if (error || !exam) {
    return <ErrorState message={error || 'Exam not found'} onRetry={fetchExamDetail} />;
  }

  return (
    <div className="exam-detail-page animate-fade-in">
      <PageHeader
        title={exam.title}
        subtitle={`${exam.examCode} • ${exam.department}`}
        backUrl="/exams"
        backText="Back to Schedule"
        badge={<StatusBadge status={exam.status} size="md" />}
      />

      {/* Key Details Grid */}
      <div className="exam-detail-grid">
        {/* Left Column: Key Parameters and Instructions */}
        <div className="exam-detail-main">
          {/* Overview Cards */}
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
                <span className="spec-title">Time & Duration</span>
                <span className="spec-value">{exam.startTime} - {exam.endTime}</span>
                <span className="spec-sub">{exam.duration}</span>
              </div>
            </div>

            <div className="spec-card">
              <div className="spec-card-icon text-success bg-success-light">
                <MapPin size={18} />
              </div>
              <div className="spec-card-text">
                <span className="spec-title">Assigned Venue</span>
                <span className="spec-value">{exam.venue}</span>
                <span className="spec-sub">Room: {exam.room}</span>
              </div>
            </div>

            <div className="spec-card">
              <div className="spec-card-icon text-info bg-info-light">
                <Award size={18} />
              </div>
              <div className="spec-card-text">
                <span className="spec-title">Scoring Scheme</span>
                <span className="spec-value">{exam.totalMarks} Total Marks</span>
                <span className="spec-sub">Passing: {exam.passingMarks} Marks</span>
              </div>
            </div>
          </div>

          {/* Official Instructions Card */}
          <div className="exam-instructions-card">
            <div className="card-section-heading">
              <ShieldCheck size={18} className="text-primary" />
              <h3>Candidate Examination Instructions</h3>
            </div>
            <div className="instructions-body">
              <p className="instructions-note">
                Candidates must strictly adhere to university examination regulations. Any breach will be reported immediately to the Examination Disciplinary Board.
              </p>
              <div className="instructions-content-pre">
                {exam.instructions}
              </div>
            </div>
          </div>
        </div>

        {/* Right Rail: Academic Session & Invigilation Meta */}
        <div className="exam-detail-sidebar">
          <div className="detail-meta-card">
            <h4 className="detail-sidebar-title">Academic Details</h4>
            <div className="detail-meta-list">
              <div className="meta-pair">
                <span className="meta-k">Subject</span>
                <span className="meta-v">{exam.subject}</span>
              </div>
              <div className="meta-pair">
                <span className="meta-k">Exam Code</span>
                <span className="meta-v">{exam.examCode}</span>
              </div>
              <div className="meta-pair">
                <span className="meta-k">Department</span>
                <span className="meta-v">{exam.department}</span>
              </div>
              <div className="meta-pair">
                <span className="meta-k">Program</span>
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
                <span className="meta-v">{exam.credits} Credit Units</span>
              </div>
            </div>
          </div>

          <div className="detail-meta-card">
            <h4 className="detail-sidebar-title">Invigilation Authority</h4>
            <div className="invigilator-box">
              <UserCheck size={20} className="text-primary" />
              <div className="invigilator-text">
                <span className="invigilator-name">{exam.invigilator}</span>
                <span className="invigilator-role">Chief Hall Invigilator</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentExamDetail;
