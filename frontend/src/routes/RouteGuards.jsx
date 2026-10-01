import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingState from '../components/common/LoadingState';
import { canAccess, roleHome, STAFF_ROLES } from '../utils/roles';

export const ProtectedRoute = ({ children, allowedRole, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const roles = allowedRoles || (allowedRole ? [allowedRole] : []);

  if (isLoading) {
    return <LoadingState fullScreen message="Authenticating session..." />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles.length && !canAccess(user.role, roles)) {
    return <Navigate to={roleHome(user.role)} replace />;
  }

  return children;
};

export const RoleGate = ({ roles, children }) => {
  const { role } = useAuth();

  if (!canAccess(role, roles)) {
    return (
      <div className="admin-panel-card">
        <h3>Access denied</h3>
        <p>Your role cannot use this section.</p>
      </div>
    );
  }

  return children;
};

export { STAFF_ROLES };

export const PublicRoute = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingState fullScreen message="Loading portal..." />;
  }

  if (isAuthenticated && user) {
    return <Navigate to={roleHome(user.role)} replace />;
  }

  return children;
};
