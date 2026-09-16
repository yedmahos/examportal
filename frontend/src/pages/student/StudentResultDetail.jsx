import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Award, CheckCircle, Calendar, BookOpen, ShieldCheck, Download, Printer } from 'lucide-react';
import { resultService } from '../../services/resultService';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/common/Button';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import { useToast } from '../../components/common/Toast';
import './StudentPages.css';

const StudentResultDetail = () => {
  const { id } = useParams();
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { showToast } = useToast();

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

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    showToast('Official mark statement downloading...', 'success');
  };

  if (isLoading) return <LoadingState message="Loading examination transcript..." />;
  if (error || !result) {
    return <ErrorState message={error || 'Result record not found'} onRetry={fetchResult} />;
  }

  return (
    <div className="result-detail-page animate-fade-in">
      <PageHeader
        title={result.subject}
        subtitle={`${result.examCode} • Official Examination Result`}
        backUrl="/results"
        backText="Back to Results"
        badge={<StatusBadge status={result.status} />}
        actions={
          <div className="result-detail-actions">
            <Button variant="outline" size="md" icon={Printer} onClick={handlePrint}>
              Print Slip
            </Button>
            <Button variant="primary" size="md" icon={Download} onClick={handleDownload}>
              Download Certificate
            </Button>
          </div>
        }
      />

      {/* Official Certificate Card */}
      <div className="official-result-certificate">
        {/* Certificate Watermark / Header */}
        <div className="cert-header">
          <div className="cert-header-left">
            <span className="cert-inst-name">DIRECTORATE OF ACADEMIC EVALUATION</span>
            <span className="cert-doc-type">Official Statement of Examination Marks</span>
          </div>
          <div className="cert-header-right">
            <StatusBadge status={result.passFail} size="md" />
          </div>
        </div>

        {/* Candidate Information Band */}
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
            <span className="cand-label">Academic Term</span>
            <span className="cand-value">{result.semester} ({result.academicYear})</span>
          </div>
        </div>

        {/* Score Breakdown Highlight */}
        <div className="cert-score-highlight-grid">
          <div className="cert-score-card">
            <span className="score-k">Marks Secured</span>
            <div className="score-v-row">
              <span className="score-big text-primary">{result.marks}</span>
              <span className="score-denom">/ {result.maxMarks}</span>
            </div>
            <span className="score-sub">Maximum Marks: {result.maxMarks}</span>
          </div>

          <div className="cert-score-card">
            <span className="score-k">Percentage</span>
            <div className="score-v-row">
              <span className="score-big">{result.percentage}%</span>
            </div>
            <span className="score-sub">Weighted Scaled Score</span>
          </div>

          <div className="cert-score-card">
            <span className="score-k">Letter Grade</span>
            <div className="score-v-row">
              <span className="score-big text-success">{result.grade}</span>
            </div>
            <span className="score-sub">Grade Points: {result.gpaPoint.toFixed(2)}</span>
          </div>

          <div className="cert-score-card">
            <span className="score-k">Result Status</span>
            <div className="score-v-row">
              <span className="score-big text-success">{result.passFail}</span>
            </div>
            <span className="score-sub">Verified & Sealed</span>
          </div>
        </div>

        {/* Detailed Assessment Data */}
        <div className="cert-details-section">
          <h4 className="cert-sec-title">Examination Details</h4>
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
              <span className="row-k">Examination Held On</span>
              <span className="row-v">{result.examDate}</span>
            </div>
            <div className="cert-row">
              <span className="row-k">Result Published Date</span>
              <span className="row-v">{result.publishedDate || 'Pending release'}</span>
            </div>
            <div className="cert-row">
              <span className="row-k">Evaluation Board Remarks</span>
              <span className="row-v">{result.remarks}</span>
            </div>
          </div>
        </div>

        {/* Verification Footer */}
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
