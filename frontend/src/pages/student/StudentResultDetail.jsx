import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, Printer } from 'lucide-react';
import { resultService } from '../../services/resultService';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/common/Button';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import './StudentPages.css';

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

const display = (value) => {
  if (value === undefined || value === null || value === '') return 'N/A';
  return value;
};

const StudentResultDetail = () => {
  const { id } = useParams();
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchResult = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await resultService.getById(id);
      setResult(res.data);
    } catch (err) {
      setError(err.message || 'Result record not found');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResult();
  }, [id]);

  if (isLoading) return <LoadingState message="Loading examination transcript..." />;
  if (error || !result) {
    return <ErrorState message={error || 'Result record not found'} onRetry={fetchResult} />;
  }

  const exam = result.exam || {};
  const student = result.student || {};
  const subject = exam.subject || exam.title || 'Examination Result';

  return (
    <div className="result-detail-page animate-fade-in">
      <PageHeader
        title={subject}
        subtitle={`${display(exam.examCode)} • Official Examination Result`}
        backUrl="/results"
        backText="Back to Results"
        badge={<StatusBadge status={result.status || 'N/A'} />}
        actions={
          <div className="result-detail-actions">
            <Button variant="outline" size="md" icon={Printer} onClick={() => window.print()}>
              Print Slip
            </Button>
          </div>
        }
      />

      <div className="official-result-certificate">
        <div className="cert-header">
          <div className="cert-header-left">
            <span className="cert-inst-name">DIRECTORATE OF ACADEMIC EVALUATION</span>
            <span className="cert-doc-type">Official Statement of Examination Marks</span>
          </div>
          <div className="cert-header-right">
            <StatusBadge status={result.status || 'N/A'} size="md" />
          </div>
        </div>

        <div className="cert-candidate-band">
          <div className="cert-cand-col">
            <span className="cand-label">Candidate Name</span>
            <span className="cand-value">{display(student.name)}</span>
          </div>
          <div className="cert-cand-col">
            <span className="cand-label">Student ID</span>
            <span className="cand-value">{display(student.studentId)}</span>
          </div>
          <div className="cert-cand-col">
            <span className="cand-label">Department</span>
            <span className="cand-value">{display(student.department)}</span>
          </div>
          <div className="cert-cand-col">
            <span className="cand-label">Academic Term</span>
            <span className="cand-value">
              {exam.semester ? `Semester ${exam.semester}` : 'N/A'}
              {exam.academicYear ? ` (${exam.academicYear})` : ''}
            </span>
          </div>
        </div>

        <div className="cert-score-highlight-grid">
          <div className="cert-score-card">
            <span className="score-k">Marks Secured</span>
            <div className="score-v-row">
              <span className="score-big text-primary">{display(result.marksObtained)}</span>
              <span className="score-denom">/ {display(result.maximumMarks)}</span>
            </div>
            <span className="score-sub">Maximum Marks: {display(result.maximumMarks)}</span>
          </div>

          <div className="cert-score-card">
            <span className="score-k">Percentage</span>
            <div className="score-v-row">
              <span className="score-big">
                {result.percentage !== undefined && result.percentage !== null
                  ? `${result.percentage}%`
                  : 'N/A'}
              </span>
            </div>
            <span className="score-sub">Calculated from recorded marks</span>
          </div>

          <div className="cert-score-card">
            <span className="score-k">Letter Grade</span>
            <div className="score-v-row">
              <span className="score-big text-success">{display(result.grade)}</span>
            </div>
            <span className="score-sub">Grade assigned from percentage</span>
          </div>

          <div className="cert-score-card">
            <span className="score-k">Result Status</span>
            <div className="score-v-row">
              <span className="score-big text-success">{display(result.status)}</span>
            </div>
            <span className="score-sub">
              {result.published ? 'Published' : 'Not published'}
            </span>
          </div>
        </div>

        <div className="cert-details-section">
          <h4 className="cert-sec-title">Examination Details</h4>
          <div className="cert-details-table">
            <div className="cert-row">
              <span className="row-k">Course Paper</span>
              <span className="row-v">{display(exam.title)}</span>
            </div>
            <div className="cert-row">
              <span className="row-k">Course Code</span>
              <span className="row-v">{display(exam.examCode)}</span>
            </div>
            <div className="cert-row">
              <span className="row-k">Subject</span>
              <span className="row-v">{display(exam.subject)}</span>
            </div>
            <div className="cert-row">
              <span className="row-k">Examination Held On</span>
              <span className="row-v">{formatDate(exam.examDate)}</span>
            </div>
            <div className="cert-row">
              <span className="row-k">Venue</span>
              <span className="row-v">{display(exam.venue)}</span>
            </div>
            <div className="cert-row">
              <span className="row-k">Room</span>
              <span className="row-v">{display(exam.room)}</span>
            </div>
            <div className="cert-row">
              <span className="row-k">Result Published Date</span>
              <span className="row-v">{formatDate(result.publishedAt)}</span>
            </div>
          </div>
        </div>

        <div className="cert-footer">
          <div className="cert-seal-box">
            <ShieldCheck size={28} className="text-primary" />
            <div>
              <span className="seal-title">Digitally Authenticated Certificate</span>
              <span className="seal-sub">Verified through institutional examination ledger</span>
            </div>
          </div>
          <div className="cert-signature-col">
            <span className="signature-line" />
            <span className="signature-name">Office of the Controller of Examinations</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentResultDetail;
