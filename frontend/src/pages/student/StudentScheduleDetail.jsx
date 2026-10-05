import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import { scheduleService, seatingService } from "../../services/resourceService";

const Line = ({ label, value, empty = "N/A" }) => (
  <div className="phase1-detail-row">
    <span>{label}</span>
    <strong>{value || empty}</strong>
  </div>
);

const StudentScheduleDetail = () => {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [allocations, setAllocations] = useState([]);
  const [seat, setSeat] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    scheduleService.get(id)
      .then(async (response) => {
        if (!active) return;
        setItem(response.data);
        setAllocations(Array.isArray(response.allocations) ? response.allocations : []);
        try {
          const seating = await seatingService.mine(id);
          if (active) setSeat(seating.item || null);
        } catch {
          if (active) setSeat(null);
        }
      })
      .catch((err) => { if (active) setError(err.message || "Schedule not found"); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [id]);

  if (isLoading) return <LoadingState message="Loading your examination..." />;
  if (error || !item) return <ErrorState message={error || "Schedule not found"} />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={item.subject?.name || "Examination"}
        subtitle={item.examination?.title || ""}
        backUrl="/exams"
        badge={<StatusBadge status={item.status} />}
      />
      <div className="admin-panel-card phase1-detail">
        <Line label="Examination" value={item.examination?.title} />
        <Line label="Subject" value={item.subject?.name} />
        <Line label="Subject code" value={item.subject?.code} />
        <Line label="Date" value={item.date ? new Date(item.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : ""} />
        <Line label="Session" value={item.session?.name} />
        <Line label="Start time" value={item.session?.startTime} />
        <Line label="End time" value={item.session?.endTime} />
        <Line label="Reporting time" value={item.reportingTime || item.session?.reportingTime} />
        <Line label="Room" value={seat?.room || item.room?.roomNumber || allocations.map((allocation) => allocation.room?.roomNumber).filter(Boolean).join(", ")} />
        <Line label="Building" value={seat?.building || item.room?.building || allocations.map((allocation) => allocation.room?.building).filter(Boolean).join(", ")} />
        <Line label="Seat number" value={seat?.seatNumber} empty="Seat allocation has not been published yet." />
        <Line label="Duration" value={item.duration ? `${item.duration} minutes` : ""} />
        <Line label="Instructions" value={item.examination?.instructions} />
      </div>
    </div>
  );
};

export default StudentScheduleDetail;
