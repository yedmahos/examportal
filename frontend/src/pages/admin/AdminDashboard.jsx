import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Calendar,
  Award,
  CheckCircle2,
  Megaphone,
  ArrowRight,
  Clock,
  Activity,
  FileText,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dashboardService } from '../../services/dashboardService';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import AdminTrendChart from '../../components/dashboard/AdminTrendChart';
import ScheduleRightRail from '../../components/dashboard/ScheduleRightRail';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import './AdminPages.css';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await dashboardService.getAdminDashboard();
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load administration dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (isLoading) return <LoadingState message="Loading administrative portal..." />;
  if (error || !data) return <ErrorState message={error} onRetry={fetchDashboard} />;

  const { stats, recentActivities, recentResults, examTrends, upcomingSchedule } = data;

  return (
    <div className="admin-dashboard-page animate-fade-in">
      {/* 5-6 Stat Cards Top Rows */}
      <div className="admin-stats-grid">
        <StatCard
          icon={Users}
          iconColor="#6C5DD3"
          iconBg="#EFEBFC"
          title="Total Students"
          value={stats.totalStudents.toLocaleString()}
          caption="Enrolled Candidates"
          delta={stats.totalStudentsDelta}
          deltaType="positive"
        />

        <StatCard
          icon={Calendar}
          iconColor="#3B82F6"
          iconBg="#DBEAFE"
          title="Total Exams"
          value={stats.totalExams}
          caption="Scheduled Sessions"
          delta={stats.totalExamsDelta}
          deltaType="neutral"
        />

        <StatCard
          icon={Clock}
          iconColor="#F59E0B"
          iconBg="#FEF3C7"
          title="Upcoming Papers"
          value={stats.upcomingExams}
          caption="Pending Invigilation"
          delta={stats.upcomingDelta}
          deltaType="positive"
        />

        <StatCard
          icon={CheckCircle2}
          iconColor="#22C55E"
          iconBg="#DCFCE7"
          title="Completed Exams"
          value={stats.completedExams}
          caption="Conducted & Sealed"
          delta={stats.completedDelta}
          deltaType="positive"
        />

        <StatCard
          icon={Award}
          iconColor="#6C5DD3"
          iconBg="#EFEBFC"
          title="Results Published"
          value={stats.resultsPublished}
          subValue={stats.resultsTotal}
          caption="Final Transcripts"
          delta={stats.resultsDelta}
          deltaType="positive"
        />

        <StatCard
          icon={Megaphone}
          iconColor="#FF6B81"
          iconBg="#FFEBF0"
          title="Announcements"
          value={stats.totalAnnouncements}
          caption="Notices on Portal"
          delta={stats.activeAnnouncementsDelta}
          deltaType="neutral"
        />
      </div>

      {/* Main 70/30 Content Split */}
      <div className="dashboard-main-split">
        {/* Left Column */}
        <div className="dashboard-left-column">
          {/* Analytical Trend Panel */}
          <div className="admin-panel-card">
            <div className="admin-panel-header">
              <div>
                <h3 className="admin-panel-title">Examination Sessions & Completion Trend</h3>
                <p className="admin-panel-subtitle">
                  Historical tracking of scheduled vs completed examination papers per term
                </p>
              </div>
            </div>
            <AdminTrendChart data={examTrends} />
          </div>

          {/* Recent Activity Section */}
          <div className="admin-panel-card">
            <div className="admin-panel-header">
              <div className="activity-title-group">
                <Activity size={18} className="text-primary" />
                <div>
                  <h3 className="admin-panel-title">Recent Activity Audit Log</h3>
                  <p className="admin-panel-subtitle">Real-time actions, publications, and schedule modifications</p>
                </div>
              </div>
              <span className="live-status-pill">
                <span className="live-dot" /> Live System
              </span>
            </div>

            <div className="table-responsive">
              <table className="enlight-styled-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Entity / Subject</th>
                    <th>Description</th>
                    <th>Actor</th>
                    <th>Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivities.map((act) => (
                    <tr key={act.id}>
                      <td className="activity-action-name">{act.action}</td>
                      <td className="activity-entity-name">{act.entity}</td>
                      <td className="activity-desc-cell">{act.description}</td>
                      <td className="activity-actor-cell">{act.actor}</td>
                      <td className="activity-time-cell">{act.timestamp}</td>
                      <td>
                        <StatusBadge status={act.status} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Rail */}
        <div className="dashboard-right-rail">
          {/* Upcoming Schedule */}
          <ScheduleRightRail
            upcomingExams={upcomingSchedule}
            title="Upcoming Exam Sessions"
            subtitle="Invigilation venues & timings"
          />

          {/* Quick Access Admin Tools */}
          <div className="admin-quick-actions-card">
            <h4 className="quick-actions-title">Administrative Actions</h4>
            <div className="quick-actions-list">
              <Link to="/admin/exams" className="quick-action-link">
                <div className="quick-action-icon text-primary bg-primary-light">
                  <Calendar size={16} />
                </div>
                <div className="quick-action-text">
                  <span className="qa-name">Schedule New Exam</span>
                  <span className="qa-sub">Configure timetable & venues</span>
                </div>
                <ArrowRight size={14} className="qa-arrow" />
              </Link>

              <Link to="/admin/results" className="quick-action-link">
                <div className="quick-action-icon text-success bg-success-light">
                  <Award size={16} />
                </div>
                <div className="quick-action-text">
                  <span className="qa-name">Publish Grade Result</span>
                  <span className="qa-sub">Input marks & release transcripts</span>
                </div>
                <ArrowRight size={14} className="qa-arrow" />
              </Link>

              <Link to="/admin/announcements" className="quick-action-link">
                <div className="quick-action-icon text-info bg-info-light">
                  <Megaphone size={16} />
                </div>
                <div className="quick-action-text">
                  <span className="qa-name">Post Circular Notice</span>
                  <span className="qa-sub">Broadcast to enrolled students</span>
                </div>
                <ArrowRight size={14} className="qa-arrow" />
              </Link>

              <Link to="/admin/students" className="quick-action-link">
                <div className="quick-action-icon text-warning bg-warning-light">
                  <Users size={16} />
                </div>
                <div className="quick-action-text">
                  <span className="qa-name">Manage Students</span>
                  <span className="qa-sub">Verify candidate credentials</span>
                </div>
                <ArrowRight size={14} className="qa-arrow" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
