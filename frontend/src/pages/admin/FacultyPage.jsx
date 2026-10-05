import React, { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import FormField from "../../components/common/FormField";
import Input from "../../components/common/Input";
import Select from "../../components/common/Select";
import DataTable from "../../components/common/DataTable";
import ErrorState from "../../components/common/ErrorState";
import { useToast } from "../../components/common/Toast";
import { departmentService, facultyService } from "../../services/resourceService";
import "./AdminPages.css";

const emptyForm = () => ({
  name: "",
  email: "",
  password: "",
  department: "",
});

const FacultyPage = () => {
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [assignments, setAssignments] = useState({});

  const load = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [faculty, departmentResponse] = await Promise.all([
        facultyService.list(),
        departmentService.list({ limit: 100, status: "active" }),
      ]);
      setItems(faculty.data.items);
      setDepartments(departmentResponse.data.items);
    } catch (err) {
      setError(err.message || "Failed to load faculty accounts");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await facultyService.create({
        name: form.name,
        email: form.email,
        password: form.password,
        department: form.department || undefined,
      });
      showToast(response.message || "Faculty account created", "success");
      setForm(emptyForm());
      load();
    } catch (err) {
      showToast(err.message || "Could not create faculty account", "error");
    } finally {
      setSaving(false);
    }
  };

  const saveDepartment = async (userId) => {
    const department = assignments[userId];
    if (!department) {
      showToast("Select a department", "error");
      return;
    }
    try {
      const response = await facultyService.assignDepartment(userId, department);
      showToast(response.message || "Department assignment saved", "success");
      load();
    } catch (err) {
      showToast(err.message || "Could not assign the department", "error");
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Faculty"
        subtitle="Create faculty accounts. Faculty can sign in and use the staff dashboard."
      />
      <form className="admin-panel-card phase1-form" onSubmit={save}>
        <div className="phase1-grid">
          <FormField label="Name" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </FormField>
          <FormField label="Email" required>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </FormField>
          <FormField label="Password" required>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
          </FormField>
          <FormField label="Department" helperText="Optional. Limits where this person belongs.">
            <Select
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              options={departments.map((item) => ({ value: item.id, label: item.name }))}
              placeholder="No department"
            />
          </FormField>
        </div>
        <Button type="submit" isLoading={saving}>Create faculty account</Button>
      </form>
      {error ? <ErrorState message={error} onRetry={load} /> : (
        <div className="admin-table-panel">
          <DataTable
            isLoading={isLoading}
            data={items}
            emptyTitle="No faculty accounts"
            emptyDescription="Created faculty accounts appear here."
            columns={[
              { title: "Name", key: "name" },
              { title: "Email", key: "email" },
              { title: "Role", key: "role" },
              {
                title: "Department",
                key: "departmentRef",
                render: (value, row) => (
                  <div className="toolbar-selects-group">
                    <Select
                      value={assignments[row.id] ?? value?.id ?? ""}
                      onChange={(e) => setAssignments((current) => ({ ...current, [row.id]: e.target.value }))}
                      options={departments.map((item) => ({ value: item.id, label: item.name }))}
                      placeholder="Assign department"
                    />
                    <Button type="button" variant="outline" onClick={() => saveDepartment(row.id)}>Save</Button>
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}
    </div>
  );
};

export default FacultyPage;
