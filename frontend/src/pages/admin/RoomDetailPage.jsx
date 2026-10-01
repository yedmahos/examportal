import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import DataTable from "../../components/common/DataTable";
import { get } from "../../services/api";
import { roomService } from "../../services/resourceService";

const RoomDetailPage = () => {
  const { id } = useParams();
  const [room, setRoom] = useState(null);
  const [allocations, setAllocations] = useState([]);
  const [availability, setAvailability] = useState(null);
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await roomService.get(id);
      setRoom(response.data);
      setAllocations(response.allocations || []);
    } catch (err) {
      setError(err.message || "Room not found");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const checkDate = async () => {
    if (!date) return;
    try {
      const response = await get(`/rooms/${id}/availability?date=${date}`);
      setAvailability(response);
    } catch (err) {
      setAvailability({ message: err.message });
    }
  };

  if (isLoading) return <LoadingState message="Loading room..." />;
  if (error || !room) return <ErrorState message={error || "Room not found"} onRetry={load} />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={`${room.building} ${room.roomNumber}`}
        subtitle={`Floor ${room.floor} · Capacity ${room.capacity}`}
        backUrl="/admin/rooms"
        badge={<StatusBadge status={room.status} />}
      />
      <div className="admin-panel-card phase1-detail">
        <p>Type: {room.roomType}</p>
        <p>Facilities: {(room.facilities || []).join(", ") || "N/A"}</p>
        <p>Generally available: {room.availability?.isAvailable === false ? "No" : "Yes"}</p>
        <div className="toolbar-selects-group">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Button variant="outline" onClick={checkDate}>Check availability</Button>
        </div>
        {availability && (
          <p className="phase1-counts">
            {availability.message || `${availability.date}: ${availability.available && availability.active ? "Available" : "Not available"} · allocations ${(availability.allocations || []).length}`}
          </p>
        )}
      </div>
      <div className="admin-table-panel">
        <h3 className="admin-panel-title">Allocations</h3>
        <DataTable
          data={allocations}
          emptyTitle="No allocations"
          emptyDescription="This room is not on a draft or scheduled paper."
          columns={[
            { title: "Examination", key: "examination", render: (value) => value?.title || "N/A" },
            { title: "Subject", key: "subject", render: (value) => value?.name || "N/A" },
            { title: "Date", key: "date", render: (value) => value ? String(value).slice(0, 10) : "N/A" },
            { title: "Session", key: "session", render: (value) => value?.name || "N/A" },
            { title: "Status", key: "status", render: (value) => <StatusBadge status={value} size="sm" /> },
          ]}
        />
      </div>
    </div>
  );
};

export default RoomDetailPage;
