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

const todayKey = () => new Date().toISOString().slice(0, 10);

const timeKey = (duty) => duty.startTime || duty.reportingTime || "";

const compareDuty = (left, right) => {
  const byDate = dateKey(left.date).localeCompare(dateKey(right.date));
  if (byDate !== 0) return byDate;
  return timeKey(left).localeCompare(timeKey(right));
};

const summarizeDuties = (duties, today = todayKey()) => {
  const active = duties.filter((duty) => duty.status === "assigned").sort(compareDuty);
  const todayDuties = active.filter((duty) => dateKey(duty.date) === today);
  const upcoming = active.filter((duty) => dateKey(duty.date) > today);
  const completed = duties
    .filter((duty) => duty.status === "completed")
    .sort((left, right) => compareDuty(right, left));
  const priority = todayDuties[0] || upcoming[0] || completed[0] || null;
  let priorityLabel = "";
  if (todayDuties[0]) priorityLabel = "Today's duty";
  else if (upcoming[0]) priorityLabel = "Next duty";
  else if (completed[0]) priorityLabel = "Last completed duty";

  return { active, todayDuties, upcoming, completed, priority, priorityLabel };
};

const dutyPaper = (duty, { includeTimes = false } = {}) => ({
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
    ...(includeTimes ? [
      { label: "Start time", value: duty.startTime },
      { label: "End time", value: duty.endTime },
    ] : []),
    { label: "Room", value: duty.room?.roomNumber },
    { label: "Building", value: duty.room?.building },
  ],
});

const DutyPreview = ({ label, duty, more = 0 }) => {
  if (!duty) return null;
  const examination = duty.examination?.title || "Examination";
  const subject = duty.subject?.code || duty.subject?.name || "Subject";
  const when = [formatWhen(duty.date), duty.session?.name].filter(Boolean).join(" · ");
  const place = [duty.room?.roomNumber, duty.room?.building].filter(Boolean).join(" · ");

  return (
    <div className="duty-preview">
      <div className="duty-preview-label">{label}</div>
      <strong>{examination} - {subject}</strong>
      {when ? <p>{when}</p> : null}
      {duty.reportingTime ? <p>Reporting {duty.reportingTime}</p> : null}
      {place ? <p>{place}</p> : null}
      {more > 0 ? <p>+{more} more</p> : null}
    </div>
  );
};

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

  const summary = summarizeDuties(duties);
  const { active, todayDuties, upcoming, completed, priority, priorityLabel } = summary;
  const hasWorkload = active.length > 0 || completed.length > 0;

  return (
    <DashboardShell title="Faculty Dashboard">
      <div className="admin-stats-grid">
        <Panel title="Today's Duties" action={todayDuties.length ? <TextLink to="/faculty/duties">Open duties</TextLink> : null}>
          {todayDuties.length ? (
            <>
              <Facts rows={[{ label: "Duties today", value: String(todayDuties.length) }]} />
              <DutyPreview label="Today's duty" duty={todayDuties[0]} more={todayDuties.length - 1} />
            </>
          ) : (
            <UpdateList items={[]} emptyTitle="No examination duties assigned today" emptyDescription="Assigned duties for today will appear in this section." />
          )}
        </Panel>
        <Panel title="Upcoming Duties" action={<TextLink to="/faculty/duties">Open duties</TextLink>}>
          <Facts rows={[{ label: "Upcoming", value: String(upcoming.length) }]} />
          {upcoming.length ? (
            <DutyPreview label="Next duty" duty={upcoming[0]} more={upcoming.length - 1} />
          ) : (
            <UpdateList items={[]} emptyTitle="No upcoming duties assigned" emptyDescription="Future examination duties assigned to you will appear here." />
          )}
        </Panel>
        <Panel title="Assigned Duties" action={<TextLink to="/faculty/duties">Open duties</TextLink>}>
          {hasWorkload ? (
            <>
              <Facts rows={[
                { label: "Assigned", value: String(active.length) },
                { label: "Upcoming", value: String(upcoming.length) },
                { label: "Today", value: String(todayDuties.length) },
                { label: "Completed", value: String(completed.length) },
              ]} />
              <DutyPreview
                label={priorityLabel}
                duty={priority}
                more={priority && priority.status === "assigned" ? Math.max(active.length - 1, 0) : 0}
              />
            </>
          ) : (
            <UpdateList items={[]} emptyTitle="No assigned duties" emptyDescription="A duty total appears when examination duties are assigned." />
          )}
        </Panel>
      </div>

      <Panel title="Today's Duty Details" action={<TextLink to="/faculty/duties">Open duties</TextLink>}>
        <PaperList
          papers={todayDuties.map((duty) => dutyPaper(duty, { includeTimes: true }))}
          emptyTitle="No duty details"
          emptyDescription="Examination, room, session, and reporting time appear here for an assigned duty."
        />
      </Panel>

      <Split>
        <Panel title="My Schedule" action={<TextLink to="/faculty/schedule">Open schedule</TextLink>}>
          <PaperList
            papers={upcoming.map((duty) => dutyPaper(duty))}
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
