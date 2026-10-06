import React, { useEffect, useState } from "react";
import { Award, BookOpen, Calendar, Bell } from "lucide-react";
import { dashboardService } from "../../services/dashboardService";
import { seatingService } from "../../services/resourceService";
import StatCard from "../../components/common/StatCard";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import {
  DashboardShell,
  Panel,
  Facts,
  Split,
  UpdateList,
  PaperList,
  TextLink,
  formatWhen,
} from "../../components/dashboard/RoleSections";

const ROOM_MISSING = "Room not assigned yet";
const SEAT_MISSING = "Seat not published yet";

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

const paperFromExam = (exam, seats) => {
  const seat = matchSeat(exam, seats);
  const room = seat?.room || exam.room || ROOM_MISSING;
  const building = seat?.building || exam.venue || "";

  return {
    id: exam.id || exam._id,
    title: exam.subject || exam.title || "Examination",
    meta: exam.title && exam.subject ? exam.title : "",
    status: exam.status,
    rows: [
      { label: "Examination", value: exam.title },
      { label: "Subject", value: exam.subject },
      { label: "Date", value: formatWhen(exam.examDate) },
      { label: "Time", value: timeRange(exam) },
      { label: "Reporting time", value: exam.reportingTime },
      { label: "Building", value: building },
      { label: "Room", value: room },
      { label: "Seat", value: seat?.seatNumber || SEAT_MISSING },
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
  const nextExam = upcoming[0] || null;
  const results = Array.isArray(data.recentResults) ? data.recentResults : [];
  const performance = data.performance || { totalResults: 0 };
  const updates = [
    ...(data.notifications || []).map((item) => ({
      id: `notice-${item.id}`,
      title: item.title,
      body: item.message && item.message !== item.title ? item.message : "",
      when: formatWhen(item.createdAt),
    })),
    ...(data.recentAnnouncements || []).map((item) => ({
      id: `announcement-${item.id || item._id}`,
      title: item.title || "Announcement",
      body: item.content || "",
      when: formatWhen(item.publishDate),
    })),
  ].slice(0, 6);

  const resultPapers = results.map((result) => {
    const exam = result.exam || {};
    const marks = result.marksObtained !== undefined && result.marksObtained !== null
      ? `${result.marksObtained}${result.maximumMarks ? ` / ${result.maximumMarks}` : ""}`
      : "";

    return {
      id: result.id || result._id,
      title: exam.subject || exam.title || "Result",
      meta: exam.title && exam.subject ? exam.title : "",
      status: result.published ? "published" : result.status,
      rows: [
        { label: "Examination", value: exam.title },
        { label: "Subject", value: exam.subject },
        { label: "Marks", value: marks },
        { label: "Percentage", value: result.percentage !== undefined && result.percentage !== null ? `${result.percentage}%` : "" },
        { label: "Grade", value: result.grade },
        { label: "Published", value: result.published ? "Published" : "" },
      ],
    };
  });

  return (
    <DashboardShell title="Student Dashboard">
      <Panel
        title="Next Examination"
        action={nextExam ? <TextLink to={`/exams/schedule/${nextExam.id || nextExam._id}`}>Open schedule</TextLink> : null}
      >
        {nextExam ? (
          <>
            <Facts rows={[
              ...paperFromExam(nextExam, seats).rows,
              { label: "Instructions", value: nextExam.instructions },
            ]} />
          </>
        ) : (
          <UpdateList items={[]} emptyTitle="No upcoming examinations" emptyDescription="Your next examination will appear here when a schedule is published for you." />
        )}
      </Panel>

      <Panel title="Upcoming Examinations" action={<TextLink to="/exams">View schedule</TextLink>}>
        <PaperList
          papers={upcoming.map((exam) => paperFromExam(exam, seats))}
          emptyTitle="No upcoming examinations"
          emptyDescription="Examinations you are eligible for will appear here."
        />
      </Panel>

      <Split>
        <Panel title="Recent Results" action={<TextLink to="/results">View results</TextLink>}>
          <PaperList
            papers={resultPapers}
            emptyTitle="No results available yet"
            emptyDescription="Published results for your examinations will appear here."
          />
        </Panel>
        <Panel title="Exam Updates" action={<TextLink to="/notifications">View notifications</TextLink>}>
          <UpdateList
            items={updates}
            emptyTitle="No examination updates"
            emptyDescription="Schedule changes and examination announcements will appear here."
          />
        </Panel>
      </Split>

      <Panel title="Performance">
        {performance.totalResults > 0 ? (
          <div className="admin-stats-grid">
            <StatCard icon={BookOpen} title="Published Results" value={performance.totalResults} caption="Included in this summary" to="/results" />
            {performance.averagePercentage !== null && (
              <StatCard icon={Award} title="Average Percentage" value={`${performance.averagePercentage}%`} caption="Across published results" to="/results" />
            )}
            <StatCard icon={Calendar} title="Passed" value={performance.passed} caption="Published results marked passed" to="/results" />
            <StatCard icon={Bell} title="Failed" value={performance.failed} caption="Published results marked failed" to="/results" />
          </div>
        ) : (
          <UpdateList items={[]} emptyTitle="No performance data yet" emptyDescription="A performance summary appears after results are published." />
        )}
      </Panel>
    </DashboardShell>
  );
};

export default StudentDashboard;
