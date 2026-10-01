import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import { subjectService } from "../../services/resourceService";

const Row = ({ label, value }) => (
  <div className="phase1-detail-row">
    <span>{label}</span>
    <strong>{value || "N/A"}</strong>
  </div>
);

const SubjectDetailPage = () => {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await subjectService.get(id);
      setItem(response.data);
    } catch (err) {
      setError(err.message || "Subject not found");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  if (isLoading) return <LoadingState message="Loading subject..." />;
  if (error || !item) return <ErrorState message={error || "Subject not found"} onRetry={load} />;

  return (
    <div className="animate-fade-in">
      <PageHeader title={item.name} subtitle={item.code} backUrl="/admin/subjects" badge={<StatusBadge status={item.status} />} />
      <div className="admin-panel-card phase1-detail">
        <Row label="Type" value={item.subjectType} />
        <Row label="Department" value={item.department?.name} />
        <Row label="Program" value={item.program?.name} />
        <Row label="Semester" value={item.semester} />
        <Row label="Duration" value={item.duration ? `${item.duration} minutes` : ""} />
        <Row label="Credits" value={typeof item.credits === "number" ? item.credits : ""} />
        <Row label="Verification" value={item.verificationStatus} />
        <Row label="Description" value={item.description} />
      </div>
    </div>
  );
};

export default SubjectDetailPage;
