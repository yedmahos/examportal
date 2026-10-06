import React, { useEffect, useState } from "react";
import { notificationService } from "../../services/notificationService";
import LoadingState from "../../components/common/LoadingState";
import {
  DashboardShell,
  Panel,
  Split,
  UpdateList,
  formatWhen,
  TextLink,
} from "../../components/dashboard/RoleSections";

const FacultyDashboard = () => {
  const [updates, setUpdates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    notificationService.getAll()
      .then((response) => {
        if (!active) return;
        const items = (response.data?.items || []).slice(0, 6).map((item) => ({
          id: String(item.id || item._id),
          title: item.title || "Duty update",
          body: item.message && item.message !== item.title ? item.message : "",
          when: formatWhen(item.createdAt),
        }));
        setUpdates(items);
      })
      .catch(() => {
        if (active) setUpdates([]);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, []);

  if (isLoading) return <LoadingState message="Loading faculty dashboard..." />;

  return (
    <DashboardShell title="Faculty Dashboard">
      <div className="admin-stats-grid">
        <Panel title="Today's Duties">
          <UpdateList
            items={[]}
            emptyTitle="No examination duties assigned today"
            emptyDescription="Assigned duties for today will appear in this section."
          />
        </Panel>
        <Panel title="Upcoming Duties">
          <UpdateList
            items={[]}
            emptyTitle="No upcoming duties"
            emptyDescription="Future examination duties assigned to you will appear here."
          />
        </Panel>
        <Panel title="Assigned Duties">
          <UpdateList
            items={[]}
            emptyTitle="No assigned duties"
            emptyDescription="A duty total appears when examination duties are assigned."
          />
        </Panel>
      </div>

      <Panel title="Duty Details" action={<TextLink to="/faculty/duties">Open duties</TextLink>}>
        <UpdateList
          items={[]}
          emptyTitle="No duty details"
          emptyDescription="Examination, room, session, and reporting time appear here for an assigned duty."
        />
      </Panel>

      <Split>
        <Panel title="My Schedule" action={<TextLink to="/faculty/schedule">Open schedule</TextLink>}>
          <UpdateList
            items={[]}
            emptyTitle="No assigned schedule"
            emptyDescription="Your examination schedule appears when a duty is assigned to you."
          />
        </Panel>
        <Panel title="Duty Notifications" action={<TextLink to="/faculty/notifications">View notifications</TextLink>}>
          <UpdateList
            items={updates}
            emptyTitle="No duty notifications"
            emptyDescription="Duty assignments, room changes, and postponements will appear here."
          />
        </Panel>
      </Split>
    </DashboardShell>
  );
};

export default FacultyDashboard;
