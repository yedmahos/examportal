import React, { useState } from 'react';
import { ExternalLink, Clock, MapPin, User, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import './DashboardComponents.css';

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const matchesDateFilter = (exam, filter) => {
  if (filter === 'All') return true;
  if (!exam?.examDate) return false;

  const date = new Date(exam.examDate);
  if (Number.isNaN(date.getTime())) return false;

  const today = startOfDay(new Date());

  if (filter === 'Upcoming') {
    return date >= today;
  }

  if (filter === 'ThisWeek') {
    const start = new Date(today);
    const diffToMonday = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - diffToMonday);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return date >= start && date < end;
  }

  return true;
};

const ScheduleRightRail = ({
  upcomingExams = [],
  title = "Daily Exam Schedule",
  subtitle = "Schedule for your exam session",
  detailBasePath = "/exams",
}) => {
  const [filter, setFilter] = useState('All');
  const visibleExams = upcomingExams.filter((exam) => matchesDateFilter(exam, filter));

  return (
    <div className="schedule-rail-card">
      <div className="schedule-rail-header">
        <div className="schedule-header-text">
          <h3 className="schedule-rail-title">{title}</h3>
          <p className="schedule-rail-subtitle">{subtitle}</p>
        </div>
        <div className="schedule-filter-dropdown">
          <select
            className="schedule-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="All">All Dates</option>
            <option value="Upcoming">Upcoming</option>
            <option value="ThisWeek">This Week</option>
          </select>
          <ChevronDown size={14} className="select-arrow" />
        </div>
      </div>

      <div className="schedule-cards-stack">
        {visibleExams.length === 0 ? (
          <div className="schedule-empty">
            <Clock size={24} className="text-muted" />
            <p>No exams scheduled in this period</p>
          </div>
        ) : (
          visibleExams.map((exam) => {
            const examId = exam.id || exam._id;
            const venueLabel = exam.venue
              ? (exam.room ? `${exam.venue} (Room: ${exam.room})` : exam.venue)
              : (exam.room ? `Room: ${exam.room}` : 'N/A');

            return (
              <div key={examId || exam.examCode || exam.subject} className="schedule-item-card">
                <div className="schedule-item-top">
                  <div className="schedule-item-headings">
                    <h4 className="schedule-subject-name">{exam.subject || 'N/A'}</h4>
                    <div className="schedule-time-badge">
                      <Clock size={12} />
                      <span>{exam.startTime || 'N/A'} - {exam.endTime || 'N/A'}</span>
                    </div>
                  </div>
                  {examId ? (
                    <Link
                      to={`${detailBasePath}/${examId}`}
                      className="schedule-item-popout"
                      title="View exam details"
                      aria-label={`View details for ${exam.subject || 'exam'}`}
                    >
                      <ExternalLink size={15} />
                    </Link>
                  ) : null}
                </div>

                <div className="schedule-item-details-box">
                  <div className="schedule-detail-row">
                    <div className="schedule-detail-label">
                      <User size={13} />
                      <span>Invigilator</span>
                    </div>
                    <span className="schedule-detail-value">{exam.invigilator || 'N/A'}</span>
                  </div>

                  <div className="schedule-detail-row">
                    <div className="schedule-detail-label">
                      <MapPin size={13} />
                      <span>Venue</span>
                    </div>
                    <span className="schedule-detail-value">{venueLabel}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ScheduleRightRail;
