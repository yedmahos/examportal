import React, { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import FormField from "../../components/common/FormField";
import Input from "../../components/common/Input";
import Select from "../../components/common/Select";
import DataTable from "../../components/common/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import ErrorState from "../../components/common/ErrorState";
import { useToast } from "../../components/common/Toast";
import { useAuth } from "../../context/AuthContext";
import { canAccess } from "../../utils/roles";
import { examService } from "../../services/examService";
import {
  subjectService,
  sessionService,
  roomService,
  scheduleService,
  eligibilityService,
  conflictService,
} from "../../services/resourceService";
import "./AdminPages.css";

const emptyForm = () => ({
  examination: "",
  subject: "",
  date: "",
  session: "",
  duration: "",
  reportingTime: "",
  room: "",
  status: "scheduled",
});

const SchedulesPage = () => {
  const { role } = useAuth();
  const canSave = canAccess(role, ["examination_cell", "super_admin"]);
  const { showToast } = useToast();
  const [form, setForm] = useState(emptyForm());
  const [examinations, setExaminations] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [conflicts, setConflicts] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadLists = async () => {
    const [examRes, subjectRes, sessionRes, roomRes] = await Promise.all([
      examService.getAll({ limit: 100 }),
      subjectService.list({ limit: 100, status: "active" }),
      sessionService.list({ limit: 100, status: "active" }),
      roomService.list({ limit: 100, status: "active" }),
    ]);
    setExaminations(examRes.data.items);
    setSubjects(subjectRes.data.items);
    setSessions(sessionRes.data.items);
    setRooms(roomRes.data.items);
  };

  const loadSchedules = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await scheduleService.list({ limit: 20 });
      setItems(response.data.items);
    } catch (err) {
      setError(err.message || "Failed to load schedules");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLists().catch(() => {});
    loadSchedules();
  }, []);

  const payload = () => ({
    examination: form.examination,
    subject: form.subject,
    date: form.date,
    session: form.session,
    duration: form.duration || undefined,
    reportingTime: form.reportingTime || undefined,
    room: form.room || undefined,
    status: form.status,
  });

  const previewEligibility = async () => {
    if (!form.examination || !form.subject) {
      showToast("Select an examination and subject", "error");
      return;
    }
    try {
      const response = await eligibilityService.list({
        examination: form.examination,
        subject: form.subject,
        limit: 1,
      });
      const counts = response.data.counts || {};
      setPreview((counts.eligible || 0) + (counts.registered || 0));
    } catch (err) {
      showToast(err.message || "Could not load eligibility", "error");
    }
  };

  const checkConflicts = async () => {
    try {
      const response = await conflictService.check(payload());
      setConflicts(response);
      if (response.hasConflict) {
        showToast("Conflicts found", response.conflicts?.some((item) => item.severity === "blocking") ? "error" : "info");
      } else {
        showToast("No conflicts", "success");
      }
    } catch (err) {
      showToast(err.message || "Conflict check failed", "error");
    }
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await scheduleService.create(payload());
      setConflicts(response.raw);
      showToast(response.message || "Schedule saved", "success");
      setForm(emptyForm());
      loadSchedules();
    } catch (err) {
      if (err.response?.conflicts) setConflicts(err.response);
      showToast(err.message || "Schedule was not saved", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Schedules" subtitle="Manual scheduling with server-side conflict and room checks" />
      {canSave && (
        <form className="admin-panel-card phase1-form" onSubmit={save}>
          <div className="phase1-grid">
            <FormField label="Examination" required>
              <Select value={form.examination} onChange={(e) => setForm({ ...form, examination: e.target.value })} options={examinations.map((item) => ({ value: item.id, label: item.title }))} placeholder="Select examination" />
            </FormField>
            <FormField label="Subject" required>
              <Select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} options={subjects.map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` }))} placeholder="Select subject" />
            </FormField>
            <FormField label="Date" required>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </FormField>
            <FormField label="Session" required>
              <Select value={form.session} onChange={(e) => setForm({ ...form, session: e.target.value })} options={sessions.map((item) => ({ value: item.id, label: `${item.name} ${item.startTime}-${item.endTime}` }))} placeholder="Select session" />
            </FormField>
            <FormField label="Duration (minutes)">
              <Input type="number" min="1" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="Subject or session duration" />
            </FormField>
            <FormField label="Reporting time">
              <Input type="time" value={form.reportingTime} onChange={(e) => setForm({ ...form, reportingTime: e.target.value })} />
            </FormField>
            <FormField label="Room">
              <Select value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} options={rooms.map((item) => ({ value: item.id, label: `${item.building} ${item.roomNumber} (${item.capacity})` }))} placeholder="Select room" />
            </FormField>
            <FormField label="Status">
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={[{ value: "scheduled", label: "Scheduled" }, { value: "draft", label: "Draft" }]} placeholder="" />
            </FormField>
          </div>
          <div className="toolbar-selects-group">
            <Button type="button" variant="outline" onClick={previewEligibility}>Eligibility preview</Button>
            <Button type="button" variant="outline" onClick={checkConflicts}>Conflict check</Button>
            <Button type="submit" isLoading={saving}>Save schedule</Button>
          </div>
          {preview !== null && <p className="phase1-counts">Eligible or registered students: {preview}</p>}
          {conflicts?.conflicts?.length > 0 && (
            <ul className="phase1-conflicts">
              {conflicts.conflicts.map((conflict, index) => (
                <li key={`${conflict.type}-${index}`}>
                  <StatusBadge status={conflict.severity} size="sm" />
                  <span>{conflict.type}: {conflict.message}</span>
                </li>
              ))}
            </ul>
          )}
        </form>
      )}
      {error ? <ErrorState message={error} onRetry={loadSchedules} /> : (
        <div className="admin-table-panel">
          <DataTable
            isLoading={isLoading}
            data={items}
            emptyTitle="No schedules"
            emptyDescription="Saved schedules appear here."
            columns={[
              { title: "Examination", key: "examination", render: (value) => value?.title || "N/A" },
              { title: "Subject", key: "subject", render: (value) => value?.name || "N/A" },
              { title: "Date", key: "date", render: (value) => value ? new Date(value).toLocaleDateString("en-GB") : "N/A" },
              { title: "Session", key: "session", render: (value) => value?.name || "N/A" },
              { title: "Room", key: "room", render: (value) => value ? `${value.building} ${value.roomNumber}` : "N/A" },
              { title: "Students", key: "eligibleStudents", render: (value) => Array.isArray(value) ? value.length : 0 },
              { title: "Status", key: "status", render: (value) => <StatusBadge status={value} size="sm" /> },
              { title: "Warnings", key: "warnings", render: (value) => Array.isArray(value) && value.length ? value.length : "None" },
            ]}
          />
        </div>
      )}
    </div>
  );
};

export default SchedulesPage;
