import React, { useEffect, useState } from "react";
import { Plus, Edit2 } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import SearchBar from "../../components/common/SearchBar";
import Button from "../../components/common/Button";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import FormField from "../../components/common/FormField";
import Input from "../../components/common/Input";
import Select from "../../components/common/Select";
import StatusBadge from "../../components/common/StatusBadge";
import ErrorState from "../../components/common/ErrorState";
import { useToast } from "../../components/common/Toast";
import { useAuth } from "../../context/AuthContext";
import { canAccess } from "../../utils/roles";
import {
  academicYearService,
  departmentService,
  programService,
  batchService,
  sectionService,
} from "../../services/resourceService";
import "./AdminPages.css";

const dateLabel = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const dateInput = (value) => (value ? String(value).slice(0, 10) : "");

const StructurePage = ({ resource }) => {
  const { role } = useAuth();
  const canWrite = canAccess(role, ["super_admin"]);
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState({ departments: [], programs: [], years: [], batches: [] });

  const config = {
    academicYears: {
      title: "Academic Years",
      subtitle: "Years used by batches and examinations",
      service: academicYearService,
      columns: [
        { title: "Name", key: "name" },
        { title: "Start", key: "startDate", render: (value) => dateLabel(value) },
        { title: "End", key: "endDate", render: (value) => dateLabel(value) },
        {
          title: "Active",
          key: "isActive",
          render: (value) => <StatusBadge status={value ? "active" : "inactive"} size="sm" />,
        },
      ],
    },
    departments: {
      title: "Departments",
      subtitle: "Academic departments",
      service: departmentService,
      columns: [
        { title: "Name", key: "name" },
        { title: "Code", key: "code" },
        { title: "Status", key: "status", render: (value) => <StatusBadge status={value} size="sm" /> },
      ],
    },
    programs: {
      title: "Programs",
      subtitle: "Programs linked to a department",
      service: programService,
      columns: [
        { title: "Name", key: "name" },
        { title: "Code", key: "code" },
        { title: "Department", key: "department", render: (value) => value?.name || "N/A" },
        { title: "Duration", key: "duration", render: (value) => (value ? `${value} years` : "N/A") },
        { title: "Status", key: "status", render: (value) => <StatusBadge status={value} size="sm" /> },
      ],
    },
    batches: {
      title: "Batches",
      subtitle: "Program batches for an academic year",
      service: batchService,
      columns: [
        { title: "Name", key: "name" },
        { title: "Program", key: "program", render: (value) => value?.name || "N/A" },
        { title: "Year", key: "academicYear", render: (value) => value?.name || "N/A" },
        { title: "Semester", key: "semester" },
        { title: "Status", key: "status", render: (value) => <StatusBadge status={value} size="sm" /> },
      ],
    },
    sections: {
      title: "Sections",
      subtitle: "Sections inside a batch",
      service: sectionService,
      columns: [
        { title: "Name", key: "name" },
        { title: "Batch", key: "batch", render: (value) => value?.name || "N/A" },
        { title: "Program", key: "batch", render: (value) => value?.program?.name || "N/A" },
        { title: "Status", key: "status", render: (value) => <StatusBadge status={value} size="sm" /> },
      ],
    },
  }[resource];

  const loadOptions = async () => {
    if (resource === "programs" || resource === "batches") {
      const departments = await departmentService.list({ limit: 100, status: "active" });
      setOptions((current) => ({ ...current, departments: departments.data.items }));
    }
    if (resource === "batches" || resource === "sections") {
      const [programs, years, batches] = await Promise.all([
        programService.list({ limit: 100, status: "active" }),
        academicYearService.list({ limit: 100 }),
        batchService.list({ limit: 100, status: "active" }),
      ]);
      setOptions((current) => ({
        ...current,
        programs: programs.data.items,
        years: years.data.items,
        batches: batches.data.items,
      }));
    }
  };

  const load = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await config.service.list({ search, page, limit: 8 });
      setItems(response.data.items);
      setTotal(response.data.total);
      setTotalPages(response.data.totalPages);
    } catch (err) {
      setError(err.message || "Failed to load records");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOptions().catch(() => {});
  }, [resource]);

  useEffect(() => {
    load();
  }, [resource, search, page]);

  const openCreate = () => {
    setEditing(null);
    setForm({ status: "active", isActive: false });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name || "",
      code: row.code || "",
      startDate: dateInput(row.startDate),
      endDate: dateInput(row.endDate),
      isActive: Boolean(row.isActive),
      status: row.status || "active",
      duration: row.duration || "",
      department: row.department?.id || "",
      program: row.program?.id || "",
      academicYear: row.academicYear?.id || "",
      semester: row.semester || "",
      batch: row.batch?.id || "",
    });
    setModalOpen(true);
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (resource === "academicYears") {
        payload.isActive = Boolean(form.isActive);
      }
      if (editing) {
        await config.service.update(editing.id, payload);
        showToast("Record updated", "success");
      } else {
        await config.service.create(payload);
        showToast("Record created", "success");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      showToast(err.message || "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  if (!config) return <ErrorState message="Unknown academic resource" />;
  if (error && !items.length) return <ErrorState message={error} onRetry={load} />;

  const columns = [
    ...config.columns,
    {
      title: "Actions",
      key: "id",
      align: "right",
      render: (_value, row) => canWrite ? (
        <button type="button" className="row-action-btn" onClick={() => openEdit(row)} title="Edit">
          <Edit2 size={15} />
        </button>
      ) : "—",
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={config.title}
        subtitle={config.subtitle}
        actions={canWrite ? <Button icon={Plus} onClick={openCreate}>Add</Button> : null}
      />
      <div className="admin-toolbar-card">
        <SearchBar value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search..." />
      </div>
      <div className="admin-table-panel">
        <DataTable
          columns={columns}
          data={items}
          isLoading={isLoading}
          emptyTitle={`No ${config.title.toLowerCase()}`}
          emptyDescription="Create a record to use it in examinations and scheduling."
          pagination={{ page, totalPages, total, onPageChange: setPage, limit: 8 }}
        />
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${config.title}` : `Add ${config.title}`}
        footer={(
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" form="structure-form" isLoading={saving}>Save</Button>
          </>
        )}
      >
        <form id="structure-form" onSubmit={save} className="phase1-form">
          <FormField label="Name" required>
            <Input value={form.name || ""} onChange={(e) => setField("name", e.target.value)} required />
          </FormField>
          {resource !== "academicYears" && resource !== "batches" && resource !== "sections" && (
            <FormField label="Code" required>
              <Input value={form.code || ""} onChange={(e) => setField("code", e.target.value)} required />
            </FormField>
          )}
          {resource === "academicYears" && (
            <>
              <FormField label="Start date" required>
                <Input type="date" value={form.startDate || ""} onChange={(e) => setField("startDate", e.target.value)} required />
              </FormField>
              <FormField label="End date" required>
                <Input type="date" value={form.endDate || ""} onChange={(e) => setField("endDate", e.target.value)} required />
              </FormField>
              <label className="phase1-check">
                <input type="checkbox" checked={Boolean(form.isActive)} onChange={(e) => setField("isActive", e.target.checked)} />
                Active academic year
              </label>
            </>
          )}
          {resource === "programs" && (
            <>
              <FormField label="Department" required>
                <Select
                  value={form.department || ""}
                  onChange={(e) => setField("department", e.target.value)}
                  options={options.departments.map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` }))}
                  placeholder="Select department"
                />
              </FormField>
              <FormField label="Duration (years)" required>
                <Input type="number" min="1" value={form.duration || ""} onChange={(e) => setField("duration", e.target.value)} required />
              </FormField>
            </>
          )}
          {resource === "batches" && (
            <>
              <FormField label="Academic year" required>
                <Select
                  value={form.academicYear || ""}
                  onChange={(e) => setField("academicYear", e.target.value)}
                  options={options.years.map((item) => ({ value: item.id, label: item.name }))}
                  placeholder="Select year"
                />
              </FormField>
              <FormField label="Program" required>
                <Select
                  value={form.program || ""}
                  onChange={(e) => setField("program", e.target.value)}
                  options={options.programs.map((item) => ({ value: item.id, label: item.name }))}
                  placeholder="Select program"
                />
              </FormField>
              <FormField label="Semester" required>
                <Input type="number" min="1" max="12" value={form.semester || ""} onChange={(e) => setField("semester", e.target.value)} required />
              </FormField>
            </>
          )}
          {resource === "sections" && (
            <FormField label="Batch" required>
              <Select
                value={form.batch || ""}
                onChange={(e) => setField("batch", e.target.value)}
                options={options.batches.map((item) => ({ value: item.id, label: `${item.name} · Sem ${item.semester}` }))}
                placeholder="Select batch"
              />
            </FormField>
          )}
          {resource !== "academicYears" && (
            <FormField label="Status" required>
              <Select
                value={form.status || "active"}
                onChange={(e) => setField("status", e.target.value)}
                options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]}
                placeholder=""
              />
            </FormField>
          )}
        </form>
      </Modal>
    </div>
  );
};

export default StructurePage;
