import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Download } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import Button from "../../components/common/Button";
import { useToast } from "../../components/common/Toast";
import { scheduleService, seatingService } from "../../services/resourceService";
import { hallTicketService } from "../../services/hallTicketService";
import "../admin/AdminPages.css";

const SEAT_UNAVAILABLE = "Hall ticket is not available because seat allocation has not been published yet.";
const CANCELLED = "Hall ticket is unavailable for this cancelled examination.";

const Line = ({ label, value, empty = "N/A" }) => (
  <div className="phase1-detail-row">
    <span>{label}</span>
    <strong>{value || empty}</strong>
  </div>
);

const StudentScheduleDetail = () => {
  const { id } = useParams();
  const { showToast } = useToast();
  const [item, setItem] = useState(null);
  const [allocations, setAllocations] = useState([]);
  const [seat, setSeat] = useState(null);
  const [seatNotice, setSeatNotice] = useState("");
  const [error, setError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

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
          if (active) {
            setSeat(seating.item || null);
            setSeatNotice("");
          }
        } catch (err) {
          if (active) {
            setSeat(null);
            setSeatNotice(err.message || "");
          }
        }
      })
      .catch((err) => { if (active) setError(err.message || "Schedule not found"); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [id]);

  if (isLoading) return <LoadingState message="Loading your examination..." />;
  if (error || !item) return <ErrorState message={error || "Schedule not found"} />;

  const cancelled = item.operationalState === "cancelled";
  const available = Boolean(seat?.seatNumber) && !cancelled;
  const reason = cancelled
    ? CANCELLED
    : available
      ? ""
      : (seatNotice && seatNotice !== "Seat allocation has not been published yet."
        ? seatNotice
        : SEAT_UNAVAILABLE);

  const download = async () => {
    if (!available || isDownloading) return;
    setIsDownloading(true);
    setDownloadError("");
    try {
      await hallTicketService.download(id);
      showToast("Hall ticket downloaded", "success");
    } catch (err) {
      const message = err.message || "Hall ticket is unavailable.";
      setDownloadError(message);
      showToast(message, "error");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={item.subject?.name || "Examination"}
        subtitle={item.examination?.title || ""}
        backUrl="/exams"
        badge={<StatusBadge status={item.status} />}
        actions={(
          <div className="hall-ticket-action">
            <Button
              icon={Download}
              isLoading={isDownloading}
              disabled={!available}
              onClick={download}
              data-testid="download-hall-ticket"
            >
              {available || isDownloading ? "Download Hall Ticket" : "Hall Ticket unavailable"}
            </Button>
            {!available && reason ? <p className="hall-ticket-reason" data-testid="hall-ticket-reason">{reason}</p> : null}
            {downloadError ? <p className="hall-ticket-reason">{downloadError}</p> : null}
          </div>
        )}
      />
      <div className="admin-panel-card phase1-detail">
        <Line label="Examination" value={item.examination?.title} />
        <Line label="Subject" value={item.subject?.name} />
        <Line label="Subject code" value={item.subject?.code} />
        <Line label="Date" value={item.date ? new Date(item.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }) : ""} />
        <Line label="Session" value={item.session?.name} />
        <Line label="Start time" value={item.session?.startTime} />
        <Line label="End time" value={item.session?.endTime} />
        <Line label="Reporting time" value={item.reportingTime || item.session?.reportingTime} />
        <Line label="Room" value={seat?.room || item.room?.roomNumber || allocations.map((allocation) => allocation.room?.roomNumber).filter(Boolean).join(", ")} />
        <Line label="Building" value={seat?.building || item.room?.building || allocations.map((allocation) => allocation.room?.building).filter(Boolean).join(", ")} />
        <Line label="Seat number" value={seat?.seatNumber} empty="Seat allocation has not been published yet." />
        <Line label="Duration" value={item.duration ? `${item.duration} minutes` : ""} />
        <Line label="Instructions" value={item.examination?.instructions} />
        {!available ? <Line label="Hall ticket" value={reason} /> : null}
      </div>
    </div>
  );
};

export default StudentScheduleDetail;
