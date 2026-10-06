import React, { useEffect, useState } from "react";
import Button from "../common/Button";
import FormField from "../common/FormField";
import Input from "../common/Input";
import Select from "../common/Select";
import Textarea from "../common/Textarea";
import Modal from "../common/Modal";
import StatusBadge from "../common/StatusBadge";
import { scheduleWorkflowService } from "../../services/scheduleWorkflowService";

const STEPS = [
  ["DRAFT", "Draft"],
  ["EXAM_CELL_REVIEW", "Exam Cell Review"],
  ["DEPARTMENT_VERIFICATION", "Department Verification"],
  ["ACADEMIC_APPROVAL", "Academic Approval"],
  ["PUBLISHED", "Published"],
];

const managerRole = (role) => ["examination_cell", "super_admin", "admin"].includes(role);
const academicRole = (role) => ["super_admin", "admin"].includes(role);

const stageLabel = (value) => STEPS.find(([stage]) => stage === value)?.[1] || String(value || "").replace(/_/g, " ");
const actionLabel = (value) => String(value || "").replace(/_/g, " ");

const formatWhen = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" });
};

const ScheduleWorkflow = ({ scheduleId, role, sessions, rooms, onChanged }) => {
  const [approval, setApproval] = useState(null);
  const [versions, setVersions] = useState([]);
  const [detail, setDetail] = useState(null);
  const [compare, setCompare] = useState(null);
  const [fromVersion, setFromVersion] = useState("");
  const [toVersion, setToVersion] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [draftForm, setDraftForm] = useState(null);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reasonAction, setReasonAction] = useState("return");
  const [reason, setReason] = useState("");
  const [versionOpen, setVersionOpen] = useState(false);
  const [changeReason, setChangeReason] = useState("");
  const [impactOpen, setImpactOpen] = useState(false);
  const [impact, setImpact] = useState(null);
  const [impactChecked, setImpactChecked] = useState(false);

  const load = async () => {
    if (!scheduleId) return;
    setLoading(true);
    setError("");
    try {
      const [approvalBody, versionBody] = await Promise.all([
        scheduleWorkflowService.approval(scheduleId),
        scheduleWorkflowService.versions(scheduleId),
      ]);
      setApproval(approvalBody);
      const items = versionBody.items || [];
      setVersions(items);
      const current = items.find((item) => item.versionNumber === approvalBody.currentVersion) || items[items.length - 1];
      if (current) {
        const full = await scheduleWorkflowService.version(scheduleId, current.versionNumber);
        setDetail(full);
        setDraftForm(current.state === "draft" ? {
          date: current.snapshot?.date || "",
          session: current.snapshot?.session?.id || "",
          room: current.snapshot?.room?.id || "",
          reportingTime: current.snapshot?.reportingTime || "",
          operationalChange: current.snapshot?.operationalChange || "",
        } : null);
      } else {
        setDetail(null);
        setDraftForm(null);
      }
      if (items.length >= 2) {
        setFromVersion(String(items[items.length - 2].versionNumber));
        setToVersion(String(items[items.length - 1].versionNumber));
      }
    } catch (err) {
      setError(err.message || "Schedule workflow could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCompare(null);
    load();
  }, [scheduleId]);

  const run = async (task) => {
    setBusy(true);
    setError("");
    try {
      await task();
      await load();
      if (onChanged) onChanged();
    } catch (err) {
      setError(err.message || "The schedule workflow action was rejected.");
    } finally {
      setBusy(false);
    }
  };

  const stage = approval?.stage || "DRAFT";
  const draft = versions.find((item) => item.state === "draft");
  const published = versions.find((item) => item.state === "published");
  const canManage = managerRole(role);
  const locked = Boolean(approval?.locked);

  const saveDraft = () => run(async () => {
    await scheduleWorkflowService.updateVersion(scheduleId, draft.versionNumber, {
      date: draftForm.date,
      session: draftForm.session,
      room: draftForm.room,
      reportingTime: draftForm.reportingTime,
      operationalChange: draftForm.operationalChange,
    });
  });

  const openImpact = async () => {
    setBusy(true);
    setError("");
    setImpactChecked(false);
    try {
      const body = await scheduleWorkflowService.impact(scheduleId);
      setImpact(body);
      setImpactOpen(true);
    } catch (err) {
      setError(err.message || "Impact could not be loaded.");
    } finally {
      setBusy(false);
    }
  };

  if (!scheduleId) return null;
  if (loading) return <div className="admin-panel-card phase1-form"><p className="phase1-counts">Loading schedule workflow...</p></div>;

  return (
    <div className="admin-panel-card phase1-form workflow-panel">
      <h3>Schedule status</h3>
      <div className="workflow-steps" aria-label="Approval workflow">
        {STEPS.map(([value, label], index) => (
          <React.Fragment key={value}>
            {index > 0 && <span className="workflow-arrow" aria-hidden="true">↓</span>}
            <span className={`workflow-step ${stage === value ? "current" : ""}`} aria-current={stage === value ? "step" : undefined}>
              {label}
            </span>
          </React.Fragment>
        ))}
      </div>
      <div className="phase1-counts">
        <p>Current stage: {STEPS.find(([value]) => value === stage)?.[1] || stage} <StatusBadge status={approval?.status || "pending"} size="sm" /></p>
        <p>Current version: {approval?.currentVersion ? `v${approval.currentVersion}` : "Not created yet"}</p>
        <p>Next responsible: {approval?.nextActor || "Examination Cell"}</p>
        {approval?.latest && (
          <p>Latest action: {actionLabel(approval.latest.action)} {approval.latest.actor?.name ? `by ${approval.latest.actor.name}` : ""} {formatWhen(approval.latest.at)}</p>
        )}
        {locked && <p>This published schedule is locked. Create a new version to make changes.</p>}
      </div>
      {error && <p className="workflow-error">{error}</p>}
      <div className="workflow-actions">
        {canManage && stage === "DRAFT" && (
          <Button type="button" onClick={() => run(() => scheduleWorkflowService.submit(scheduleId))} isLoading={busy}>
            Submit for Exam Cell Review
          </Button>
        )}
        {canManage && stage === "EXAM_CELL_REVIEW" && (
          <Button type="button" onClick={() => run(() => scheduleWorkflowService.submit(scheduleId))} isLoading={busy}>
            Submit for Department Verification
          </Button>
        )}
        {role === "department_admin" && stage === "DEPARTMENT_VERIFICATION" && (
          <Button type="button" onClick={() => run(() => scheduleWorkflowService.verify(scheduleId))} isLoading={busy}>
            Verify
          </Button>
        )}
        {academicRole(role) && stage === "ACADEMIC_APPROVAL" && approval?.status !== "approved" && (
          <Button type="button" onClick={() => run(() => scheduleWorkflowService.approve(scheduleId))} isLoading={busy}>
            Approve
          </Button>
        )}
        {canManage && stage === "ACADEMIC_APPROVAL" && approval?.status === "approved" && (
          <Button type="button" onClick={openImpact} isLoading={busy}>Publish</Button>
        )}
        {canManage && locked && !draft && (
          <Button type="button" onClick={() => { setChangeReason(""); setVersionOpen(true); }}>
            Create New Version
          </Button>
        )}
        {((role === "department_admin" && stage === "DEPARTMENT_VERIFICATION")
          || (academicRole(role) && stage === "ACADEMIC_APPROVAL")
          || (canManage && stage === "EXAM_CELL_REVIEW")) && (
          <Button type="button" variant="outline" onClick={() => { setReason(""); setReasonAction("return"); setReasonOpen(true); }}>
            Return
          </Button>
        )}
      </div>

      {canManage && draft && draftForm && (
        <div className="workflow-edit">
          <h4>{locked ? `Edit draft v${draft.versionNumber}` : `Draft v${draft.versionNumber}`}</h4>
          <div className="phase1-grid">
            <FormField label="Date">
              <Input type="date" value={draftForm.date} onChange={(event) => setDraftForm({ ...draftForm, date: event.target.value })} />
            </FormField>
            <FormField label="Session">
              <Select
                value={draftForm.session}
                onChange={(event) => {
                  const session = (sessions || []).find((item) => item.id === event.target.value);
                  setDraftForm({
                    ...draftForm,
                    session: event.target.value,
                    reportingTime: session?.reportingTime || draftForm.reportingTime,
                  });
                }}
                options={(sessions || []).map((session) => ({ value: session.id, label: session.name }))}
                placeholder="Select session"
              />
            </FormField>
            <FormField label="Reporting time">
              <Input type="time" value={draftForm.reportingTime} onChange={(event) => setDraftForm({ ...draftForm, reportingTime: event.target.value })} />
            </FormField>
            <FormField label="Room">
              <Select
                value={draftForm.room}
                onChange={(event) => setDraftForm({ ...draftForm, room: event.target.value })}
                options={(rooms || []).map((room) => ({ value: room.id, label: `${room.roomNumber} · ${room.building}` }))}
                placeholder="Select room"
              />
            </FormField>
            <FormField label="Operational change">
              <Select
                value={draftForm.operationalChange}
                onChange={(event) => setDraftForm({ ...draftForm, operationalChange: event.target.value })}
                options={[
                  { value: "", label: "None" },
                  { value: "postponed", label: "Postponed" },
                  { value: "cancelled", label: "Cancelled" },
                ]}
                placeholder=""
              />
            </FormField>
          </div>
          <Button type="button" variant="outline" onClick={saveDraft} isLoading={busy}>Save draft version</Button>
        </div>
      )}

      <h4>Version history</h4>
      {versions.length === 0 ? (
        <p className="phase1-counts">No versions yet. Submitting the draft creates version 1.</p>
      ) : (
        <ul className="workflow-history">
          {versions.map((version) => (
            <li key={version.versionNumber}>
              <button type="button" className="workflow-version" onClick={() => scheduleWorkflowService.version(scheduleId, version.versionNumber).then(setDetail).catch((err) => setError(err.message))}>
                <strong>v{version.versionNumber}</strong>
                <StatusBadge status={version.state} size="sm" />
                <span>{version.state === "published" ? `Published ${formatWhen(version.publishedAt)}` : `Created ${formatWhen(version.createdAt)}`}</span>
                {version.publishedBy?.name && <span>Published by {version.publishedBy.name}</span>}
                {version.createdBy?.name && version.state !== "published" && <span>Created by {version.createdBy.name}</span>}
                {version.changeReason && <span>Reason: {version.changeReason}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {versions.length >= 2 && (
        <div className="workflow-edit">
          <h4>Compare versions</h4>
          <div className="phase1-grid">
            <FormField label="From">
              <Select value={fromVersion} onChange={(event) => setFromVersion(event.target.value)} options={versions.map((version) => ({ value: String(version.versionNumber), label: `v${version.versionNumber}` }))} placeholder="Version" />
            </FormField>
            <FormField label="To">
              <Select value={toVersion} onChange={(event) => setToVersion(event.target.value)} options={versions.map((version) => ({ value: String(version.versionNumber), label: `v${version.versionNumber}` }))} placeholder="Version" />
            </FormField>
          </div>
          <Button type="button" variant="outline" onClick={() => run(async () => {
            const body = await scheduleWorkflowService.compare(scheduleId, fromVersion, toVersion);
            setCompare(body);
          })}>Compare</Button>
          {compare && (
            compare.changes?.length ? (
              <div className="workflow-diffs">
                {compare.changes.map((change) => (
                  <p key={change.field} className="workflow-compare">
                    <span>{change.label}</span>
                    <span>{change.from || "—"}</span>
                    <span>→</span>
                    <span>{change.to || "—"}</span>
                  </p>
                ))}
              </div>
            ) : <p className="phase1-counts">No fields changed.</p>
          )}
        </div>
      )}

      {detail && (
        <div className="workflow-edit">
          <h4>Version v{detail.versionNumber}</h4>
          <div className="phase1-counts">
            <p>State: {detail.state}</p>
            <p>Approval stage: {stageLabel(detail.approvalStage || stage)}</p>
            <p>Created by: {detail.createdBy?.name || "Unknown"} on {formatWhen(detail.createdAt)}</p>
            {detail.publishedAt && <p>Published: {formatWhen(detail.publishedAt)} {detail.publishedBy?.name ? `by ${detail.publishedBy.name}` : ""}</p>}
            {detail.changeReason && <p>Change reason: {detail.changeReason}</p>}
            {detail.changeSummary && <p>Change summary: {detail.changeSummary}</p>}
            {detail.snapshot && (
              <>
                <p>Date: {detail.snapshot.date || "—"}</p>
                <p>Session: {detail.snapshot.session?.name || "—"} {detail.snapshot.session?.startTime}–{detail.snapshot.session?.endTime}</p>
                <p>Reporting time: {detail.snapshot.reportingTime || "—"}</p>
                <p>Room: {detail.snapshot.room ? `${detail.snapshot.room.roomNumber} · ${detail.snapshot.room.building}` : "—"}</p>
                <p>Subject: {detail.snapshot.subject?.name || "—"}</p>
                <p>Eligible students: {detail.snapshot.eligibleStudents ?? 0}</p>
                <p>Department: {detail.snapshot.department?.name || detail.snapshot.subject?.departmentName || "—"}</p>
              </>
            )}
            {detail.affected && <p>Affected at publication: {detail.affected.students} students, {detail.affected.faculty} faculty, {detail.affected.departments} departments</p>}
          </div>
          <h4>Approval history</h4>
          {(detail.approvalHistory || approval?.history || []).length === 0 ? (
            <p className="phase1-counts">No approval actions yet.</p>
          ) : (
            <ul className="workflow-history">
              {(detail.approvalHistory || []).map((entry, index) => (
                <li key={`${entry.action}-${index}`}>
                  {actionLabel(entry.action)} · {stageLabel(entry.toStage || entry.stage)} · {entry.actor?.name || "System"} · {formatWhen(entry.at)}
                  {entry.reason ? ` · ${entry.reason}` : ""}
                </li>
              ))}
            </ul>
          )}
          <h4>Audit history</h4>
          {(detail.audit || []).length === 0 ? (
            <p className="phase1-counts">No audit entries for this version yet.</p>
          ) : (
            <ul className="workflow-history">
              {detail.audit.map((entry, index) => (
                <li key={`${entry.action}-${index}`}>{entry.action} · {entry.actor?.name || "System"} · {formatWhen(entry.at)} · {entry.description}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {published && <p className="phase1-counts">Published version: v{published.versionNumber}. Archived versions stay in the history above.</p>}

      <Modal
        isOpen={reasonOpen}
        onClose={() => setReasonOpen(false)}
        title="Return schedule"
        footer={(
          <div className="workflow-actions">
            <Button variant="outline" onClick={() => setReasonOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                setReasonOpen(false);
                run(() => scheduleWorkflowService.returnStage(scheduleId, { action: reasonAction, reason }));
              }}
              disabled={reason.trim().length < 5}
            >
              Confirm
            </Button>
          </div>
        )}
      >
        <FormField label="Action">
          <Select
            value={reasonAction}
            onChange={(event) => setReasonAction(event.target.value)}
            options={[{ value: "return", label: "Return" }, { value: "reject", label: "Reject" }]}
            placeholder="Return"
          />
        </FormField>
        <FormField label="Reason" required>
          <Textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain what must change" />
        </FormField>
      </Modal>

      <Modal
        isOpen={versionOpen}
        onClose={() => setVersionOpen(false)}
        title="Create new version"
        footer={(
          <div className="workflow-actions">
            <Button variant="outline" onClick={() => setVersionOpen(false)}>Cancel</Button>
            <Button
              disabled={changeReason.trim().length < 5}
              onClick={() => {
                setVersionOpen(false);
                run(() => scheduleWorkflowService.newVersion(scheduleId, changeReason.trim()));
              }}
            >
              Create version
            </Button>
          </div>
        )}
      >
        <FormField label="Change reason" required helperText="Required for every version created after publication.">
          <Textarea rows={3} value={changeReason} onChange={(event) => setChangeReason(event.target.value)} placeholder="Room unavailable" />
        </FormField>
      </Modal>

      <Modal
        isOpen={impactOpen}
        onClose={() => setImpactOpen(false)}
        title="Schedule change impact"
        size="lg"
        footer={(
          <div className="workflow-actions">
            <Button variant="outline" onClick={() => setImpactOpen(false)}>Cancel</Button>
            <Button
              disabled={!impactChecked}
              onClick={() => {
                setImpactOpen(false);
                run(() => scheduleWorkflowService.publish(scheduleId));
              }}
            >
              Publish
            </Button>
          </div>
        )}
      >
        {impact && (
          <div className="phase1-counts">
            <p>Affected students: {impact.students}</p>
            <p>Affected invigilators: {impact.faculty}</p>
            <p>Affected departments: {impact.departments}{(impact.departmentNames || []).length ? ` (${impact.departmentNames.join(", ")})` : ""}</p>
            {(impact.changes || []).length === 0 ? <p>No field changes from the previous published version.</p> : impact.changes.map((change) => (
              <p key={change.field}>{change.label}: {change.from || "—"} → {change.to || "—"}</p>
            ))}
            {(impact.limitations || []).map((item) => <p key={item}>{item}</p>)}
            <label className="phase1-check">
              <input type="checkbox" checked={impactChecked} onChange={(event) => setImpactChecked(event.target.checked)} />
              I have reviewed this impact
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ScheduleWorkflow;
