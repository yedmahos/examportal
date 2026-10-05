import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Calendar, MapPin, Clock, Award, ExternalLink } from 'lucide-react';
import { examService } from '../../services/examService';
import { scheduleWorkflow } from '../../services/resourceService';
import { visibleSchedules } from './scheduleVisibility';
import PageHeader from '../../components/common/PageHeader';
import SearchBar from '../../components/common/SearchBar';
import Select from '../../components/common/Select';
import Tabs from '../../components/common/Tabs';
import StatusBadge from '../../components/common/StatusBadge';
import Pagination from '../../components/common/Pagination';
import LoadingState from '../../components/common/LoadingState';
import EmptyState from '../../components/common/EmptyState';
import './StudentPages.css';

const scheduleTabs = [
  { id: 'all', label: 'All Exams' },
  { id: 'upcoming', label: 'Upcoming Schedule' },
  { id: 'completed', label: 'Completed Archive' },
];

const StudentExams = () => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [view, setView] = useState('schedule');
  const [schedules, setSchedules] = useState([]);
  const [scheduleError, setScheduleError] = useState('');
  const [exams, setExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scheduleSearch, setScheduleSearch] = useState(initialQuery);
  const [scheduleTab, setScheduleTab] = useState('all');
  const [scheduleSemester, setScheduleSemester] = useState('All');
  const [noticeSearch, setNoticeSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchExams = async () => {
    setIsLoading(true);
    try {
      const res = await examService.getAll({
        search: noticeSearch,
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

  const fetchSchedules = async () => {
    setIsLoading(true);
    setScheduleError('');
    try {
      const items = await scheduleWorkflow.mine();
      setSchedules(items);
    } catch (err) {
      setScheduleError(err.message || 'Failed to load your schedule');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'schedule') fetchSchedules();
  }, [view]);

  useEffect(() => {
    if (view === 'notices') fetchExams();
  }, [view, noticeSearch, page]);

  const semesterOptions = useMemo(() => {
    const values = Array.from(new Set(
      schedules
        .map((item) => item.examination?.semester)
        .filter((value) => value !== undefined && value !== null && value !== '')
        .map((value) => String(value))
    )).sort((left, right) => Number(left) - Number(right));

    return [
      { value: 'All', label: 'All Semesters' },
      ...values.map((value) => ({ value, label: `Semester ${value}` })),
    ];
  }, [schedules]);

  const filteredSchedules = useMemo(
    () => visibleSchedules(schedules, {
      tab: scheduleTab,
      search: scheduleSearch,
      semester: scheduleSemester,
    }),
    [schedules, scheduleTab, scheduleSearch, scheduleSemester]
  );

  return (
    <div className="student-exams-page animate-fade-in">
      <PageHeader
        title="My Exams"
        subtitle="Examinations you are eligible to sit, with session time and room"
      />

      <div className="exams-toolbar-card">
        <Tabs
          tabs={[
            { id: 'schedule', label: 'My Schedule' },
            { id: 'notices', label: 'Exam Notices' },
          ]}
          activeTab={view}
          onChange={setView}
          variant="pill"
        />
      </div>

      {view === 'schedule' ? (
        <>
          <div className="exams-toolbar-card">
            <div className="toolbar-top-row">
              <Tabs
                tabs={scheduleTabs}
                activeTab={scheduleTab}
                onChange={setScheduleTab}
                variant="pill"
              />

              <div className="toolbar-controls-cluster">
                <div className="toolbar-search-wrap">
                  <SearchBar
                    value={scheduleSearch}
                    onChange={setScheduleSearch}
                    placeholder="Search subject or code..."
                    size="sm"
                  />
                </div>

                <div className="toolbar-select-wrap">
                  <Select
                    value={scheduleSemester}
                    onChange={(e) => setScheduleSemester(e.target.value)}
                    options={semesterOptions}
                  />
                </div>
              </div>
            </div>
          </div>

          {isLoading ? <LoadingState message="Loading your examinations..." />
            : scheduleError ? (
              <EmptyState icon={Calendar} title="Could not load schedule" description={scheduleError} />
            ) : filteredSchedules.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No examinations assigned"
                description="You will see a paper here after you are eligible and it is scheduled."
              />
            ) : (
              <div className="exams-cards-grid">
                {filteredSchedules.map((item) => (
                  <div key={item.id} className="exam-card-item">
                    <div className="exam-card-header">
                      <div className="exam-card-code-badge">{item.subject?.code || 'N/A'}</div>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="exam-card-content">
                      <h3 className="exam-card-title">{item.examination?.title || 'N/A'}</h3>
                      <p className="exam-card-subject">{item.subject?.name || 'N/A'}</p>
                      <div className="exam-card-meta-list">
                        <div className="exam-meta-row">
                          <Calendar size={14} className="meta-icon" />
                          <span className="meta-label">Date:</span>
                          <span className="meta-value">{item.date ? new Date(item.date).toLocaleDateString('en-GB') : 'N/A'}</span>
                        </div>
                        <div className="exam-meta-row">
                          <Clock size={14} className="meta-icon" />
                          <span className="meta-label">Session:</span>
                          <span className="meta-value">{item.session?.name || 'N/A'} · {item.session?.startTime || 'N/A'} - {item.session?.endTime || 'N/A'}</span>
                        </div>
                        <div className="exam-meta-row">
                          <Clock size={14} className="meta-icon" />
                          <span className="meta-label">Reporting:</span>
                          <span className="meta-value">{item.reportingTime || item.session?.reportingTime || 'N/A'}</span>
                        </div>
                        <div className="exam-meta-row">
                          <MapPin size={14} className="meta-icon" />
                          <span className="meta-label">Room:</span>
                          <span className="meta-value">{item.room ? `${item.room.building || 'N/A'} ${item.room.roomNumber || 'N/A'}` : 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="exam-card-footer">
                      <span className="exam-invigilator-caption">Instructions on the detail page</span>
                      <Link to={`/exams/schedule/${item.id}`} className="exam-view-details-btn">
                        <span>View Details</span>
                        <ExternalLink size={14} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </>
      ) : (
        <>
          <div className="exams-toolbar-card">
            <div className="toolbar-top-row">
              <div className="toolbar-search-wrap">
                <SearchBar
                  value={noticeSearch}
                  onChange={(val) => {
                    setNoticeSearch(val);
                    setPage(1);
                  }}
                  placeholder="Search examination notices..."
                  size="sm"
                />
              </div>
            </div>
          </div>

          {isLoading ? (
            <LoadingState message="Loading exam notices..." />
          ) : exams.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No exam notices found"
              description="There are currently no examination notices matching your search."
            />
          ) : (
            <div className="exams-cards-grid">
              {exams.map((exam) => (
                <div key={exam.id} className="exam-card-item">
                  <div className="exam-card-header">
                    <div className="exam-card-code-badge">{exam.examCode || 'Notice'}</div>
                    <StatusBadge status={exam.status} />
                  </div>

                  <div className="exam-card-content">
                    <h3 className="exam-card-title">{exam.title}</h3>
                    <p className="exam-card-subject">{exam.subject || 'N/A'}</p>

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
                        <span className="meta-value">
                          {exam.startTime || exam.endTime || exam.duration
                            ? `${exam.startTime || 'N/A'} - ${exam.endTime || 'N/A'} (${exam.duration || 'N/A'})`
                            : 'N/A'}
                        </span>
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
                      Invigilator: <strong>{exam.invigilator || 'N/A'}</strong>
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
        </>
      )}
    </div>
  );
};

export default StudentExams;
