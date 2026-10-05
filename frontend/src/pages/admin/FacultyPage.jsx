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

const ROLE_OPTIONS = [
  { value: "faculty", label: "Faculty" },
  { value: "department_admin", label: "Department Admin" },
  { value: "examination_cell", label: "Examination Cell" },
  { value: "super_admin", label: "Super Admin" },
];

const emptyForm = () => ({
  name: "",
  email: "",
  password: "",
  role: "faculty",
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
        role: form.role,
        department: form.department || undefined,
      });
      showToast(response.message || "Account created", "success");
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
        title="Users and roles"
        subtitle="Super Admin creates faculty, department admins, examination cell, and super admin accounts."
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
          <FormField label="Role" required>
            <Select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              options={ROLE_OPTIONS}
              placeholder="Select role"
            />
          </FormField>
          <FormField label="Department" helperText={form.role === "department_admin" ? "Required for a department admin." : "Optional for faculty."}>
            <Select
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              options={departments.map((item) => ({ value: item.id, label: item.name }))}
              placeholder="No department"
            />
          </FormField>
        </div>
        <Button type="submit" isLoading={saving}>Create account</Button>
      </form>
      {error ? <ErrorState message={error} onRetry={load} /> : (
        <div className="admin-table-panel">
          <DataTable
            isLoading={isLoading}
            data={items}
            emptyTitle="No staff accounts"
            emptyDescription="Created staff accounts appear here."
            columns={[
              { title: "Name", key: "name" },
              { title: "Email", key: "email" },
              { title: "Role", key: "role" },
              {
                title: "Status",
                key: "status",
                render: (value, row) => (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      try {
                        const next = value === "inactive" ? "active" : "inactive";
                        const response = await facultyService.setStatus(row.id, next);
                        showToast(response.message || "Account status saved", "success");
                        load();
                      } catch (err) {
                        showToast(err.message || "Could not change the account status", "error");
                      }
                    }}
                  >
                    {value === "inactive" ? "Activate" : "Deactivate"}
                  </Button>
                ),
              },
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
