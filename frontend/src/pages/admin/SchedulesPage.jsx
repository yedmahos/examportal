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
  roomAllocationService,
  seatingService,
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
  const schedulable = eligibility.eligible.length + eligibility.registered.length;

  return (
    <div>
      <p className="phase1-counts">
        Schedulable students: {schedulable}. Eligible {eligibility.eligible.length}. Registered {eligibility.registered.length}. Blocked {eligibility.blocked.length}.
      </p>
      {schedulable === 0 && (
        <p className="phase1-counts">
          No eligible students found for this examination and subject.
          {eligibility.blocked.length
            ? " Blocked students are listed with the reason they cannot sit this paper."
            : " Enroll the batch and register students for this subject before scheduling it."}
          {" "}A scheduled paper is not saved until at least one student is eligible or registered.
        </p>
      )}
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

const seatingRoomsActive = (view, roomView) => {
  const rooms = view?.rooms || [];
  if (rooms.some((room) => String(room.id || room.room) === String(roomView))) {
    return String(roomView);
  }
  return String(rooms[0]?.id || rooms[0]?.room || "");
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
  const canSeat = canAccess(role, ["examination_cell", "super_admin", "department_admin"]);
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
  const [allocationSchedule, setAllocationSchedule] = useState("");
  const [allocationPreview, setAllocationPreview] = useState(null);
  const [allocating, setAllocating] = useState(false);
  const [seatingSchedule, setSeatingSchedule] = useState("");
  const [seatingStrategy, setSeatingStrategy] = useState("ROLL_NUMBER");
  const [seatingPreview, setSeatingPreview] = useState(null);
  const [savedSeating, setSavedSeating] = useState(null);
  const [seatingBusy, setSeatingBusy] = useState(false);
  const [roomView, setRoomView] = useState("");

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

    const loadEligibility = async () => {
      if (canSave) {
        await eligibilityService.calculate({
          examination: form.examination,
          subject: form.subject,
        });
      }
      const response = await eligibilityService.list({
        examination: form.examination,
        subject: form.subject,
        limit: 100,
      });
      if (cancelled) return;
      const rows = response.data.items || [];
      setEligibility({
        eligible: rows.filter((row) => row.eligibilityStatus === "eligible"),
        registered: rows.filter((row) => row.eligibilityStatus === "registered"),
        blocked: rows.filter((row) => row.eligibilityStatus === "blocked"),
      });
    };

    loadEligibility().catch((err) => {
      if (!cancelled) setEligibilityError(err.message || "Could not load eligibility");
    }).finally(() => {
      if (!cancelled) setEligibilityLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [form.examination, form.subject, canSave]);

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

  const previewAllocation = async () => {
    if (!allocationSchedule) return;
    setAllocating(true);
    try {
      const response = await roomAllocationService.preview(allocationSchedule);
      setAllocationPreview(response);
    } catch (err) {
      setAllocationPreview(null);
      showToast(err.message || "Allocation preview failed", "error");
    } finally {
      setAllocating(false);
    }
  };

  useEffect(() => {
    if (!seatingSchedule) {
      setSavedSeating(null);
      setSeatingPreview(null);
      return undefined;
    }

    let active = true;
    seatingService.forSchedule(seatingSchedule)
      .then((plan) => { if (active) setSavedSeating(plan); })
      .catch(() => { if (active) setSavedSeating(null); });
    return () => { active = false; };
  }, [seatingSchedule]);

  const seatingView = seatingPreview || savedSeating;
  const seatingExists = Boolean(seatingPreview?.existing || savedSeating?.item);

  const previewSeating = async () => {
    if (!seatingSchedule) return;
    setSeatingBusy(true);
    try {
      const response = await seatingService.preview(seatingSchedule, seatingStrategy);
      setSeatingPreview(response);
    } catch (err) {
      setSeatingPreview(null);
      showToast(err.message || "Seating preview failed", "error");
    } finally {
      setSeatingBusy(false);
    }
  };

  const confirmSeating = async () => {
    if (!seatingSchedule || !seatingPreview?.ok || seatingPreview.existing) return;
    setSeatingBusy(true);
    try {
      const response = await seatingService.confirm(seatingSchedule, seatingStrategy);
      setSeatingPreview(null);
      setSavedSeating(response);
      showToast(response.message || "Seating plan saved", "success");
    } catch (err) {
      showToast(err.message || "Seating plan was not saved", "error");
    } finally {
      setSeatingBusy(false);
    }
  };

  const regenerateSeating = async () => {
    if (!seatingSchedule || !seatingExists) return;
    setSeatingBusy(true);
    try {
      const response = await seatingService.regenerate(seatingSchedule, seatingStrategy);
      setSeatingPreview(null);
      setSavedSeating(response);
      showToast(response.message || "Seating plan regenerated", "success");
    } catch (err) {
      showToast(err.message || "Seating plan was not regenerated", "error");
    } finally {
      setSeatingBusy(false);
    }
  };

  const confirmAllocation = async () => {
    if (!allocationSchedule || !allocationPreview?.ok) return;
    setAllocating(true);
    try {
      const response = await roomAllocationService.confirm(allocationSchedule);
      setAllocationPreview(response);
      showToast(response.message || "Rooms allocated", "success");
      loadSchedules();
    } catch (err) {
      showToast(err.message || "Rooms were not allocated", "error");
    } finally {
      setAllocating(false);
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
            <FormField label="Room" helperText="Manual allocation. Automatic allocation will not replace a saved room.">
              <Select value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} options={rooms.map((item) => ({ value: item.id, label: `${item.building} ${item.roomNumber} (${item.capacity})` }))} placeholder="Select room" />
            </FormField>
            <FormField label="Status">
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={[{ value: "scheduled", label: "Scheduled" }, { value: "draft", label: "Draft" }]} placeholder="" />
            </FormField>
          </div>
          <div className="toolbar-selects-group">
            <Button type="button" variant="outline" onClick={checkConflicts}>Conflict check</Button>
            <Button
              type="submit"
              isLoading={saving}
              disabled={form.status === "scheduled" && eligibility !== null && (eligibility.eligible.length + eligibility.registered.length) === 0}
            >
              Save schedule
            </Button>
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
      {canSave && (
        <div className="admin-panel-card phase1-form">
          <FormField label="Automatic room allocation" helperText="Preview uses the schedule's current eligible students and does not change a manual room.">
            <Select
              value={allocationSchedule}
              onChange={(e) => {
                setAllocationSchedule(e.target.value);
                setAllocationPreview(null);
              }}
              options={items.map((item) => ({
                value: item.id,
                label: `${item.examination?.title || "Examination"} · ${item.subject?.name || "Subject"} · ${item.date ? new Date(item.date).toLocaleDateString("en-GB") : "No date"}`,
              }))}
              placeholder="Select a saved schedule"
            />
          </FormField>
          <div className="toolbar-selects-group">
            <Button type="button" variant="outline" onClick={previewAllocation} isLoading={allocating} disabled={!allocationSchedule}>
              Preview allocation
            </Button>
            <Button type="button" onClick={confirmAllocation} disabled={!allocationPreview?.ok || allocating}>
              Confirm allocation
            </Button>
          </div>
          {allocationPreview && (
            <div className="phase1-counts">
              <p>Students: {allocationPreview.students ?? 0}</p>
              <p>Rooms: {(allocationPreview.rooms || []).map((room) => room.label || `${room.building || ""} ${room.roomNumber || ""}`.trim()).filter(Boolean).join(", ") || "None"}</p>
              <p>Capacity: {allocationPreview.capacity ?? 0}</p>
              <p>Allocated: {allocationPreview.allocated ?? 0}</p>
              <p>Unused: {allocationPreview.unused ?? 0}</p>
              <p>Conflicts: {(allocationPreview.conflicts || []).length ? allocationPreview.conflicts.map((conflict) => conflict.message).join("; ") : "None"}</p>
              <p>Status: {allocationPreview.status || allocationPreview.message}</p>
            </div>
          )}
        </div>
      )}
      {canSeat && (
        <div className="admin-panel-card phase1-form">
          <FormField label="Generate Seating Plan" helperText="Seating uses the confirmed rooms and the schedule's eligible students. It does not allocate new rooms.">
            <Select
              value={seatingSchedule}
              onChange={(e) => {
                setSeatingSchedule(e.target.value);
                setSeatingPreview(null);
                setRoomView("");
              }}
              options={items.map((item) => ({
                value: item.id,
                label: `${item.examination?.title || "Examination"} · ${item.subject?.name || "Subject"} · ${item.date ? new Date(item.date).toLocaleDateString("en-GB") : "No date"}`,
              }))}
              placeholder="Select a saved schedule"
            />
          </FormField>
          <FormField label="Strategy">
            <Select
              value={seatingStrategy}
              onChange={(e) => setSeatingStrategy(e.target.value)}
              options={[
                { value: "ROLL_NUMBER", label: "Roll Number" },
                { value: "RANDOM", label: "Random" },
                { value: "SECTION", label: "Section" },
                { value: "ALTERNATE", label: "Alternate" },
                { value: "ANTI_COPY", label: "Anti-Copy" },
              ]}
              placeholder="Select strategy"
            />
          </FormField>
          <div className="toolbar-selects-group">
            <Button type="button" variant="outline" onClick={previewSeating} isLoading={seatingBusy} disabled={!seatingSchedule}>
              Generate Seating Plan
            </Button>
            <Button type="button" onClick={confirmSeating} disabled={!seatingPreview?.ok || seatingPreview.existing || seatingBusy}>
              Confirm seating
            </Button>
            <Button type="button" variant="outline" onClick={regenerateSeating} disabled={!seatingExists || seatingBusy}>
              Regenerate
            </Button>
          </div>
          {(seatingPreview || savedSeating) && (
            <div className="phase1-counts">
              <p>{seatingPreview?.message || (savedSeating ? "Seating plan already exists." : "")}</p>
              <p>Total Students: {seatingView?.students ?? 0}</p>
              <p>Rooms: {(seatingView?.rooms || []).length}</p>
              <p>Seats Assigned: {seatingView?.seatsAssigned ?? 0}</p>
              {(seatingView?.rooms || []).map((room) => (
                <p key={room.id || room.room}>{room.label}: {room.assigned} / {room.quota}</p>
              ))}
              {(seatingView?.limitations || []).map((limitation) => (
                <p key={limitation}>{limitation}</p>
              ))}
            </div>
          )}
          {seatingView?.rows?.length > 0 && (
            <>
              <DataTable
                data={seatingView.rows}
                emptyTitle="No seats"
                emptyDescription="Generate a seating plan to preview seats."
                columns={[
                  { title: "Student", key: "student" },
                  { title: "Roll No", key: "rollNumber" },
                  { title: "Section", key: "section", render: (value) => value || "—" },
                  { title: "Room", key: "room" },
                  { title: "Seat", key: "seat" },
                ]}
              />
              <FormField label="Room view">
                <Select
                  value={seatingRoomsActive(seatingView, roomView)}
                  onChange={(e) => setRoomView(e.target.value)}
                  options={(seatingView.rooms || []).map((room) => ({
                    value: String(room.id || room.room),
                    label: room.label,
                  }))}
                  placeholder="Select room"
                />
              </FormField>
              <DataTable
                data={(seatingView.rows || []).filter((row) => String(row.roomId) === seatingRoomsActive(seatingView, roomView))}
                emptyTitle="No seats in this room"
                emptyDescription="This room has no assigned seats."
                columns={[
                  { title: "Seat", key: "seat" },
                  { title: "Student", key: "student" },
                  { title: "Roll No", key: "rollNumber" },
                  { title: "Section", key: "section", render: (value) => value || "—" },
                ]}
              />
            </>
          )}
        </div>
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
              {
                title: "Room",
                key: "room",
                render: (value, row) => {
                  if (value?.roomNumber) return `${value.building} ${value.roomNumber}`;
                  const labels = (row.allocations || [])
                    .map((allocation) => allocation.room ? `${allocation.room.building} ${allocation.room.roomNumber}` : "")
                    .filter(Boolean);
                  return labels.length ? labels.join(", ") : "N/A";
                },
              },
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
