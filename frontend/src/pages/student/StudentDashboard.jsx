import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Tag,
  TrendingUp,
  Calendar,
  ExternalLink,
  ChevronDown,
  Award,
  BookOpen,
  Bell,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dashboardService } from '../../services/dashboardService';
import StatCard from '../../components/common/StatCard';
import Card from '../../components/common/Card';
import StatusBadge from '../../components/common/StatusBadge';
import PerformanceChart from '../../components/dashboard/PerformanceChart';
import ScheduleRightRail from '../../components/dashboard/ScheduleRightRail';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import './StudentPages.css';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartSemester, setChartSemester] = useState('All');

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await dashboardService.getStudentDashboard(user?.id);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load student dashboard:', err);
      setError(err.message || 'Unable to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user?.id]);

  if (isLoading) {
    return <LoadingState message="Loading your academic dashboard..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchDashboardData} />;
  }

  const { summary, upcomingExams, recentResults, performanceHistory, recentAnnouncements } = data;

  return (
    <div className="student-dashboard-page animate-fade-in">
      {/* 3 Summary Stat Cards matching Enlight reference */}
      <div className="dashboard-stats-grid">
        <StatCard
          icon={Tag}
          iconColor="#6C5DD3"
          iconBg="#EFEBFC"
          title="Credits Completed"
          value={summary.creditsCompleted}
          subValue={summary.totalCredits}
          caption="Compared To Last Semester"
          delta={summary.creditsDelta}
          deltaType="positive"
          to="/results"
        />

        <StatCard
          icon={TrendingUp}
          iconColor="#FF6B81"
          iconBg="#FFEBF0"
          title="Grade Point Average"
          value={typeof summary.gpa === 'number' ? summary.gpa.toFixed(2) : summary.gpa}
          subValue={typeof summary.maxGpa === 'number' ? summary.maxGpa.toFixed(2) : summary.maxGpa}
          caption="Compared To Last Semester"
          delta={summary.gpaDelta}
          deltaType="negative"
          to="/results"
        />

        <StatCard
          icon={BookOpen}
          iconColor="#22C55E"
          iconBg="#DCFCE7"
          title="Active Examination Papers"
          value={upcomingExams.length}
          subValue={summary.totalEnrolledCourses}
          caption="Active Courses This Semester"
          delta="+3 Active Papers"
          deltaType="positive"
          to="/exams"
        />
      </div>

      {/* Main Content Layout: 70% Left Analytics & Results, 30% Right Schedule Rail */}
      <div className="dashboard-main-split">
        {/* Left Column */}
        <div className="dashboard-left-column">
          {/* Main Analytical Panel: Grade Point Average Chart */}
          <div className="dashboard-chart-card">
            <div className="chart-card-header">
              <div className="chart-card-title-group">
                <h3 className="chart-main-title">Grade Point Average</h3>
                <p className="chart-main-subtitle">
                  Comparison between your GPA and Average Student GPA across semesters
                </p>
              </div>
              <div className="chart-filter-select-wrap">
                <select
                  value={chartSemester}
                  onChange={(e) => setChartSemester(e.target.value)}
                  className="chart-filter-select"
                >
                  <option value="All">All Semesters</option>
                  <option value="2025">2025 - 2026</option>
                  <option value="2024">2024 - 2025</option>
                </select>
                <ChevronDown size={14} className="select-icon" />
              </div>
            </div>

            <PerformanceChart data={performanceHistory} />
          </div>

          {/* Secondary Panel: Recent Results Table (matching Enlight tuition table style) */}
          <div className="dashboard-table-card">
            <div className="table-card-header">
              <div>
                <h3 className="table-card-title">Recent Examination Results</h3>
                <p className="table-card-subtitle">
                  Official verified marks and performance transcript for current term
                </p>
              </div>
              <Link to="/results" className="table-view-all-link">
                <span>View All Results</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="table-responsive">
              <table className="enlight-styled-table">
                <thead>
                  <tr>
                    <th>Exam ID</th>
                    <th>Subject & Title</th>
                    <th>Exam Date</th>
                    <th>Score / Grade</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {recentResults.map((res) => (
                    <tr key={res.id}>
                      <td className="table-id-cell">{res.examCode}</td>
                      <td>
                        <div className="table-subject-cell">
                          <span className="subject-title">{res.subject}</span>
                          <span className="exam-full-name">{res.examTitle}</span>
                        </div>
                      </td>
                      <td className="table-date-cell">{res.examDate}</td>
                      <td>
                        <div className="table-grade-cell">
                          <span className="grade-badge">{res.grade}</span>
                          <span className="score-text">({res.percentage}%)</span>
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={res.status} />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <Link
                          to={`/results/${res.id}`}
                          className="table-action-popout"
                          aria-label={`View result for ${res.subject}`}
                        >
                          <ExternalLink size={15} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Rail Column */}
        <div className="dashboard-right-rail">
          {/* Daily Exam Schedule */}
          <ScheduleRightRail
            upcomingExams={upcomingExams}
            title="Daily Exam Schedule"
            subtitle="Scheduled venues and invigilation"
          />

          {/* Recent Circulars & Notices Card */}
          <div className="right-notices-card">
            <div className="right-notices-header">
              <div className="notices-title-group">
                <Bell size={16} className="text-primary" />
                <h4 className="notices-title">Recent Circulars</h4>
              </div>
              <Link to="/notifications" className="notices-view-link">
                View All
              </Link>
            </div>

            <div className="notices-list">
              {recentAnnouncements.map((ann) => (
                <div key={ann.id} className="notice-item-mini">
                  <div className="notice-mini-top">
                    <StatusBadge status={ann.priority} size="sm" />
                    <span className="notice-mini-date">{ann.publishDate}</span>
                  </div>
                  <h5 className="notice-mini-title">{ann.title}</h5>
                  <p className="notice-mini-excerpt">{ann.content.slice(0, 95)}...</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
