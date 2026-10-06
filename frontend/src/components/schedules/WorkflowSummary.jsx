import React, { useEffect, useState } from "react";
import { Calendar, CheckCircle2, ClipboardList, FileClock } from "lucide-react";
import StatCard from "../common/StatCard";
import { Panel, UpdateList, TextLink } from "../dashboard/RoleSections";
import { scheduleWorkflowService } from "../../services/scheduleWorkflowService";

const formatWhen = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
};

const WorkflowSummary = ({ basePath, audience }) => {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    scheduleWorkflowService.summary()
      .then((body) => {
        if (!cancelled) setSummary(body);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Schedule approval counts could not be loaded.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const recent = (summary?.recentChanges || []).map((item) => ({
    id: `${item.scheduleId}-${item.versionNumber}-${item.state}`,
    title: `${item.examination || "Examination"}${item.subject ? ` · ${item.subject}` : ""} · v${item.versionNumber}`,
    body: [item.state, item.changeReason || item.changeSummary, item.department].filter(Boolean).join(" · "),
    when: formatWhen(item.publishedAt || item.createdAt),
  }));

  if (error) {
    return (
      <Panel title="Schedule approval">
        <p className="role-note">{error}</p>
      </Panel>
    );
  }

  if (!summary) {
    return (
      <Panel title="Schedule approval">
        <p className="role-note">Loading approval counts...</p>
      </Panel>
    );
  }

  return (
    <>
      {audience === "exam" && (
        <div className="admin-stats-grid">
          <StatCard icon={FileClock} title="Draft schedules" value={summary.draft} caption="Waiting to enter review" to={`${basePath}?approvalStage=DRAFT`} />
          <StatCard icon={ClipboardList} title="Exam Cell Review" value={summary.examCellReview} caption="Pending examination cell review" to={`${basePath}?approvalStage=EXAM_CELL_REVIEW`} />
          <StatCard icon={ClipboardList} title="Department Verification" value={summary.departmentVerification} caption="Pending department verification" to={`${basePath}?approvalStage=DEPARTMENT_VERIFICATION`} />
          <StatCard icon={ClipboardList} title="Academic Approval" value={summary.academicApproval} caption="Pending academic approval" to={`${basePath}?approvalStage=ACADEMIC_APPROVAL`} />
          <StatCard icon={CheckCircle2} title="Published schedules" value={summary.published} caption="Current published versions" to={`${basePath}?approvalStage=PUBLISHED`} />
        </div>
      )}
      {audience === "department" && (
        <div className="admin-stats-grid">
          <StatCard icon={ClipboardList} title="Awaiting verification" value={summary.departmentVerification} caption="Schedules in this department" to={`${basePath}?approvalStage=DEPARTMENT_VERIFICATION`} />
          <StatCard icon={CheckCircle2} title="Verified schedules" value={summary.verified} caption="Passed department verification" to={`${basePath}?approvalStage=ACADEMIC_APPROVAL`} />
          <StatCard icon={FileClock} title="Returned schedules" value={summary.returned} caption="Returned or rejected in this department" to={basePath} />
        </div>
      )}
      {audience === "super" && (
        <div className="admin-stats-grid">
          <StatCard icon={ClipboardList} title="Pending approvals" value={summary.pending} caption="Past draft and not yet published" to={basePath} />
          <StatCard icon={Calendar} title="Awaiting academic approval" value={summary.academicApproval} caption="Schedules at academic approval" to={`${basePath}?approvalStage=ACADEMIC_APPROVAL`} />
          <StatCard icon={CheckCircle2} title="Published schedules" value={summary.published} caption="Publication activity" to={`${basePath}?approvalStage=PUBLISHED`} />
        </div>
      )}
      <Panel title={audience === "department" ? "Recent department schedule changes" : "Recent schedule changes"} action={<TextLink to={basePath}>Open schedules</TextLink>}>
        <UpdateList
          items={recent}
          emptyTitle="No schedule changes yet"
          emptyDescription="Published versions and later drafts will appear here."
        />
      </Panel>
    </>
  );
};

export default WorkflowSummary;
