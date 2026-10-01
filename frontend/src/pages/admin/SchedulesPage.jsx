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

const EligibilityPreview = ({ loading, error, eligibility, ready, studentLabel }) => {
  if (!ready) {
    return <p className="phase1-counts">Select an examination and subject to preview eligibility.</p>;
  }

  if (loading) {
    return <p className="phase1-counts">Loading eligibility...</p>;
  }

  if (error) {
    return <p className="phase1-counts">{error}</p>;
  }

  if (!eligibility) return null;

  const groups = [
    ["Eligible", eligibility.eligible, false],
    ["Registered", eligibility.registered, false],
    ["Blocked", eligibility.blocked, true],
  ];
  const total = groups.reduce((sum, [, rows]) => sum + rows.length, 0);

  return (
    <div>
      {total === 0 && <p className="phase1-counts">No eligibility records for this examination and subject.</p>}
      <div className="phase1-eligibility">
      {groups.map(([title, rows, showReason]) => (
        <section key={title} className="phase1-eligibility-group">
          <h4>{title}</h4>
          {rows.length === 0 ? (
            <p>None</p>
          ) : (
            <ul>
              {rows.map((row) => (
                <li key={row.id || row._id}>
                  <span>{studentLabel(row)}</span>
                  {showReason && <small>{row.reason || "No reason recorded"}</small>}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
      </div>
    </div>
  );
};

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
  const [subjectNote, setSubjectNote] = useState("");
  const [sessions, setSessions] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [eligibility, setEligibility] = useState(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [eligibilityError, setEligibilityError] = useState("");
  const [conflicts, setConflicts] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadLists = async () => {
    const [examRes, sessionRes, roomRes] = await Promise.all([
      examService.getAll({ limit: 100 }),
      sessionService.list({ limit: 100, status: "active" }),
      roomService.list({ limit: 100, status: "active" }),
    ]);
    setExaminations(examRes.data.items);
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

  const selectedExamination = examinations.find((item) => item.id === form.examination);

  useEffect(() => {
    let cancelled = false;

    const loadSubjects = async () => {
      if (!form.examination) {
        setSubjects([]);
        setSubjectNote("");
        return;
      }

      if (!selectedExamination) {
        return;
      }

      const programRef = selectedExamination.programRef;
      const programId = typeof programRef === "string"
        ? programRef
        : (programRef?.id || programRef?._id || "");
      const semester = selectedExamination.semester;

      if (!programId || !semester) {
        if (!cancelled) {
          setSubjects([]);
          setSubjectNote("This examination has no program and semester, so subjects cannot be matched.");
          setForm((current) => ({ ...current, subject: "", duration: "" }));
        }
        return;
      }

      try {
        const response = await subjectService.list({
          program: programId,
          semester,
          status: "active",
          limit: 100,
        });
        if (cancelled) return;

        const nextSubjects = response.data.items || [];
        setSubjects(nextSubjects);
        setSubjectNote(nextSubjects.length ? "" : "No active subjects match this examination.");
        setForm((current) => {
          const match = nextSubjects.find((item) => item.id === current.subject);
          if (match) {
            return {
              ...current,
              duration: typeof match.duration === "number" ? String(match.duration) : "",
            };
          }
          return { ...current, subject: "", duration: "" };
        });
      } catch (err) {
        if (!cancelled) {
          setSubjects([]);
          setSubjectNote(err.message || "Failed to load subjects");
        }
      }
    };

    loadSubjects();
    return () => {
      cancelled = true;
    };
  }, [form.examination, selectedExamination?.programRef, selectedExamination?.semester]);

  useEffect(() => {
    let cancelled = false;

    if (!form.examination || !form.subject) {
      setEligibility(null);
      setEligibilityError("");
      setEligibilityLoading(false);
      return undefined;
    }

    setEligibility(null);
    setEligibilityLoading(true);
    setEligibilityError("");

    eligibilityService.list({
      examination: form.examination,
      subject: form.subject,
      limit: 100,
    }).then((response) => {
      if (cancelled) return;
      const rows = response.data.items || [];
      setEligibility({
        eligible: rows.filter((row) => row.eligibilityStatus === "eligible"),
        registered: rows.filter((row) => row.eligibilityStatus === "registered"),
        blocked: rows.filter((row) => row.eligibilityStatus === "blocked"),
      });
    }).catch((err) => {
      if (!cancelled) setEligibilityError(err.message || "Could not load eligibility");
    }).finally(() => {
      if (!cancelled) setEligibilityLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [form.examination, form.subject]);

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

  const onExaminationChange = (examinationId) => {
    setConflicts(null);
    setForm((current) => ({
      ...current,
      examination: examinationId,
      subject: "",
      duration: "",
    }));
  };

  const onSubjectChange = (subjectId) => {
    const subject = subjects.find((item) => item.id === subjectId);
    setConflicts(null);
    setForm((current) => ({
      ...current,
      subject: subjectId,
      duration: typeof subject?.duration === "number" ? String(subject.duration) : "",
    }));
  };

  const onSessionChange = (sessionId) => {
    const session = sessions.find((item) => item.id === sessionId);
    setForm((current) => ({
      ...current,
      session: sessionId,
      reportingTime: session?.reportingTime || "",
    }));
  };

  const studentLabel = (row) => {
    const name = row.student?.name || "N/A";
    const studentId = row.student?.studentId;
    return studentId ? `${studentId} · ${name}` : name;
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
              <Select value={form.examination} onChange={(e) => onExaminationChange(e.target.value)} options={examinations.map((item) => ({ value: item.id, label: item.title }))} placeholder="Select examination" />
            </FormField>
            <FormField label="Subject" required helperText={subjectNote || "Subjects for the selected examination program and semester"}>
              <Select
                value={form.subject}
                onChange={(e) => onSubjectChange(e.target.value)}
                options={subjects.map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` }))}
                placeholder={form.examination ? "Select subject" : "Select an examination first"}
                disabled={!form.examination}
              />
            </FormField>
            <FormField label="Date" required>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </FormField>
            <FormField label="Session" required>
              <Select value={form.session} onChange={(e) => onSessionChange(e.target.value)} options={sessions.map((item) => ({ value: item.id, label: `${item.name} ${item.startTime}-${item.endTime}` }))} placeholder="Select session" />
            </FormField>
            <FormField label="Duration (minutes)" helperText="From the selected subject">
              <Input type="number" readOnly value={form.duration} placeholder="No duration on this subject" />
            </FormField>
            <FormField label="Reporting time" helperText="From the selected session">
              <Input type="time" readOnly value={form.reportingTime} />
            </FormField>
            <FormField label="Room">
              <Select value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} options={rooms.map((item) => ({ value: item.id, label: `${item.building} ${item.roomNumber} (${item.capacity})` }))} placeholder="Select room" />
            </FormField>
            <FormField label="Status">
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={[{ value: "scheduled", label: "Scheduled" }, { value: "draft", label: "Draft" }]} placeholder="" />
            </FormField>
          </div>
          <div className="toolbar-selects-group">
            <Button type="button" variant="outline" onClick={checkConflicts}>Conflict check</Button>
            <Button type="submit" isLoading={saving}>Save schedule</Button>
          </div>
          <EligibilityPreview
            loading={eligibilityLoading}
            error={eligibilityError}
            eligibility={eligibility}
            ready={Boolean(form.examination && form.subject)}
            studentLabel={studentLabel}
          />
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
