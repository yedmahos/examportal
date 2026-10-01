import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import FormField from "../../components/common/FormField";
import Input from "../../components/common/Input";
import Select from "../../components/common/Select";
import Textarea from "../../components/common/Textarea";
import StatusBadge from "../../components/common/StatusBadge";
import ErrorState from "../../components/common/ErrorState";
import { useToast } from "../../components/common/Toast";
import { examService } from "../../services/examService";
import {
  academicYearService,
  departmentService,
  programService,
  batchService,
  examTypeService,
  sessionService,
} from "../../services/resourceService";
import "./AdminPages.css";

const ExaminationsPage = () => {
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState({ years: [], departments: [], programs: [], batches: [], types: [], sessions: [] });
  const [form, setForm] = useState({
    title: "", semester: "", startDate: "", endDate: "", reportingTime: "",
    academicYear: "", department: "", program: "", examType: "", instructions: "",
    sessions: [], eligibleBatches: [],
  });

  const load = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await examService.getAll({ page, limit: 8 });
      setItems(response.data.items);
      setTotal(response.data.total);
      setTotalPages(response.data.totalPages);
    } catch (err) {
      setError(err.message || "Failed to load examinations");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page]);

  useEffect(() => {
    Promise.all([
      academicYearService.list({ limit: 100 }),
      departmentService.list({ limit: 100, status: "active" }),
      programService.list({ limit: 100, status: "active" }),
      batchService.list({ limit: 100, status: "active" }),
      examTypeService.list({ limit: 100, status: "active" }),
      sessionService.list({ limit: 100, status: "active" }),
    ]).then(([years, departments, programs, batches, types, sessions]) => {
      setOptions({
        years: years.data.items,
        departments: departments.data.items,
        programs: programs.data.items,
        batches: batches.data.items,
        types: types.data.items,
        sessions: sessions.data.items,
      });
    }).catch(() => {});
  }, []);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await examService.createSetup({
        ...form,
        reportingTime: form.reportingTime || undefined,
      });
      showToast("Examination created", "success");
      setModalOpen(false);
      load();
    } catch (err) {
      showToast(err.message || "Could not create examination", "error");
    } finally {
      setSaving(false);
    }
  };

  const programs = options.programs.filter((item) => !form.department || item.department?.id === form.department);
  const batches = options.batches.filter((item) => !form.program || item.program?.id === form.program);

  if (error && !items.length) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Examinations"
        subtitle="Examination setup. Individual papers are scheduled separately."
        actions={<Button icon={Plus} onClick={() => setModalOpen(true)}>New examination</Button>}
      />
      <div className="admin-table-panel">
        <DataTable
          columns={[
            { title: "Title", key: "title" },
            { title: "Type", key: "examType", render: (value) => value?.name || "N/A" },
            { title: "Department", key: "department", render: (value) => (typeof value === "string" ? value : value?.name) || "N/A" },
            { title: "Program", key: "program", render: (value) => (typeof value === "string" ? value : value?.name) || "N/A" },
            { title: "Semester", key: "semester" },
            { title: "Status", key: "status", render: (value) => <StatusBadge status={value} size="sm" /> },
          ]}
          data={items}
          isLoading={isLoading}
          emptyTitle="No examinations"
          emptyDescription="Create an examination before calculating eligibility or schedules."
          pagination={{ page, totalPages, total, onPageChange: setPage, limit: 8 }}
        />
      </div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New examination" size="lg" footer={(
        <>
          <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button type="submit" form="exam-setup-form" isLoading={saving}>Save</Button>
        </>
      )}
      >
        <form id="exam-setup-form" className="phase1-form" onSubmit={save}>
          <FormField label="Title" required><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></FormField>
          <FormField label="Exam type" required>
            <Select value={form.examType} onChange={(e) => setForm({ ...form, examType: e.target.value })} options={options.types.map((item) => ({ value: item.id, label: item.name }))} placeholder="Select exam type" />
          </FormField>
          <FormField label="Academic year" required>
            <Select value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} options={options.years.map((item) => ({ value: item.id, label: item.name }))} placeholder="Select year" />
          </FormField>
          <FormField label="Department" required>
            <Select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value, program: "", eligibleBatches: [] })} options={options.departments.map((item) => ({ value: item.id, label: item.name }))} placeholder="Select department" />
          </FormField>
          <FormField label="Program" required>
            <Select value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value, eligibleBatches: [] })} options={programs.map((item) => ({ value: item.id, label: item.name }))} placeholder="Select program" />
          </FormField>
          <FormField label="Semester" required><Input type="number" min="1" max="12" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} required /></FormField>
          <FormField label="Start date" required><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required /></FormField>
          <FormField label="End date" required><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required /></FormField>
          <FormField label="Reporting time"><Input type="time" value={form.reportingTime} onChange={(e) => setForm({ ...form, reportingTime: e.target.value })} /></FormField>
          <FormField label="Sessions">
            <Select value="" onChange={(e) => {
              if (e.target.value && !form.sessions.includes(e.target.value)) {
                setForm({ ...form, sessions: [...form.sessions, e.target.value] });
              }
            }} options={options.sessions.map((item) => ({ value: item.id, label: `${item.name} (${item.startTime}-${item.endTime})` }))} placeholder="Add a session" />
            <p className="form-helper-text">{form.sessions.length ? `${form.sessions.length} selected` : "None selected"}</p>
          </FormField>
          <FormField label="Eligible batches">
            <Select value="" onChange={(e) => {
              if (e.target.value && !form.eligibleBatches.includes(e.target.value)) {
                setForm({ ...form, eligibleBatches: [...form.eligibleBatches, e.target.value] });
              }
            }} options={batches.map((item) => ({ value: item.id, label: item.name }))} placeholder="Add a batch" />
            <p className="form-helper-text">{form.eligibleBatches.length ? `${form.eligibleBatches.length} selected` : "None selected"}</p>
          </FormField>
          <FormField label="Instructions"><Textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} /></FormField>
        </form>
      </Modal>
    </div>
  );
};

export default ExaminationsPage;
