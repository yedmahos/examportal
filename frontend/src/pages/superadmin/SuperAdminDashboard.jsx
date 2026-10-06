import React, { useEffect, useState } from "react";
import { Calendar, DoorOpen, Users, AlertTriangle, CheckCircle2, Building2 } from "lucide-react";
import StatCard from "../../components/common/StatCard";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import { dashboardService } from "../../services/dashboardService";
import { departmentService, scheduleService, facultyService } from "../../services/resourceService";
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

const settled = async (task) => {
  try {
    return { ok: true, value: await task };
  } catch {
    return { ok: false };
  }
};

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
    { label: "Status", value: item.status },
  ],
});

const SuperAdminDashboard = () => {
  const [data, setData] = useState(null);
  const [extra, setExtra] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [dashboardResult, departments, faculty, schedules] = await Promise.all([
        dashboardService.getAdminDashboard(),
        settled(departmentService.list({ limit: 1 })),
        settled(facultyService.list()),
        settled(scheduleService.list({ limit: 50, status: "scheduled" })),
      ]);
      setData(dashboardResult.data);
      setExtra({ departments, faculty, schedules });
    } catch (err) {
      setError(err.message || "System information could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (isLoading) return <LoadingState message="Loading system dashboard..." />;
  if (error || !data || !extra) return <ErrorState message={error || "System information could not be loaded."} onRetry={load} />;

  const stats = data.stats || {};
  const current = stats.currentExamination;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const upcoming = extra.schedules.ok
    ? extra.schedules.value.data.items.filter((item) => item.date && new Date(item.date) >= today).slice(0, 5)
    : [];
  const conflicts = typeof stats.conflicts === "number" ? stats.conflicts : null;
  const departmentTotal = extra.departments.ok ? extra.departments.value.data.total : null;
  const facultyTotal = extra.faculty.ok ? extra.faculty.value.data.items.length : null;
  const attention = [];

  if (conflicts > 0) {
    attention.push({
      id: "conflicts",
      title: `${conflicts} schedule warning${conflicts === 1 ? "" : "s"}`,
      body: "Review schedules that still have warnings.",
      when: "",
    });
  }

  const activity = (data.recentActivities || []).slice(0, 6).map((item) => ({
    id: String(item.id),
    title: item.action || "System activity",
    body: item.entity || "",
    when: formatStamp(item.timestamp),
  }));

  return (
    <DashboardShell title="Super Admin Dashboard">
      <div className="admin-stats-grid">
        <StatCard icon={Users} title="Students" value={stats.totalStudents} caption="Student accounts" to="/admin/students" />
        {facultyTotal !== null && (
          <StatCard icon={Users} title="Faculty" value={facultyTotal} caption="Faculty accounts" to="/super-admin/users" />
        )}
        {departmentTotal !== null && (
          <StatCard icon={Building2} title="Departments" value={departmentTotal} caption="Departments on record" to="/super-admin/departments" />
        )}
        {typeof stats.totalRooms === "number" && (
          <StatCard icon={DoorOpen} title="Rooms" value={stats.totalRooms} caption="Active rooms" to="/super-admin/rooms" />
        )}
        <StatCard icon={Calendar} title="Examinations" value={stats.totalExams} caption="Examination records" to="/super-admin/examinations" />
      </div>

      <Panel title="Current Examination" action={<TextLink to="/super-admin/examinations">Open examinations</TextLink>}>
        {current ? (
          <Facts rows={[
            { label: "Examination", value: current.title },
            { label: "Start", value: formatWhen(current.startDate) },
            { label: "End", value: formatWhen(current.endDate) },
            { label: "Semester", value: current.semester },
          ]} />
        ) : (
          <UpdateList items={[]} emptyTitle="No examination in progress" emptyDescription="An examination whose dates cover today will appear here." />
        )}
      </Panel>

      <div className="admin-stats-grid">
        <StatCard icon={Calendar} title="Upcoming Examinations" value={stats.upcomingExams} caption="Scheduled papers on or after today" to="/super-admin/schedules" />
        {typeof stats.subjectsScheduled === "number" && (
          <StatCard icon={CheckCircle2} title="Subjects Scheduled" value={stats.subjectsScheduled} caption="Distinct scheduled subjects" to="/super-admin/schedules" />
        )}
        {typeof stats.roomsAllocated === "number" && (
          <StatCard icon={DoorOpen} title="Rooms Allocated" value={stats.roomsAllocated} caption="Scheduled papers with a room" to="/super-admin/rooms" />
        )}
        {conflicts !== null && (
          <StatCard icon={AlertTriangle} title="Conflicts" value={conflicts} caption="Schedules with warnings" to="/super-admin/schedules" />
        )}
      </div>

      <Split>
        <Panel title="Upcoming Examinations" action={<TextLink to="/super-admin/schedules">Open schedules</TextLink>}>
          <PaperList
            papers={upcoming.map(schedulePaper)}
            emptyTitle="No upcoming examinations"
            emptyDescription="Scheduled papers will appear here."
          />
        </Panel>
        <Panel title="System Attention">
          {conflicts === 0 && attention.length === 0 ? (
            <UpdateList items={[]} emptyTitle="No conflicts detected" emptyDescription="There are no schedule warnings that need attention." />
          ) : (
            <UpdateList
              items={attention}
              emptyTitle="No system warnings"
              emptyDescription="Warnings that the system can measure will appear here."
            />
          )}
        </Panel>
      </Split>

      <Panel title="Invigilation" action={<TextLink to="/super-admin/invigilation">Open invigilation</TextLink>}>
        <p className="role-note">
          Review faculty duties, workload, and room assignments across departments.
        </p>
      </Panel>

      <Panel title="Recent System Activity">
        <UpdateList
          items={activity}
          emptyTitle="No recent system activity"
          emptyDescription="Recorded examination and administration activity will appear here."
        />
      </Panel>
    </DashboardShell>
  );
};

export default SuperAdminDashboard;
