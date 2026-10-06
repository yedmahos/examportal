import React, { useEffect, useState } from "react";
import { invigilationService } from "../../services/invigilationService";
import { scheduleService } from "../../services/resourceService";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/common/PageHeader";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import Button from "../../components/common/Button";
import FormField from "../../components/common/FormField";
import Select from "../../components/common/Select";
import { formatWhen } from "../../components/dashboard/RoleSections";
import "../admin/AdminPages.css";

const reasonText = (reasons = []) => reasons.map((item) => item.message).filter(Boolean).join(" ");

const InvigilationPage = () => {
  const { role } = useAuth();
  const readOnly = role === "department_admin";
  const [schedules, setSchedules] = useState([]);
  const [scheduleId, setScheduleId] = useState("");
  const [board, setBoard] = useState(null);
  const [choices, setChoices] = useState({});
  const [workload, setWorkload] = useState([]);
  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadBoard = async (id) => {
    if (!id) {
      setBoard(null);
      return;
    }
    const response = await invigilationService.board(id);
    setBoard(response);
    const next = {};
    (response.rooms || []).forEach((row) => {
      const current = row.assignment?.faculty?._id;
      const firstOpen = (row.candidates || []).find((candidate) => candidate.ok);
      next[row.room._id] = current || firstOpen?._id || "";
    });
    setChoices(next);
  };

  const load = async (selected = scheduleId) => {
    setIsLoading(true);
    setError("");
    try {
      const [scheduleResponse, workloadResponse] = await Promise.all([
        scheduleService.list({ limit: 50 }),
        invigilationService.workload(),
      ]);
      const items = scheduleResponse.data?.items || [];
      setSchedules(items);
      setWorkload(workloadResponse.items || []);
      const id = selected || items[0]?.id || "";
      setScheduleId(id);
      await loadBoard(id);
    } catch (err) {
      setError(err.message || "Invigilation could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onSchedule = async (id) => {
    setScheduleId(id);
    setPreview(null);
    setNotice("");
    try {
      await loadBoard(id);
    } catch (err) {
      setNotice(err.message || "This schedule could not be opened.");
    }
  };

  const assign = async (roomId, dutyId) => {
    setNotice("");
    const faculty = choices[roomId];
    try {
      if (dutyId) {
        await invigilationService.update(dutyId, { faculty });
        setNotice("Faculty reassigned.");
      } else {
        await invigilationService.assign({ schedule: scheduleId, room: roomId, faculty });
        setNotice("Faculty assigned.");
      }
      await load(scheduleId);
    } catch (err) {
      setNotice(err.response?.reasons?.[0]?.message || err.message);
    }
  };

  const remove = async (dutyId) => {
    setNotice("");
    try {
      await invigilationService.remove(dutyId);
      setNotice("Duty cancelled.");
      await load(scheduleId);
    } catch (err) {
      setNotice(err.message);
    }
  };

  const generate = async () => {
    setNotice("");
    try {
      const response = await invigilationService.generate({ schedule: scheduleId });
      setPreview(response);
    } catch (err) {
      setNotice(err.message);
    }
  };

  const confirmPreview = async () => {
    const assignments = (preview?.rows || [])
      .filter((row) => row.faculty?._id && row.room?._id)
      .map((row) => ({ room: row.room._id, faculty: row.faculty._id }));
    if (!assignments.length) return;
    setNotice("");
    try {
      await invigilationService.confirm({ schedule: scheduleId, assignments });
      setPreview(null);
      setNotice("Recommended duties assigned.");
      await load(scheduleId);
    } catch (err) {
      setNotice(err.response?.reasons?.[0]?.message || err.message);
      setPreview(null);
    }
  };

  if (isLoading) return <LoadingState message="Loading invigilation..." />;
  if (error) return <ErrorState message={error} onRetry={() => load()} />;

  return (
    <div className="admin-dashboard-page animate-fade-in">
      <PageHeader
        title="Invigilation"
        subtitle={readOnly ? "Department review of assigned duties" : "Assign faculty to examination rooms"}
      />
      <section className="admin-panel-card">
        <FormField label="Schedule">
          <Select
            value={scheduleId}
            placeholder="Select a schedule"
            onChange={(event) => onSchedule(event.target.value)}
            options={schedules.map((item) => ({
              value: item.id,
              label: `${item.examination?.title || "Examination"} · ${item.subject?.name || "Subject"} · ${formatWhen(item.date)} · ${item.session?.name || ""} · ${item.status}`,
            }))}
          />
        </FormField>
        {notice ? <p className="phase1-counts">{notice}</p> : null}
        {board && !(board.rooms || []).length ? (
          <p className="phase1-counts">This schedule has no room yet. Allocate a room before assigning faculty.</p>
        ) : null}
        {board && (board.rooms || []).length ? (
          <div className="admin-table-panel duty-table-wrap">
            <table className="duty-table">
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Session</th>
                  <th>Examination</th>
                  <th>Assigned faculty</th>
                  <th>Department</th>
                  <th>Duty count</th>
                  <th>Status</th>
                  {!readOnly ? <th>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {(board.rooms || []).map((row) => {
                  const selected = (row.candidates || []).find((candidate) => candidate._id === choices[row.room._id]);
                  return (
                    <tr key={row.room._id}>
                      <td>{row.room.building ? `${row.room.building} / ` : ""}{row.room.roomNumber}</td>
                      <td>{board.schedule?.session?.name}</td>
                      <td>{board.schedule?.examination?.title} · {board.schedule?.subject?.name}</td>
                      <td>
                        {readOnly ? (row.assignment?.faculty?.name || "Unassigned") : (
                          <Select
                            value={choices[row.room._id] || ""}
                            placeholder="Select faculty"
                            onChange={(event) => setChoices({ ...choices, [row.room._id]: event.target.value })}
                            options={(row.candidates || []).map((candidate) => ({
                              value: candidate._id,
                              label: candidate.name,
                            }))}
                          />
                        )}
                      </td>
                      <td>{selected?.department?.code || row.assignment?.faculty?.department?.code || ""}</td>
                      <td>{selected?.dutyCount ?? ""}</td>
                      <td>
                        {row.assignment?.status || (selected?.ok ? "Available" : "Unavailable")}
                        {selected && reasonText(selected.reasons) ? <p className="duty-reason">{reasonText(selected.reasons)}</p> : null}
                      </td>
                      {!readOnly ? (
                        <td>
                          <div className="toolbar-selects-group">
                            <Button
                              size="sm"
                              variant="primary"
                              disabled={!selected?.ok || selected._id === row.assignment?.faculty?._id}
                              onClick={() => assign(row.room._id, selected._id === row.assignment?.faculty?._id ? null : row.assignment?._id)}
                            >
                              {row.assignment && selected?._id !== row.assignment.faculty?._id ? "Reassign" : "Assign"}
                            </Button>
                            {row.assignment ? <Button size="sm" variant="outline" onClick={() => remove(row.assignment._id)}>Remove</Button> : null}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
        {!readOnly && scheduleId ? (
          <div className="toolbar-selects-group">
            <Button variant="outline" onClick={generate}>Generate invigilation preview</Button>
            {preview ? <Button variant="primary" onClick={confirmPreview}>Confirm allocation</Button> : null}
          </div>
        ) : null}
        {preview ? (
          <ul className="phase1-conflicts">
            {(preview.rows || []).map((row) => (
              <li key={row.room?._id}>
                {row.room?.roomNumber}: {row.faculty?.name || "Unassigned"} · duties {row.dutyCount ?? "—"} · {row.status}
                {reasonText(row.reasons) ? ` · ${reasonText(row.reasons)}` : ""}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="admin-panel-card">
        <div className="admin-panel-header"><h3 className="admin-panel-title">Workload</h3></div>
        <div className="admin-table-panel duty-table-wrap">
          <table className="duty-table">
            <thead>
              <tr>
                <th>Faculty</th>
                <th>Department</th>
                <th>Assigned</th>
                <th>Upcoming</th>
                <th>Completed</th>
              </tr>
            </thead>
            <tbody>
              {!workload.length ? (
                <tr>
                  <td colSpan={5}>No faculty workload is available.</td>
                </tr>
              ) : null}
              {workload.map((item) => (
                <tr key={item.faculty._id}>
                  <td>{item.faculty.name}</td>
                  <td>{item.department?.code || item.department?.name || ""}</td>
                  <td>{item.assignedDuties}</td>
                  <td>{item.upcomingDuties}</td>
                  <td>{item.completedDuties}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default InvigilationPage;
