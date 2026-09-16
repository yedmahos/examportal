import React, { useState } from 'react';
import { ExternalLink, Clock, MapPin, Award, User, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import Avatar from '../common/Avatar';
import './DashboardComponents.css';

const ScheduleRightRail = ({
  upcomingExams = [],
  title = "Daily Exam Schedule",
  subtitle = "Schedule for your exam session",
}) => {
  const [filter, setFilter] = useState('All');

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
        {upcomingExams.length === 0 ? (
          <div className="schedule-empty">
            <Clock size={24} className="text-muted" />
            <p>No exams scheduled in this period</p>
          </div>
        ) : (
          upcomingExams.map((exam) => (
            <div key={exam.id} className="schedule-item-card">
              <div className="schedule-item-top">
                <div className="schedule-item-headings">
                  <h4 className="schedule-subject-name">{exam.subject}</h4>
                  <div className="schedule-time-badge">
                    <Clock size={12} />
                    <span>{exam.startTime} - {exam.endTime}</span>
                  </div>
                </div>
                <Link
                  to={`/exams/${exam.id}`}
                  className="schedule-item-popout"
                  title="View exam details"
                  aria-label={`View details for ${exam.subject}`}
                >
                  <ExternalLink size={15} />
                </Link>
              </div>

              <div className="schedule-item-details-box">
                <div className="schedule-detail-row">
                  <div className="schedule-detail-label">
                    <User size={13} />
                    <span>Invigilator</span>
                  </div>
                  <span className="schedule-detail-value">{exam.invigilator}</span>
                </div>

                <div className="schedule-detail-row">
                  <div className="schedule-detail-label">
                    <MapPin size={13} />
                    <span>Course Room</span>
                  </div>
                  <span className="schedule-detail-value">{exam.room || 'Auditorium'}</span>
                </div>

                <div className="schedule-detail-row">
                  <div className="schedule-detail-label">
                    <Award size={13} />
                    <span>Course Credits</span>
                  </div>
                  <span className="schedule-detail-value">{exam.credits || 4} Credits</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ScheduleRightRail;
