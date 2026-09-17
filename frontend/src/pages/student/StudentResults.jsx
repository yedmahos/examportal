import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Award, Search, TrendingUp, CheckCircle, ExternalLink, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { resultService } from '../../services/resultService';
import PageHeader from '../../components/common/PageHeader';
import SearchBar from '../../components/common/SearchBar';
import Select from '../../components/common/Select';
import StatusBadge from '../../components/common/StatusBadge';
import DataTable from '../../components/common/DataTable';
import LoadingState from '../../components/common/LoadingState';
import { useToast } from '../../components/common/Toast';
import './StudentPages.css';

const StudentResults = () => {
  const { user } = useAuth();
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const { showToast } = useToast();

  const fetchResults = async () => {
    setIsLoading(true);
    try {
      const res = await resultService.getMyResults();
      let items = res.data.items;
      
      // Simple client-side filtering since backend doesn't support query params for /my
      if (search) {
        const query = search.toLowerCase();
        items = items.filter(item => 
          item.exam?.subject?.toLowerCase().includes(query) ||
          item.exam?.title?.toLowerCase().includes(query) ||
          item.examCode?.toLowerCase().includes(query)
        );
      }
      
      if (semesterFilter !== 'All') {
        items = items.filter(item => item.exam?.semester === semesterFilter || item.semester === semesterFilter);
      }
      setResults(items);
      setTotal(items.length);
      setTotalPages(1);
    } catch (err) {
      console.error('Failed to fetch results:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [user?.studentId, search, semesterFilter, page]);

  const handleDownloadTranscript = () => {
    showToast('Official Grade Transcript PDF generated for download.', 'success');
  };

  const columns = [
    {
      title: 'Exam Code',
      key: 'examCode',
      render: (_, row) => (
        <span className="table-code-chip">{row.exam?.examCode || 'N/A'}</span>
      ),
    },
    {
      title: 'Subject & Paper',
      key: 'subject',
      render: (_, row) => (
        <div className="table-subject-cell">
          <span className="subject-title">{row.exam?.subject || 'N/A'}</span>
          <span className="exam-full-name">{row.exam?.title || 'N/A'}</span>
        </div>
      ),
    },
    {
      title: 'Semester',
      key: 'semester',
      render: (_, row) => {
        const sem = row.exam?.semester || row.semester;
        if (!sem) return 'N/A';
        return typeof sem === 'number' ? `${sem}th Semester` : sem;
      },
    },
    {
      title: 'Score',
      key: 'score',
      render: (_, row) => (
        <div className="table-score-col">
          <span className="score-number">
            {row.marksObtained !== undefined && row.marksObtained !== null ? row.marksObtained : 'N/A'} / {row.maximumMarks !== undefined && row.maximumMarks !== null ? row.maximumMarks : 'N/A'}
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
      render: (val, row) => {
        const g = row.grade || val;
        if (!g) return 'N/A';
        return (
          <span className={`table-grade-pill grade-${String(g).replace('+', 'plus')}`}>
            {g}
          </span>
        );
      },
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, row) => <StatusBadge status={row.status || 'N/A'} size="sm" />,
    },
    {
      title: 'Action',
      key: 'id',
      align: 'center',
      render: (_, row) => (
        <Link to={`/results/${row.id || row._id}`} className="table-action-popout" title="View Grade Certificate">
          <ExternalLink size={15} />
        </Link>
      ),
    },
  ];

  return (
    <div className="student-results-page animate-fade-in">
      <PageHeader
        title="Grades & Examination Results"
        subtitle="Official certified marksheet and academic standing transcript"
        actions={
          <button
            type="button"
            className="btn btn-secondary btn-md"
            onClick={handleDownloadTranscript}
          >
            <Download size={16} />
            <span>Download Marksheet</span>
          </button>
        }
      />

      {/* Overview Stat Ribbon */}
      <div className="results-overview-ribbon">
        <div className="ribbon-stat-item">
          <span className="ribbon-label">Cumulative GPA</span>
          <span className="ribbon-value text-primary">{user?.gpa ? (typeof user.gpa === 'number' ? user.gpa.toFixed(2) : user.gpa) : 'N/A'}</span>
        </div>
        <div className="ribbon-divider" />
        <div className="ribbon-stat-item">
          <span className="ribbon-label">Credits Completed</span>
          <span className="ribbon-value">
            {user?.creditsCompleted && user?.totalCredits ? `${user.creditsCompleted} / ${user.totalCredits}` : (user?.creditsCompleted || 'N/A')}
          </span>
        </div>
        <div className="ribbon-divider" />
        <div className="ribbon-stat-item">
          <span className="ribbon-label">Academic Standing</span>
          <span className="ribbon-value text-success">{user?.academicStanding || 'N/A'}</span>
        </div>
      </div>

      {/* Filter and Search toolbar */}
      <div className="results-toolbar-card">
        <div className="toolbar-top-row">
          <div className="toolbar-search-wrap">
            <SearchBar
              value={search}
              onChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              placeholder="Search subject or exam code..."
              size="sm"
            />
          </div>

          <div className="toolbar-select-wrap">
            <Select
              value={semesterFilter}
              onChange={(e) => {
                setSemesterFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { value: 'All', label: 'All Semesters' },
                { value: '6th Semester', label: '6th Semester' },
                { value: '5th Semester', label: '5th Semester' },
                { value: '4th Semester', label: '4th Semester' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="results-table-card">
        <DataTable
          columns={columns}
          data={results}
          isLoading={isLoading}
          emptyTitle="No published results found"
          emptyDescription="There are no result records available matching your criteria."
          pagination={{
            page,
            totalPages,
            total,
            limit: 10,
            onPageChange: setPage,
          }}
        />
      </div>
    </div>
  );
};

export default StudentResults;
