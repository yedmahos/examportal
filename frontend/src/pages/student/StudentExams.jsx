import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Calendar, Search, MapPin, Clock, Award, ExternalLink, Filter } from 'lucide-react';
import { examService } from '../../services/examService';
import PageHeader from '../../components/common/PageHeader';
import SearchBar from '../../components/common/SearchBar';
import Select from '../../components/common/Select';
import Tabs from '../../components/common/Tabs';
import StatusBadge from '../../components/common/StatusBadge';
import Pagination from '../../components/common/Pagination';
import LoadingState from '../../components/common/LoadingState';
import EmptyState from '../../components/common/EmptyState';
import './StudentPages.css';

const StudentExams = () => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [exams, setExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState('All');
  const [semesterFilter, setSemesterFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const tabs = [
    { id: 'All', label: 'All Exams' },
    { id: 'scheduled', label: 'Upcoming Schedule' },
    { id: 'completed', label: 'Completed Archive' },
  ];

  const fetchExams = async () => {
    setIsLoading(true);
    try {
      const res = await examService.getAll({
        search,
        status: activeTab === 'All' ? '' : activeTab.toLowerCase(),
        semester: semesterFilter === 'All' ? '' : semesterFilter,
        page,
        limit: 8,
      });
      setExams(res.data.items);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error('Failed to fetch exams:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [search, activeTab, semesterFilter, page]);

  return (
    <div className="student-exams-page animate-fade-in">
      <PageHeader
        title="Examination Schedule"
        subtitle="Official informational schedule, dates, venues, and invigilation notices"
      />

      {/* Filter and Search toolbar */}
      <div className="exams-toolbar-card">
        <div className="toolbar-top-row">
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={(tab) => {
              setActiveTab(tab);
              setPage(1);
            }}
            variant="pill"
          />

          <div className="toolbar-controls-cluster">
            <div className="toolbar-search-wrap">
              <SearchBar
                value={search}
                onChange={(val) => {
                  setSearch(val);
                  setPage(1);
                }}
                placeholder="Search subject or code..."
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
      </div>

      {/* Exams Grid / Cards */}
      {isLoading ? (
        <LoadingState message="Loading exam timetables..." />
      ) : exams.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No scheduled exams found"
          description="There are currently no examinations matching your search and filter criteria."
        />
      ) : (
        <div className="exams-cards-grid">
          {exams.map((exam) => (
            <div key={exam.id} className="exam-card-item">
              <div className="exam-card-header">
                <div className="exam-card-code-badge">{exam.examCode}</div>
                <StatusBadge status={exam.status} />
              </div>

              <div className="exam-card-content">
                <h3 className="exam-card-title">{exam.title}</h3>
                <p className="exam-card-subject">{exam.subject}</p>

                <div className="exam-card-meta-list">
                  <div className="exam-meta-row">
                    <Calendar size={14} className="meta-icon" />
                    <span className="meta-label">Date:</span>
                    <span className="meta-value">
                      {exam.examDate
                        ? new Date(exam.examDate).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          })
                        : "N/A"}
                    </span>
                  </div>

                  <div className="exam-meta-row">
                    <Clock size={14} className="meta-icon" />
                    <span className="meta-label">Time:</span>
                    <span className="meta-value">{exam.startTime} - {exam.endTime} ({exam.duration})</span>
                  </div>

                  <div className="exam-meta-row">
                    <MapPin size={14} className="meta-icon" />
                    <span className="meta-label">Venue:</span>
                    <span className="meta-value">{exam.venue || "TBA"}</span>
                  </div>

                  <div className="exam-meta-row">
                    <Award size={14} className="meta-icon" />
                    <span className="meta-label">Room:</span>
                    <span className="meta-value">{exam.room || "TBA"}</span>
                  </div>
                </div>
              </div>

              <div className="exam-card-footer">
                <span className="exam-invigilator-caption">
                  Invigilator: <strong>{exam.invigilator}</strong>
                </span>
                <Link
                  to={`/exams/${exam.id}`}
                  className="exam-view-details-btn"
                >
                  <span>View Details</span>
                  <ExternalLink size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="exams-pagination-bar">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={8}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
};

export default StudentExams;
