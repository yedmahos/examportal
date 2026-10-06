import React, { useEffect, useState } from "react";
import { invigilationService } from "../../services/invigilationService";
import { notificationService } from "../../services/notificationService";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import {
  DashboardShell,
  Panel,
  Split,
  UpdateList,
  PaperList,
  Facts,
  formatWhen,
  TextLink,
} from "../../components/dashboard/RoleSections";

const dateKey = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const dutyPaper = (duty) => ({
  id: String(duty._id),
  title: duty.subject?.name || duty.examination?.title || "Duty",
  meta: duty.examination?.title && duty.subject?.name ? duty.examination.title : "",
  status: duty.status,
  rows: [
    { label: "Examination", value: duty.examination?.title },
    { label: "Subject", value: duty.subject?.name },
    { label: "Date", value: formatWhen(duty.date) },
    { label: "Session", value: duty.session?.name },
    { label: "Reporting time", value: duty.reportingTime },
    { label: "Room", value: duty.room?.roomNumber },
    { label: "Building", value: duty.room?.building },
  ],
});

const FacultyDashboard = () => {
  const [duties, setDuties] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [dutyResult, noteResult] = await Promise.allSettled([
        invigilationService.mine(),
        notificationService.getAll(),
      ]);
      if (dutyResult.status === "rejected") throw dutyResult.reason;
      setDuties(dutyResult.value.items || []);
      const items = noteResult.status === "fulfilled" ? (noteResult.value.data?.items || []) : [];
      setUpdates(items.filter((item) => item.type === "exam").slice(0, 3).map((item) => ({
        id: String(item.id || item._id),
        title: item.title || "Duty update",
        body: item.message && item.message !== item.title ? item.message : "",
        when: formatWhen(item.createdAt),
      })));
    } catch (err) {
      setError(err.message || "Faculty duties could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (isLoading) return <LoadingState message="Loading faculty dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const today = new Date().toISOString().slice(0, 10);
  const active = duties.filter((duty) => duty.status === "assigned");
  const todayDuties = active.filter((duty) => dateKey(duty.date) === today);
  const upcoming = active.filter((duty) => dateKey(duty.date) > today);

  return (
    <DashboardShell title="Faculty Dashboard">
      <div className="admin-stats-grid">
        <Panel title="Today's Duties">
          {todayDuties.length ? <Facts rows={[{ label: "Duties today", value: String(todayDuties.length) }]} /> : (
            <UpdateList items={[]} emptyTitle="No examination duties assigned today" emptyDescription="Assigned duties for today will appear in this section." />
          )}
        </Panel>
        <Panel title="Upcoming Duties">
          {upcoming.length ? <Facts rows={[{ label: "Upcoming", value: String(upcoming.length) }]} /> : (
            <UpdateList items={[]} emptyTitle="No upcoming duties" emptyDescription="Future examination duties assigned to you will appear here." />
          )}
        </Panel>
        <Panel title="Assigned Duties">
          {active.length ? <Facts rows={[{ label: "Assigned", value: String(active.length) }]} /> : (
            <UpdateList items={[]} emptyTitle="No assigned duties" emptyDescription="A duty total appears when examination duties are assigned." />
          )}
        </Panel>
      </div>

      <Panel title="Today's Duty Details" action={<TextLink to="/faculty/duties">Open duties</TextLink>}>
        <PaperList
          papers={todayDuties.map(dutyPaper)}
          emptyTitle="No duty details"
          emptyDescription="Examination, room, session, and reporting time appear here for an assigned duty."
        />
      </Panel>

      <Split>
        <Panel title="My Schedule" action={<TextLink to="/faculty/schedule">Open schedule</TextLink>}>
          <PaperList
            papers={upcoming.map(dutyPaper)}
            emptyTitle="No assigned schedule"
            emptyDescription="Your examination schedule appears when a duty is assigned to you."
          />
        </Panel>
        <Panel title="Duty Notifications" action={<TextLink to="/faculty/notifications">View notifications</TextLink>}>
          <UpdateList
            items={updates}
            emptyTitle="No duty notifications"
            emptyDescription="Duty assignments, room changes, and cancellations will appear here."
          />
        </Panel>
      </Split>
    </DashboardShell>
  );
};

export default FacultyDashboard;
