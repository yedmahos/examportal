import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Award, CheckCircle, ShieldCheck, Undo2, Send, Edit2 } from 'lucide-react';
import { resultService } from '../../services/resultService';
import { activityService } from '../../services/activityService';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/common/Button';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import { useToast } from '../../components/common/Toast';
import './AdminPages.css';

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
    } catch (e) {
      setError(e.message || 'Result record not found');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResult();
  }, [id]);

  const handleTogglePublish = async () => {
    try {
      if (result.status === 'Published') {
        const res = await resultService.unpublish(result.id);
        setResult(res.data);
        await activityService.log('Unpublished Marksheet', result.examTitle, `Reverted mark transcript to draft for ${result.studentName}`, 'Admin Officer', 'results');
        showToast('Result reverted to Draft', 'info');
      } else {
        const res = await resultService.publish(result.id);
        setResult(res.data);
        await activityService.log('Published Marksheet', result.examTitle, `Published verified grade certificate for ${result.studentName}`, 'Admin Officer', 'results');
        showToast('Result published to student portal', 'success');
      }
    } catch (e) {
      showToast('Failed to change publish state', 'error');
    }
  };

  if (isLoading) return <LoadingState message="Loading examination mark record..." />;
  if (error || !result) return <ErrorState message={error} onRetry={fetchResult} />;

  return (
    <div className="admin-result-detail-page animate-fade-in">
      <PageHeader
        title={`${result.studentName} — ${result.subject}`}
        subtitle={`${result.studentId} • ${result.examCode}`}
        backUrl="/admin/results"
        backText="Back to Results Management"
        badge={<StatusBadge status={result.status} />}
        actions={
          <Button
            variant={result.status === 'Published' ? 'outline' : 'primary'}
            icon={result.status === 'Published' ? Undo2 : Send}
            onClick={handleTogglePublish}
          >
            {result.status === 'Published' ? 'Unpublish to Draft' : 'Publish to Student Portal'}
          </Button>
        }
      />

      <div className="official-result-certificate">
        <div className="cert-header">
          <div>
            <span className="cert-inst-name">DIRECTORATE OF ACADEMIC EVALUATION</span>
            <span className="cert-doc-type">Official Mark Entry Verification Record</span>
          </div>
          <StatusBadge status={result.passFail} size="md" />
        </div>

        <div className="cert-candidate-band">
          <div className="cert-cand-col">
            <span className="cand-label">Candidate Name</span>
            <span className="cand-value">{result.studentName}</span>
          </div>
          <div className="cert-cand-col">
            <span className="cand-label">Student ID</span>
            <span className="cand-value">{result.studentId}</span>
          </div>
          <div className="cert-cand-col">
            <span className="cand-label">Department</span>
            <span className="cand-value">{result.department}</span>
          </div>
          <div className="cert-cand-col">
            <span className="cand-label">Semester / Year</span>
            <span className="cand-value">{result.semester} • {result.academicYear}</span>
          </div>
        </div>

        <div className="cert-score-highlight-grid">
          <div className="cert-score-card">
            <span className="score-k">Marks Secured</span>
            <div className="score-v-row">
              <span className="score-big text-primary">{result.marks}</span>
              <span className="score-denom">/ {result.maxMarks}</span>
            </div>
            <span className="score-sub">Total Scale</span>
          </div>

          <div className="cert-score-card">
            <span className="score-k">Percentage</span>
            <div className="score-v-row">
              <span className="score-big">{result.percentage}%</span>
            </div>
            <span className="score-sub">Computed Percentage</span>
          </div>

          <div className="cert-score-card">
            <span className="score-k">Letter Grade</span>
            <div className="score-v-row">
              <span className="score-big text-success">{result.grade}</span>
            </div>
            <span className="score-sub">GPA Point: {result.gpaPoint.toFixed(2)}</span>
          </div>

          <div className="cert-score-card">
            <span className="score-k">Result Standing</span>
            <div className="score-v-row">
              <span className="score-big text-success">{result.passFail}</span>
            </div>
            <span className="score-sub">Verified Standing</span>
          </div>
        </div>

        <div className="cert-details-section">
          <h4 className="cert-sec-title">Assessment Metadata</h4>
          <div className="cert-details-table">
            <div className="cert-row">
              <span className="row-k">Course Paper</span>
              <span className="row-v">{result.examTitle}</span>
            </div>
            <div className="cert-row">
              <span className="row-k">Course Code</span>
              <span className="row-v">{result.examCode}</span>
            </div>
            <div className="cert-row">
              <span className="row-k">Examination Date</span>
              <span className="row-v">{result.examDate}</span>
            </div>
            <div className="cert-row">
              <span className="row-k">Publication Date</span>
              <span className="row-v">{result.publishedDate || 'Not yet published'}</span>
            </div>
            <div className="cert-row">
              <span className="row-k">Evaluation Remarks</span>
              <span className="row-v">{result.remarks}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminResultDetail;
