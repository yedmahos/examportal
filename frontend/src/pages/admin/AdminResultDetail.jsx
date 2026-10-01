import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Undo2, Send } from 'lucide-react';
import { resultService } from '../../services/resultService';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/common/Button';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import { useToast } from '../../components/common/Toast';
import './AdminPages.css';

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

const AdminResultDetail = () => {
  const { id } = useParams();
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { showToast } = useToast();

  const fetchResult = async () => {
    setIsLoading(true);
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

  const handleTogglePublish = async () => {
    const resultId = result?.id || result?._id;
    if (!resultId) {
      showToast('Could not identify this result', 'error');
      return;
    }

    try {
      const res = result.published
        ? await resultService.unpublish(resultId)
        : await resultService.publish(resultId);
      setResult(res.data);
      showToast(
        result.published ? 'Result reverted to Draft' : 'Result published to student portal',
        result.published ? 'info' : 'success'
      );
    } catch (err) {
      showToast(err.message || 'Failed to change publish state', 'error');
    }
  };

  if (isLoading) return <LoadingState message="Loading examination mark record..." />;
  if (error || !result) return <ErrorState message={error} onRetry={fetchResult} />;

  const exam = result.exam || {};
  const student = result.student || {};
  const publishLabel = result.published ? 'Published' : 'Draft';

  return (
    <div className="admin-result-detail-page animate-fade-in">
      <PageHeader
        title={`${display(student.name)} — ${display(exam.subject)}`}
        subtitle={`${display(student.studentId)} • ${display(exam.examCode)}`}
        backUrl="/admin/results"
        backText="Back to Results Management"
        badge={<StatusBadge status={publishLabel} />}
        actions={
          <Button
            variant={result.published ? 'outline' : 'primary'}
            icon={result.published ? Undo2 : Send}
            onClick={handleTogglePublish}
          >
            {result.published ? 'Unpublish to Draft' : 'Publish to Student Portal'}
          </Button>
        }
      />

      <div className="official-result-certificate">
        <div className="cert-header">
          <div>
            <span className="cert-inst-name">DIRECTORATE OF ACADEMIC EVALUATION</span>
            <span className="cert-doc-type">Official Mark Entry Verification Record</span>
          </div>
          <StatusBadge status={result.status || 'N/A'} size="md" />
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
            <span className="cand-label">Semester / Year</span>
            <span className="cand-value">
              {exam.semester ? `Semester ${exam.semester}` : 'N/A'}
              {exam.academicYear ? ` • ${exam.academicYear}` : ''}
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
            <span className="score-sub">Total Scale</span>
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
            <span className="score-sub">Computed Percentage</span>
          </div>

          <div className="cert-score-card">
            <span className="score-k">Letter Grade</span>
            <div className="score-v-row">
              <span className="score-big text-success">{display(result.grade)}</span>
            </div>
            <span className="score-sub">Stored grade</span>
          </div>

          <div className="cert-score-card">
            <span className="score-k">Result Standing</span>
            <div className="score-v-row">
              <span className="score-big text-success">{display(result.status)}</span>
            </div>
            <span className="score-sub">{publishLabel}</span>
          </div>
        </div>

        <div className="cert-details-section">
          <h4 className="cert-sec-title">Assessment Metadata</h4>
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
              <span className="row-k">Examination Date</span>
              <span className="row-v">{formatDate(exam.examDate)}</span>
            </div>
            <div className="cert-row">
              <span className="row-k">Venue / Room</span>
              <span className="row-v">
                {display(exam.venue)}{exam.room ? ` • ${exam.room}` : ''}
              </span>
            </div>
            <div className="cert-row">
              <span className="row-k">Publication Date</span>
              <span className="row-v">{result.publishedAt ? formatDate(result.publishedAt) : 'Not yet published'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminResultDetail;
