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
import StatusBadge from "../../components/common/StatusBadge";
import ErrorState from "../../components/common/ErrorState";
import { useToast } from "../../components/common/Toast";
import { roomService } from "../../services/resourceService";
import "./AdminPages.css";

const emptyForm = () => ({
  roomNumber: "",
  building: "",
  floor: "",
  capacity: "",
  roomType: "classroom",
  facilities: "",
  status: "active",
  isAvailable: true,
  unavailableDates: "",
});

const RoomsPage = () => {
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
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await roomService.list({ search, page, limit: 8 });
      setItems(response.data.items);
      setTotal(response.data.total);
      setTotalPages(response.data.totalPages);
    } catch (err) {
      setError(err.message || "Failed to load rooms");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, [search, page]);

  const toPayload = () => ({
    roomNumber: form.roomNumber,
    building: form.building,
    floor: form.floor,
    capacity: Number(form.capacity),
    roomType: form.roomType,
    facilities: String(form.facilities || "").split(",").map((item) => item.trim()).filter(Boolean),
    status: form.status,
    isAvailable: Boolean(form.isAvailable),
    unavailableDates: String(form.unavailableDates || "").split(",").map((item) => item.trim()).filter(Boolean),
  });

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editing) await roomService.update(editing.id, toPayload());
      else await roomService.create(toPayload());
      showToast("Room saved", "success");
      setModalOpen(false);
      load();
    } catch (err) {
      showToast(err.message || "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  if (error && !items.length) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Rooms"
        subtitle="Room inventory used by manual scheduling"
        actions={<Button icon={Plus} onClick={() => { setEditing(null); setForm(emptyForm()); setModalOpen(true); }}>Add room</Button>}
      />
      <div className="admin-toolbar-card">
        <SearchBar value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search room or building..." />
      </div>
      <div className="admin-table-panel">
        <DataTable
          isLoading={isLoading}
          data={items}
          emptyTitle="No rooms"
          emptyDescription="Add a room before allocating it to a schedule."
          pagination={{ page, totalPages, total, onPageChange: setPage, limit: 8 }}
          columns={[
            { title: "Room", key: "roomNumber" },
            { title: "Building", key: "building" },
            { title: "Floor", key: "floor" },
            { title: "Capacity", key: "capacity" },
            { title: "Type", key: "roomType" },
            { title: "Status", key: "status", render: (value) => <StatusBadge status={value} size="sm" /> },
            {
              title: "Actions",
              key: "id",
              align: "right",
              render: (_value, row) => (
                <div className="table-row-actions">
                  <Link className="row-action-btn" to={`/admin/rooms/${row.id}`} title="Details"><Eye size={15} /></Link>
                  <button type="button" className="row-action-btn" title="Edit" onClick={() => {
                    setEditing(row);
                    setForm({
                      roomNumber: row.roomNumber,
                      building: row.building,
                      floor: row.floor,
                      capacity: row.capacity,
                      roomType: row.roomType,
                      facilities: (row.facilities || []).join(", "),
                      status: row.status,
                      isAvailable: row.availability?.isAvailable !== false,
                      unavailableDates: (row.availability?.unavailableDates || []).map((date) => String(date).slice(0, 10)).join(", "),
                    });
                    setModalOpen(true);
                  }}
                  >
                    <Edit2 size={15} />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit room" : "Add room"} footer={(
        <>
          <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button type="submit" form="room-form" isLoading={saving}>Save</Button>
        </>
      )}
      >
        <form id="room-form" className="phase1-form" onSubmit={save}>
          <FormField label="Room number" required><Input value={form.roomNumber} onChange={(e) => setForm({ ...form, roomNumber: e.target.value })} required /></FormField>
          <FormField label="Building" required><Input value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} required /></FormField>
          <FormField label="Floor" required><Input value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} required /></FormField>
          <FormField label="Capacity" required><Input type="number" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} required /></FormField>
          <FormField label="Type">
            <Select value={form.roomType} onChange={(e) => setForm({ ...form, roomType: e.target.value })} options={["classroom", "laboratory", "hall", "seminar", "other"].map((value) => ({ value, label: value }))} placeholder="" />
          </FormField>
          <FormField label="Facilities" helperText="Comma separated"><Input value={form.facilities} onChange={(e) => setForm({ ...form, facilities: e.target.value })} /></FormField>
          <FormField label="Unavailable dates" helperText="Comma separated YYYY-MM-DD"><Input value={form.unavailableDates} onChange={(e) => setForm({ ...form, unavailableDates: e.target.value })} /></FormField>
          <label className="phase1-check">
            <input type="checkbox" checked={Boolean(form.isAvailable)} onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })} />
            Generally available
          </label>
          <FormField label="Status">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} placeholder="" />
          </FormField>
        </form>
      </Modal>
    </div>
  );
};

export default RoomsPage;
