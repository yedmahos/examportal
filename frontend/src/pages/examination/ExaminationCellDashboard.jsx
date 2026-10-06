import React, { useEffect, useState } from "react";
import { BookOpen, Calendar, DoorOpen, Users, AlertTriangle, CheckCircle2 } from "lucide-react";
import StatCard from "../../components/common/StatCard";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import { dashboardService } from "../../services/dashboardService";
import { scheduleService } from "../../services/resourceService";
import {
  DashboardShell,
  Panel,
  Facts,
  Split,
  PaperList,
  UpdateList,
  TextLink,
  formatWhen,
  formatStamp,
} from "../../components/dashboard/RoleSections";

const schedulePaper = (item) => ({
  id: item.id || item._id,
  title: item.examination?.title || item.subject?.name || "Examination",
  meta: item.subject?.name || "",
  status: item.status,
  rows: [
    { label: "Subject", value: item.subject?.name },
    { label: "Date", value: formatWhen(item.date) },
    { label: "Session", value: item.session?.name },
    { label: "Room", value: item.room?.roomNumber || "Room not assigned yet" },
    { label: "Building", value: item.room?.building },
  ],
});

const ExaminationCellDashboard = () => {
  const [data, setData] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [dashboardResult, scheduleResult] = await Promise.allSettled([
        dashboardService.getAdminDashboard(),
        scheduleService.list({ limit: 50, status: "scheduled" }),
      ]);
      if (dashboardResult.status === "rejected") throw dashboardResult.reason;
      setData(dashboardResult.value.data);
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const items = scheduleResult.status === "fulfilled" ? scheduleResult.value.data.items : [];
      setUpcoming(items.filter((item) => item.date && new Date(item.date) >= today).slice(0, 6));
    } catch (err) {
      setError(err.message || "Examination operations could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (isLoading) return <LoadingState message="Loading examination dashboard..." />;
  if (error || !data) return <ErrorState message={error || "Examination operations could not be loaded."} onRetry={load} />;

  const stats = data.stats || {};
  const current = stats.currentExamination;
  const nextPaper = upcoming[0];
  const conflicts = typeof stats.conflicts === "number" ? stats.conflicts : null;
  const activity = (data.recentExams || []).slice(0, 6).map((exam) => ({
    id: String(exam.id || exam._id),
    title: exam.title || exam.subject || "Examination updated",
    body: [exam.subject, exam.status].filter(Boolean).join(" · "),
    when: formatStamp(exam.updatedAt || exam.createdAt || exam.examDate),
  }));

  return (
    <DashboardShell title="Examination Cell Dashboard">
      <Panel
        title={current ? "Current Examination" : "Next Examination"}
        action={<TextLink to="/examination-cell/examinations">Open examinations</TextLink>}
      >
        {current ? (
          <Facts rows={[
            { label: "Examination", value: current.title },
            { label: "Start", value: formatWhen(current.startDate) },
            { label: "End", value: formatWhen(current.endDate) },
            { label: "Semester", value: current.semester },
          ]} />
        ) : nextPaper ? (
          <Facts rows={schedulePaper(nextPaper).rows.concat([
            { label: "Examination", value: nextPaper.examination?.title },
          ])} />
        ) : (
          <UpdateList items={[]} emptyTitle="No current examination" emptyDescription="The examination in progress, or the next scheduled paper, will appear here." />
        )}
      </Panel>

      <div className="admin-stats-grid">
        <StatCard icon={Users} title="Students" value={stats.totalStudents} caption="Students on record" to="/admin/students" />
        {typeof stats.totalSubjects === "number" && (
          <StatCard icon={BookOpen} title="Subjects" value={stats.totalSubjects} caption="Active subjects" to="/examination-cell/subjects" />
        )}
        {typeof stats.totalRooms === "number" && (
          <StatCard icon={DoorOpen} title="Rooms" value={stats.totalRooms} caption="Active rooms" to="/examination-cell/rooms" />
        )}
        {typeof stats.subjectsScheduled === "number" && (
          <StatCard icon={CheckCircle2} title="Subjects Scheduled" value={stats.subjectsScheduled} caption="Distinct scheduled subjects" to="/examination-cell/schedules" />
        )}
        {typeof stats.roomsAllocated === "number" && (
          <StatCard icon={Calendar} title="Rooms Allocated" value={stats.roomsAllocated} caption="Scheduled papers with a room" to="/examination-cell/rooms" />
        )}
        {conflicts !== null && (
          <StatCard icon={AlertTriangle} title="Conflicts" value={conflicts} caption="Schedules with warnings" to="/examination-cell/schedules" />
        )}
      </div>

      <Split>
        <Panel title="Upcoming Examinations" action={<TextLink to="/examination-cell/schedules">Open schedules</TextLink>}>
          <PaperList
            papers={upcoming.map(schedulePaper)}
            emptyTitle="No upcoming examinations"
            emptyDescription="Scheduled papers that still need operational attention will appear here."
          />
        </Panel>
        <Panel title="Conflicts">
          {conflicts === 0 ? (
            <UpdateList items={[]} emptyTitle="No conflicts detected" emptyDescription="Scheduled papers do not currently have warnings." />
          ) : conflicts > 0 ? (
            <p className="role-note">
              {conflicts} schedule{conflicts === 1 ? "" : "s"} currently have warnings. Open schedules to review the warning on each paper.
            </p>
          ) : (
            <UpdateList items={[]} emptyTitle="Conflict status unavailable" emptyDescription="Schedule warnings could not be counted." />
          )}
        </Panel>
      </Split>

      <Panel title="Recent Examination Activity">
        <UpdateList
          items={activity}
          emptyTitle="No recent examination activity"
          emptyDescription="Created and updated examinations will appear here."
        />
      </Panel>
    </DashboardShell>
  );
};

export default ExaminationCellDashboard;
