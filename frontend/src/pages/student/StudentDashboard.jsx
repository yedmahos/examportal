import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  BookOpen,
  Calendar,
  Bell,
  Clock,
  Building2,
  DoorOpen,
  Hash,
  Info,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { dashboardService } from "../../services/dashboardService";
import { seatingService } from "../../services/resourceService";
import StatCard from "../../components/common/StatCard";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import StatusBadge from "../../components/common/StatusBadge";
import {
  DashboardShell,
  Panel,
  Split,
  UpdateList,
  TextLink,
  formatWhen,
} from "../../components/dashboard/RoleSections";
import "./UpcomingExams.css";

const sameDay = (left, right) => {
  if (!left || !right) return false;
  const a = new Date(left);
  const b = new Date(right);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false;
  return a.getUTCFullYear() === b.getUTCFullYear()
    && a.getUTCMonth() === b.getUTCMonth()
    && a.getUTCDate() === b.getUTCDate();
};

const matchSeat = (exam, seats) => seats.find((seat) => (
  seat.subject
  && exam.subject
  && seat.subject === exam.subject
  && sameDay(seat.date, exam.examDate)
));

const timeRange = (exam) => {
  if (exam.startTime && exam.endTime) return `${exam.startTime} – ${exam.endTime}`;
  return exam.startTime || exam.endTime || "";
};

const DETAIL_FIELDS = [
  { label: "Date", icon: Calendar },
  { label: "Time", icon: Clock },
  { label: "Reporting time", icon: Clock },
  { label: "Building", icon: Building2 },
  { label: "Room", icon: DoorOpen },
  { label: "Seat", icon: Hash },
  { label: "Examination", icon: BookOpen },
  { label: "Instructions", icon: Info },
];

const fieldValue = (paper, label) => {
  const row = (paper.rows || []).find((item) => item.label === label);
  if (!row || row.value === undefined || row.value === null) return "";
  return String(row.value).trim();
};

const UpcomingExamRow = ({ paper }) => {
  const detailsRef = useRef(null);
  const examType = fieldValue(paper, "Exam type");
  const details = DETAIL_FIELDS
    .map((field) => ({ ...field, value: fieldValue(paper, field.label) }))
    .filter((field) => field.value)
    .filter((field) => field.label !== "Examination" || field.value !== paper.title);
  const detailKey = details.map((field) => `${field.label}:${field.value}`).join("|");

  useLayoutEffect(() => {
    const root = detailsRef.current;
    if (!root) return undefined;

    const markRowStarts = () => {
      const items = [...root.querySelectorAll(":scope > .upcoming-exam-detail")];
      if (!items.length) return;
      const rowLeft = Math.min(...items.map((item) => item.offsetLeft));
      items.forEach((item) => {
        item.classList.toggle("is-row-start", item.offsetLeft <= rowLeft + 1);
      });
    };

    markRowStarts();
    const observer = new ResizeObserver(markRowStarts);
    observer.observe(root);
    return () => observer.disconnect();
  }, [detailKey]);

  return (
    <article className="upcoming-exam-row">
      <div className="upcoming-exam-top">
        <div className="upcoming-exam-identity">
          <h4 className="upcoming-exam-subject">{paper.title}</h4>
          {examType ? <span className="upcoming-exam-type">{examType}</span> : null}
        </div>
        <div className="upcoming-exam-side">
          {paper.status ? <StatusBadge status={paper.status} size="sm" /> : null}
          <ChevronRight className="upcoming-exam-chevron" size={18} strokeWidth={1.75} aria-hidden="true" />
        </div>
      </div>
      {details.length ? (
        <div className="upcoming-exam-details" ref={detailsRef}>
          {details.map((field) => {
            const Icon = field.icon;
            const wide = field.label === "Instructions";
            return (
              <div className={`upcoming-exam-detail${wide ? " is-wide" : ""}`} key={field.label}>
                <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                <div className="upcoming-exam-copy">
                  <span>{field.label}</span>
                  <strong>{field.value}</strong>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </article>
  );
};

const UpcomingExaminations = ({ papers }) => (
  <section className="upcoming-exams" aria-labelledby="upcoming-exams-title">
    <div className="upcoming-exams-head">
      <div className="upcoming-exams-title">
        <span className="upcoming-exams-icon" aria-hidden="true">
          <Calendar size={18} strokeWidth={1.75} />
        </span>
        <h3 id="upcoming-exams-title" className="upcoming-exams-heading">Upcoming Examinations</h3>
      </div>
      <Link to="/exams" className="role-text-link upcoming-exams-link">
        View schedule
        <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
      </Link>
    </div>
    {papers.length ? (
      <div className="upcoming-exams-list">
        {papers.map((paper, index) => (
          <UpcomingExamRow key={paper.id || index} paper={paper} />
        ))}
      </div>
    ) : (
      <EmptyState
        className="upcoming-exams-empty"
        title="No upcoming examinations"
        description="Examinations published for you will appear here."
      />
    )}
  </section>
);

const paperFromExam = (exam, seats) => {
  const seat = matchSeat(exam, seats);

  return {
    id: exam.id || exam._id,
    title: exam.subject || exam.title || "Examination",
    meta: exam.title && exam.subject ? exam.title : "",
    status: exam.status,
    rows: [
      { label: "Examination", value: exam.title },
      { label: "Subject", value: exam.subject },
      { label: "Exam type", value: exam.examType },
      { label: "Date", value: formatWhen(exam.examDate) },
      { label: "Time", value: timeRange(exam) },
      { label: "Reporting time", value: exam.reportingTime },
      { label: "Building", value: seat?.building || exam.venue },
      { label: "Room", value: seat?.room || exam.room },
      { label: "Seat", value: seat?.seatNumber },
      { label: "Instructions", value: exam.instructions },
    ],
  };
};

const StudentDashboard = () => {
  const [data, setData] = useState(null);
  const [seats, setSeats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [dashboardResult, seatResult] = await Promise.allSettled([
        dashboardService.getStudentDashboard(),
        seatingService.listMine(),
      ]);

      if (dashboardResult.status === "rejected") {
        throw dashboardResult.reason;
      }

      setData(dashboardResult.value.data);
      const seatItems = seatResult.status === "fulfilled"
        ? seatResult.value.items || seatResult.value.data?.items || []
        : [];
      setSeats(Array.isArray(seatItems) ? seatItems : []);
    } catch (err) {
      setError(err.message || "Unable to load the student dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (isLoading) return <LoadingState message="Loading student dashboard..." />;
  if (error || !data) return <ErrorState message={error || "Unable to load the student dashboard"} onRetry={load} />;

  const upcoming = Array.isArray(data.upcomingExams) ? data.upcomingExams : [];
  const results = Array.isArray(data.recentResults) ? data.recentResults : [];
  const performance = data.performance || { totalResults: 0 };
  const updates = (data.notifications || []).slice(0, 3).map((item) => ({
    id: String(item.id || item._id),
    title: item.title,
    body: item.message && item.message !== item.title ? item.message : "",
    when: formatWhen(item.createdAt),
  }));

  return (
    <DashboardShell title="Student Dashboard">
      <UpcomingExaminations papers={upcoming.map((exam) => paperFromExam(exam, seats))} />

      <Split>
        <Panel title="Recent Results" action={<TextLink to="/results">View all results</TextLink>}>
          {results.length ? (
            <ul className="role-compact-results">
              {results.slice(0, 3).map((result) => {
                const exam = result.exam || {};
                const marks = result.marksObtained !== undefined && result.marksObtained !== null
                  ? `${result.marksObtained}${result.maximumMarks ? ` / ${result.maximumMarks}` : ""}`
                  : "";
                return (
                  <li key={result.id || result._id}>
                    <div>
                      <strong>{exam.subject || exam.title || "Result"}</strong>
                      {marks ? <span>{marks}</span> : null}
                    </div>
                    {result.grade ? <strong className="role-compact-grade">{result.grade}</strong> : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <UpdateList items={[]} emptyTitle="No published results yet" emptyDescription="Published results for your examinations will appear here." />
          )}
        </Panel>
        <Panel title="Exam Updates" action={<TextLink to="/notifications">View all notifications</TextLink>}>
          <UpdateList
            items={updates}
            emptyTitle="No new examination updates"
            emptyDescription="Schedule, room, seat, and result notifications for your account will appear here."
          />
        </Panel>
      </Split>

      {performance.totalResults > 0 && (
        <Panel title="Performance">
          <div className="admin-stats-grid">
            <StatCard icon={BookOpen} title="Published Results" value={performance.totalResults} caption="Included in this summary" to="/results" />
            {performance.averagePercentage !== null && (
              <StatCard icon={Award} title="Average Percentage" value={`${performance.averagePercentage}%`} caption="Across published results" to="/results" />
            )}
            <StatCard icon={Calendar} title="Passed" value={performance.passed} caption="Published results marked passed" to="/results" />
            <StatCard icon={Bell} title="Failed" value={performance.failed} caption="Published results marked failed" to="/results" />
          </div>
        </Panel>
      )}
    </DashboardShell>
  );
};

export default StudentDashboard;
