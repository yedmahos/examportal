import React from "react";
import PageHeader from "../../components/common/PageHeader";

const FacultyDuties = ({ title, subtitle, message }) => (
  <div className="animate-fade-in">
    <PageHeader title={title} subtitle={subtitle} />
    <div className="admin-panel-card">
      <p>{message}</p>
    </div>
  </div>
);

export default FacultyDuties;
