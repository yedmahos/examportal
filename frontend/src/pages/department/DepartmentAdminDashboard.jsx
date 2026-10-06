import React, { useEffect, useState } from "react";
import { BookOpen, Calendar, Users, ClipboardList } from "lucide-react";
import StatCard from "../../components/common/StatCard";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import { studentService } from "../../services/studentService";
import { notificationService } from "../../services/notificationService";
import {
  batchService,
  registrationService,
  scheduleService,
  subjectService,
} from "../../services/resourceService";
import {
  DashboardShell,
  Panel,
  Split,
  UpdateList,
  PaperList,
  ActionList,
  TextLink,
  formatWhen,
} from "../../components/dashboard/RoleSections";

const settled = async (task) => {
  try {
    return { ok: true, value: await task };
  } catch (error) {
    return { ok: false, error };
  }
};

const schedulePaper = (item) => ({
  id: item.id || item._id,
  title: item.subject?.name || item.examination?.title || "Scheduled paper",
  meta: item.examination?.title || "",
  status: item.status,
  rows: [
    { label: "Examination", value: item.examination?.title },
    { label: "Subject", value: item.subject?.name },
    { label: "Date", value: formatWhen(item.date) },
    { label: "Session", value: item.session?.name },
    { label: "Room", value: item.room?.roomNumber || "Room not assigned yet" },
    { label: "Building", value: item.room?.building },
  ],
});

const DepartmentAdminDashboard = () => {
  const [snapshot, setSnapshot] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setIsLoading(true);
    setError("");
    const [students, subjects, batches, registrations, schedules, notifications] = await Promise.all([
      settled(studentService.getAll({ limit: 1 })),
      settled(subjectService.list({ limit: 100 })),
      settled(batchService.list({ limit: 1 })),
      settled(registrationService.list({ limit: 1 })),
      settled(scheduleService.list({ limit: 50 })),
      settled(notificationService.getAll()),
    ]);

    if (![students, subjects, batches, schedules].some((result) => result.ok)) {
      setError("Department information could not be loaded.");
      setIsLoading(false);
      return;
    }

    setSnapshot({ students, subjects, batches, registrations, schedules, notifications });
    setIsLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  if (isLoading) return <LoadingState message="Loading department dashboard..." />;
  if (error || !snapshot) return <ErrorState message={error || "Department information could not be loaded."} onRetry={load} />;

  const subjectItems = snapshot.subjects.ok ? snapshot.subjects.value.data.items : [];
  const subjectTotal = snapshot.subjects.ok ? snapshot.subjects.value.data.total : null;
  const verificationKnown = snapshot.subjects.ok && typeof subjectTotal === "number" && subjectTotal <= subjectItems.length;
  const unverified = verificationKnown
    ? subjectItems.filter((subject) => subject.verificationStatus !== "verified")
    : [];

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const scheduleItems = snapshot.schedules.ok ? snapshot.schedules.value.data.items : [];
  const upcoming = scheduleItems
    .filter((item) => item.date && new Date(item.date) >= today)
    .slice(0, 6);

  const actions = [];
  if (verificationKnown && unverified.length > 0) {
    actions.push({
      id: "subject-verification",
      title: `${unverified.length} subject${unverified.length === 1 ? "" : "s"} awaiting verification`,
      body: "Confirm subject details before they can be scheduled.",
      to: "/department-admin/subjects",
    });
  } else if (snapshot.subjects.ok && !verificationKnown) {
    actions.push({
      id: "subject-review",
      title: "Subject verification",
      body: "Open subjects to review verification status. The department list is larger than one page, so a count is not shown.",
      to: "/department-admin/subjects",
    });
  }

  const updates = snapshot.notifications.ok
    ? (snapshot.notifications.value.data?.items || []).slice(0, 6).map((item) => ({
        id: String(item.id || item._id),
        title: item.title || "Department update",
        body: item.message && item.message !== item.title ? item.message : "",
        when: formatWhen(item.createdAt),
      }))
    : [];

  return (
    <DashboardShell title="Department Admin Dashboard">
      <Panel title="Pending Actions">
        <ActionList
          items={actions}
          emptyTitle="No pending actions"
          emptyDescription="Subject verification is clear for the subjects returned for this department."
        />
      </Panel>

      <div className="admin-stats-grid">
        {snapshot.students.ok && (
          <StatCard icon={Users} title="Students" value={snapshot.students.value.data.total} caption="Students in this department" to="/department-admin/students" />
        )}
        {snapshot.subjects.ok && (
          <StatCard icon={BookOpen} title="Subjects" value={subjectTotal} caption="Subjects in this department" to="/department-admin/subjects" />
        )}
        {snapshot.batches.ok && (
          <StatCard icon={Calendar} title="Batches" value={snapshot.batches.value.data.total} caption="Batches in this department" to="/department-admin/batches" />
        )}
        {snapshot.registrations.ok && (
          <StatCard icon={ClipboardList} title="Registrations" value={snapshot.registrations.value.data.total} caption="Subject registrations in this department" to="/department-admin/registrations" />
        )}
      </div>

      <Panel title="Invigilation" action={<TextLink to="/department-admin/invigilation">Review duties</TextLink>}>
        <p className="role-note">
          Assigned duties and faculty workload for this department can be reviewed here. Allocation stays with the Examination Cell.
        </p>
      </Panel>

      <Panel title="Department Examination Schedule" action={<TextLink to="/department-admin/schedules">Open schedules</TextLink>}>
        <PaperList
          papers={upcoming.map(schedulePaper)}
          emptyTitle="No upcoming department examinations"
          emptyDescription="Scheduled papers for this department will appear here."
        />
      </Panel>

      <Split>
        <Panel title="Verification" action={<TextLink to="/department-admin/subjects">Open subjects</TextLink>}>
          {!snapshot.subjects.ok ? (
            <p className="role-note">Subjects for this department could not be loaded.</p>
          ) : verificationKnown ? (
            <PaperList
              papers={unverified.slice(0, 5).map((subject) => ({
                id: subject.id,
                title: subject.name || subject.code || "Subject",
                meta: subject.code || "",
                status: subject.verificationStatus,
                rows: [],
              }))}
              emptyTitle="No subjects awaiting verification"
              emptyDescription="Verified subjects in this department do not need another review."
            />
          ) : (
            <p className="role-note">
              Verification status can be reviewed on the subjects page. A department-wide count is omitted because the subject list does not fit in one response.
            </p>
          )}
        </Panel>
        <Panel title="Eligibility" action={<TextLink to="/department-admin/eligibility">Review eligibility</TextLink>}>
          <p className="role-note">
            Eligible, registered, and blocked counts are available for one examination and one subject at a time. Open eligibility review and choose a paper.
          </p>
        </Panel>
      </Split>

      <Panel title="Department Updates" action={<TextLink to="/department-admin/notifications">View notifications</TextLink>}>
        <UpdateList
          items={updates}
          emptyTitle="No department updates"
          emptyDescription="Schedule changes and department notices will appear here."
        />
      </Panel>
    </DashboardShell>
  );
};

export default DepartmentAdminDashboard;
