import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { roleLabel } from '../../utils/roles';
import PageHeader from '../../components/common/PageHeader';

const FacultyDashboard = () => {
  const { user } = useAuth();
  const label = roleLabel(user?.role);

  return (
    <div className="admin-dashboard-page animate-fade-in">
      <PageHeader
        title={`${label} dashboard`}
        subtitle={`${user?.name || 'N/A'} · ${user?.email || 'N/A'}`}
      />
      <div className="admin-panel-card">
        <h3 className="admin-panel-title">{user?.name || 'N/A'}</h3>
        <p className="admin-panel-subtitle">{user?.email || 'N/A'}</p>
        <p>Role: {label}</p>
        <p>No examination duties are assigned yet.</p>
      </div>
    </div>
  );
};

export default FacultyDashboard;
