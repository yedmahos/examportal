import React, { useEffect, useMemo, useState } from "react";
import { invigilationService } from "../../services/invigilationService";
import PageHeader from "../../components/common/PageHeader";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import Button from "../../components/common/Button";
import FormField from "../../components/common/FormField";
import Input from "../../components/common/Input";
import Select from "../../components/common/Select";
import { PaperList, formatWhen } from "../../components/dashboard/RoleSections";
import "../admin/AdminPages.css";

const dateKey = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const todayKey = () => new Date().toISOString().slice(0, 10);

const dutyPaper = (duty) => ({
  id: String(duty._id),
  title: duty.subject?.name || duty.examination?.title || "Duty",
  meta: duty.examination?.title || "",
  status: duty.status,
  rows: [
    { label: "Examination", value: duty.examination?.title },
    { label: "Subject", value: duty.subject?.name },
    { label: "Date", value: formatWhen(duty.date) },
    { label: "Session", value: duty.session?.name },
    { label: "Reporting time", value: duty.reportingTime },
    { label: "Start time", value: duty.startTime },
    { label: "End time", value: duty.endTime },
    { label: "Building", value: duty.room?.building },
    { label: "Room", value: duty.room?.roomNumber },
    { label: "Status", value: duty.status },
  ],
});

const FacultyDuties = ({
  title = "My Duties",
  subtitle = "Duties assigned to your account",
  showAvailability = true,
}) => {
  const [duties, setDuties] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [form, setForm] = useState({ date: todayKey(), session: "", available: true, reason: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [dutyResponse, availabilityResponse] = await Promise.all([
        invigilationService.mine(),
        invigilationService.availability(),
      ]);
      setDuties(dutyResponse.items || []);
      const nextSessions = availabilityResponse.sessions || [];
      setSessions(nextSessions);
      setForm((current) => ({ ...current, session: current.session || nextSessions[0]?._id || "" }));
    } catch (err) {
      setError(err.message || "Duties could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const groups = useMemo(() => {
    const today = todayKey();
    const active = duties.filter((duty) => duty.status !== "cancelled");
    return {
      today: active.filter((duty) => dateKey(duty.date) === today),
      upcoming: active.filter((duty) => dateKey(duty.date) > today),
      past: duties.filter((duty) => duty.status === "cancelled" || duty.status === "completed" || dateKey(duty.date) < today),
    };
  }, [duties]);

  const saveAvailability = async (event) => {
    event.preventDefault();
    setNotice("");
    try {
      await invigilationService.saveAvailability(form);
      setNotice(form.available ? "Availability saved." : "You are marked unavailable for that session.");
    } catch (err) {
      setNotice(err.message || "Availability could not be saved.");
    }
  };

  if (isLoading) return <LoadingState message="Loading duties..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="admin-dashboard-page animate-fade-in">
      <PageHeader title={title} subtitle={subtitle} />
      <section className="admin-panel-card">
        <div className="admin-panel-header"><h3 className="admin-panel-title">Today's Duties</h3></div>
        <PaperList papers={groups.today.map(dutyPaper)} emptyTitle="No examination duties assigned today" emptyDescription="Assigned duties for today will appear here." />
      </section>
      <section className="admin-panel-card">
        <div className="admin-panel-header"><h3 className="admin-panel-title">Upcoming Duties</h3></div>
        <PaperList papers={groups.upcoming.map(dutyPaper)} emptyTitle="No upcoming duties" emptyDescription="Future duties assigned to you will appear here." />
      </section>
      <section className="admin-panel-card">
        <div className="admin-panel-header"><h3 className="admin-panel-title">Past Duties</h3></div>
        <PaperList papers={groups.past.map(dutyPaper)} emptyTitle="No past duties" emptyDescription="Completed and cancelled duties remain here." />
      </section>
      {showAvailability ? (
        <section className="admin-panel-card">
          <div className="admin-panel-header"><h3 className="admin-panel-title">Availability</h3></div>
          <form className="phase1-form" onSubmit={saveAvailability}>
            <div className="phase1-grid">
              <FormField label="Date">
                <Input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
              </FormField>
              <FormField label="Session">
                <Select
                  value={form.session}
                  placeholder="Select a session"
                  onChange={(event) => setForm({ ...form, session: event.target.value })}
                  options={sessions.map((session) => ({
                    value: session._id,
                    label: `${session.name} ${session.startTime}–${session.endTime}`,
                  }))}
                />
              </FormField>
            </div>
            <label className="phase1-check">
              <input type="checkbox" checked={form.available} onChange={(event) => setForm({ ...form, available: event.target.checked })} />
              Available for this date and session
            </label>
            {!form.available && (
              <FormField label="Reason">
                <Input value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} />
              </FormField>
            )}
            <Button type="submit" variant="primary">Save availability</Button>
            {notice ? <p className="phase1-counts">{notice}</p> : null}
          </form>
        </section>
      ) : null}
    </div>
  );
};

export default FacultyDuties;
