import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Edit2, Eye } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import SearchBar from "../../components/common/SearchBar";
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
import { useAuth } from "../../context/AuthContext";
import { canAccess } from "../../utils/roles";
import {
  subjectService,
  departmentService,
  programService,
} from "../../services/resourceService";
import "./AdminPages.css";

const TYPES = [
  { value: "theory", label: "Theory" },
  { value: "practical", label: "Practical" },
  { value: "elective", label: "Elective" },
  { value: "viva", label: "Viva" },
  { value: "lab", label: "Lab" },
];

const emptyForm = () => ({
  code: "",
  name: "",
  subjectType: "theory",
  department: "",
  program: "",
  semester: "",
  duration: "",
  credits: "",
  description: "",
  status: "active",
});

const SubjectsPage = () => {
  const { role } = useAuth();
  const canEdit = canAccess(role, ["examination_cell", "super_admin"]);
  const canVerify = canAccess(role, ["department_admin", "super_admin"]);
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [program, setProgram] = useState("");
  const [semester, setSemester] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    departmentService.list({ limit: 100 }).then((res) => setDepartments(res.data.items)).catch(() => {});
    programService.list({ limit: 100 }).then((res) => setPrograms(res.data.items)).catch(() => {});
  }, []);

  const load = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await subjectService.list({
        search, department, program, semester, page, limit: 8,
      });
      setItems(response.data.items);
      setTotal(response.data.total);
      setTotalPages(response.data.totalPages);
    } catch (err) {
      setError(err.message || "Failed to load subjects");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [search, department, program, semester, page]);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        credits: form.credits === "" ? undefined : form.credits,
      };
      if (editing) {
        await subjectService.update(editing.id, payload);
        showToast("Subject updated", "success");
      } else {
        await subjectService.create(payload);
        showToast("Subject created", "success");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      showToast(err.message || "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const verify = async (row) => {
    try {
      const next = row.verificationStatus === "verified" ? "unverified" : "verified";
      await subjectService.patch(row.id, { verificationStatus: next }, "/verification");
      showToast(`Subject marked ${next}`, "success");
      load();
    } catch (err) {
      showToast(err.message || "Verification failed", "error");
    }
  };

  if (error && !items.length) return <ErrorState message={error} onRetry={load} />;

  const filteredPrograms = programs.filter((item) => !form.department || item.department?.id === form.department || item.department === form.department);

  const columns = [
    { title: "Code", key: "code" },
    { title: "Name", key: "name" },
    { title: "Type", key: "subjectType" },
    { title: "Department", key: "department", render: (value) => value?.name || "N/A" },
    { title: "Program", key: "program", render: (value) => value?.name || "N/A" },
    { title: "Semester", key: "semester" },
    { title: "Status", key: "status", render: (value) => <StatusBadge status={value} size="sm" /> },
    { title: "Verification", key: "verificationStatus", render: (value) => <StatusBadge status={value || "unverified"} size="sm" /> },
    {
      title: "Actions",
      key: "id",
      align: "right",
      render: (_value, row) => (
        <div className="table-row-actions">
          <Link to={`/admin/subjects/${row.id}`} className="row-action-btn" title="View"><Eye size={15} /></Link>
          {canEdit && (
            <button type="button" className="row-action-btn" title="Edit" onClick={() => {
              setEditing(row);
              setForm({
                code: row.code,
                name: row.name,
                subjectType: row.subjectType,
                department: row.department?.id || "",
                program: row.program?.id || "",
                semester: row.semester,
                duration: row.duration,
                credits: row.credits ?? "",
                description: row.description || "",
                status: row.status,
              });
              setModalOpen(true);
            }}
            >
              <Edit2 size={15} />
            </button>
          )}
          {canVerify && (
            <Button size="sm" variant="outline" onClick={() => verify(row)}>
              {row.verificationStatus === "verified" ? "Unverify" : "Verify"}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Subjects"
        subtitle="Subject records used by scheduling"
        actions={canEdit ? (
          <Button icon={Plus} onClick={() => { setEditing(null); setForm(emptyForm()); setModalOpen(true); }}>Add subject</Button>
        ) : null}
      />
      <div className="admin-toolbar-card">
        <div className="toolbar-selects-group">
          <SearchBar value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search code or name..." />
          <div className="toolbar-select-item">
            <Select value={department} onChange={(e) => { setDepartment(e.target.value); setPage(1); }} placeholder="All departments" options={departments.map((item) => ({ value: item.id, label: item.name }))} />
          </div>
          <div className="toolbar-select-item">
            <Select value={program} onChange={(e) => { setProgram(e.target.value); setPage(1); }} placeholder="All programs" options={programs.map((item) => ({ value: item.id, label: item.name }))} />
          </div>
          <div className="toolbar-select-item">
            <Select
              value={semester}
              onChange={(e) => { setSemester(e.target.value); setPage(1); }}
              placeholder="All semesters"
              options={[1, 2, 3, 4, 5, 6, 7, 8].map((value) => ({ value: String(value), label: `Semester ${value}` }))}
            />
          </div>
        </div>
      </div>
      <div className="admin-table-panel">
        <DataTable
          columns={columns}
          data={items}
          isLoading={isLoading}
          emptyTitle="No subjects"
          emptyDescription="Add a subject before it can be scheduled."
          pagination={{ page, totalPages, total, onPageChange: setPage, limit: 8 }}
        />
      </div>
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit subject" : "Add subject"}
        size="lg"
        footer={(
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" form="subject-form" isLoading={saving}>Save</Button>
          </>
        )}
      >
        <form id="subject-form" className="phase1-form" onSubmit={save}>
          <FormField label="Code" required><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required /></FormField>
          <FormField label="Name" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></FormField>
          <FormField label="Type" required>
            <Select value={form.subjectType} onChange={(e) => setForm({ ...form, subjectType: e.target.value })} options={TYPES} placeholder="" />
          </FormField>
          <FormField label="Department" required>
            <Select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value, program: "" })} options={departments.map((item) => ({ value: item.id, label: item.name }))} placeholder="Select department" />
          </FormField>
          <FormField label="Program" required>
            <Select value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })} options={filteredPrograms.map((item) => ({ value: item.id, label: item.name }))} placeholder="Select program" />
          </FormField>
          <FormField label="Semester" required><Input type="number" min="1" max="12" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} required /></FormField>
          <FormField label="Duration (minutes)" required><Input type="number" min="1" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} required /></FormField>
          <FormField label="Credits"><Input type="number" min="0" value={form.credits} onChange={(e) => setForm({ ...form, credits: e.target.value })} /></FormField>
          <FormField label="Description"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></FormField>
          <FormField label="Status">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} placeholder="" />
          </FormField>
        </form>
      </Modal>
    </div>
  );
};

export default SubjectsPage;
