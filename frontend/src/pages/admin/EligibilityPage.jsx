import React, { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import Select from "../../components/common/Select";
import DataTable from "../../components/common/DataTable";
import Tabs from "../../components/common/Tabs";
import StatusBadge from "../../components/common/StatusBadge";
import ErrorState from "../../components/common/ErrorState";
import { useToast } from "../../components/common/Toast";
import { useAuth } from "../../context/AuthContext";
import { canAccess } from "../../utils/roles";
import { examService } from "../../services/examService";
import { subjectService, eligibilityService } from "../../services/resourceService";
import "./AdminPages.css";

const EligibilityPage = () => {
  const { role } = useAuth();
  const canCalculate = canAccess(role, ["examination_cell", "super_admin"]);
  const { showToast } = useToast();
  const [examinations, setExaminations] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [examination, setExamination] = useState("");
  const [subject, setSubject] = useState("");
  const [status, setStatus] = useState("eligible");
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    examService.getAll({ limit: 100 }).then((res) => setExaminations(res.data.items)).catch(() => {});
    subjectService.list({ limit: 100, status: "active" }).then((res) => setSubjects(res.data.items)).catch(() => {});
  }, []);

  const load = async (nextStatus = status) => {
    if (!examination || !subject) {
      showToast("Select an examination and a subject", "error");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const response = await eligibilityService.list({
        examination, subject, eligibilityStatus: nextStatus, limit: 100,
      });
      setItems(response.data.items);
      setCounts(response.data.counts || null);
      setLoaded(true);
    } catch (err) {
      setError(err.message || "Failed to load eligibility");
    } finally {
      setIsLoading(false);
    }
  };

  const calculate = async () => {
    if (!examination || !subject) {
      showToast("Select an examination and a subject", "error");
      return;
    }
    try {
      const response = await eligibilityService.postAction("/calculate", { examination, subject });
      showToast(response.message || "Eligibility calculated", "success");
      load();
    } catch (err) {
      showToast(err.message || "Calculation failed", "error");
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Eligibility" subtitle="Calculated from enrollment and subject registration" />
      <div className="admin-toolbar-card">
        <div className="toolbar-selects-group">
          <div className="toolbar-select-item">
            <Select value={examination} onChange={(e) => setExamination(e.target.value)} placeholder="Examination" options={examinations.map((item) => ({ value: item.id, label: item.title }))} />
          </div>
          <div className="toolbar-select-item">
            <Select value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" options={subjects.map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` }))} />
          </div>
          <Button variant="outline" onClick={() => load()}>Load</Button>
          {canCalculate && <Button onClick={calculate}>Calculate</Button>}
        </div>
        {counts && (
          <p className="phase1-counts">
            Eligible {counts.eligible || 0} · Registered {counts.registered || 0} · Blocked {counts.blocked || 0}
          </p>
        )}
      </div>
      <Tabs
        tabs={[
          { id: "eligible", label: "Eligible" },
          { id: "registered", label: "Registered" },
          { id: "blocked", label: "Blocked" },
        ]}
        activeTab={status}
        onChange={(next) => { setStatus(next); if (examination && subject) load(next); }}
        variant="pill"
      />
      {error ? <ErrorState message={error} onRetry={() => load()} /> : (
        <div className="admin-table-panel">
          <DataTable
            columns={[
              { title: "Student", key: "student", render: (value) => value?.name || "N/A" },
              { title: "Student ID", key: "student", render: (value) => value?.studentId || "N/A" },
              { title: "Status", key: "eligibilityStatus", render: (value) => <StatusBadge status={value} size="sm" /> },
              { title: "Registration", key: "examRegistrationStatus" },
              { title: "Reason", key: "reason", render: (value) => value || "N/A" },
            ]}
            data={items}
            isLoading={isLoading}
            emptyTitle={loaded ? "No students in this status" : "Eligibility not loaded"}
            emptyDescription={loaded ? "No records match this status." : "Choose an examination and subject, then calculate or load."}
          />
        </div>
      )}
    </div>
  );
};

export default EligibilityPage;
