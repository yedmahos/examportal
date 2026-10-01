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
import { examTypeService, sessionService } from "../../services/resourceService";
import "./AdminPages.css";

const CatalogPage = ({ kind }) => {
  const isType = kind === "examTypes";
  const service = isType ? examTypeService : sessionService;
  const { role } = useAuth();
  const canWrite = canAccess(role, ["examination_cell", "super_admin"]);
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

  const load = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await service.list({ search, page, limit: 10 });
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
    load();
  }, [kind, search, page]);

  const openCreate = () => {
    setEditing(null);
    setForm({ status: "active" });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name || "",
      code: row.code || "",
      description: row.description || "",
      reportingTime: row.reportingTime || "",
      startTime: row.startTime || "",
      endTime: row.endTime || "",
      duration: row.duration || "",
      status: row.status || "active",
    });
    setModalOpen(true);
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await service.update(editing.id, form);
        showToast("Updated", "success");
      } else {
        await service.create(form);
        showToast("Created", "success");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      showToast(err.message || "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (row) => {
    const status = row.status === "active" ? "inactive" : "active";
    try {
      if (isType) {
        await service.patch(row.id, { status }, "/status");
      } else {
        await service.update(row.id, { status });
      }
      showToast(`Marked ${status}`, "success");
      load();
    } catch (err) {
      showToast(err.message || "Status update failed", "error");
    }
  };

  if (error && !items.length) return <ErrorState message={error} onRetry={load} />;

  const columns = [
    { title: "Name", key: "name" },
    { title: "Code", key: "code" },
    ...(isType
      ? [{ title: "Custom", key: "isCustom", render: (value) => (value ? "Custom" : "Built-in") }]
      : [
          { title: "Reporting", key: "reportingTime" },
          { title: "Start", key: "startTime" },
          { title: "End", key: "endTime" },
        ]),
    { title: "Status", key: "status", render: (value) => <StatusBadge status={value} size="sm" /> },
    {
      title: "Actions",
      key: "id",
      align: "right",
      render: (_value, row) => (
        canWrite ? (
        <div className="table-row-actions">
          <button type="button" className="row-action-btn" onClick={() => openEdit(row)} title="Edit">
            <Edit2 size={15} />
          </button>
          <Button size="sm" variant="outline" onClick={() => toggleStatus(row)}>
            {row.status === "active" ? "Deactivate" : "Activate"}
          </Button>
        </div>
        ) : "—"
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={isType ? "Exam Types" : "Sessions"}
        subtitle={isType ? "Built-in and custom examination types" : "Morning, afternoon, and custom sessions"}
        actions={canWrite ? <Button icon={Plus} onClick={openCreate}>Add custom</Button> : null}
      />
      <div className="admin-toolbar-card">
        <SearchBar value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search name or code..." />
      </div>
      <div className="admin-table-panel">
        <DataTable
          columns={columns}
          data={items}
          isLoading={isLoading}
          emptyTitle="No records"
          emptyDescription="Built-in records appear after the server connects to the database."
          pagination={{ page, totalPages, total, onPageChange: setPage, limit: 10 }}
        />
      </div>
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit" : "Add custom"}
        footer={(
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" form="catalog-form" isLoading={saving}>Save</Button>
          </>
        )}
      >
        <form id="catalog-form" className="phase1-form" onSubmit={save}>
          <FormField label="Name" required>
            <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </FormField>
          <FormField label="Code" required>
            <Input value={form.code || ""} onChange={(e) => setForm({ ...form, code: e.target.value })} required disabled={Boolean(editing && !editing.isCustom)} />
          </FormField>
          {isType ? (
            <FormField label="Description">
              <Input value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </FormField>
          ) : (
            <>
              <FormField label="Reporting time" required>
                <Input type="time" value={form.reportingTime || ""} onChange={(e) => setForm({ ...form, reportingTime: e.target.value })} required />
              </FormField>
              <FormField label="Start time" required>
                <Input type="time" value={form.startTime || ""} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
              </FormField>
              <FormField label="End time" required>
                <Input type="time" value={form.endTime || ""} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required />
              </FormField>
              <FormField label="Duration (minutes)">
                <Input type="number" min="1" value={form.duration || ""} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
              </FormField>
            </>
          )}
          <FormField label="Status">
            <Select
              value={form.status || "active"}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]}
              placeholder=""
            />
          </FormField>
        </form>
      </Modal>
    </div>
  );
};

export default CatalogPage;
