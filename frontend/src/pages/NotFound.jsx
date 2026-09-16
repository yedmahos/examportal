import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';

const NotFound = () => {
  const { user, isAuthenticated } = useAuth();

  const homeUrl = !isAuthenticated
    ? '/login'
    : user?.role === 'admin'
    ? '/admin/dashboard'
    : '/dashboard';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '24px',
      backgroundColor: 'var(--color-bg)',
    }}>
      <div style={{
        width: '68px',
        height: '68px',
        borderRadius: '50%',
        backgroundColor: 'var(--color-primary-light)',
        color: 'var(--color-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '20px',
      }}>
        <AlertTriangle size={36} />
      </div>

      <h1 style={{
        fontSize: '2.5rem',
        fontWeight: '800',
        color: 'var(--color-text-primary)',
        marginBottom: '8px',
      }}>
        404 — Page Not Found
      </h1>

      <p style={{
        fontSize: '1rem',
        color: 'var(--color-text-secondary)',
        maxWidth: '480px',
        marginBottom: '28px',
        lineHeight: 1.5,
      }}>
        The examination resource, student record, or portal page you requested could not be located on the server.
      </p>

      <div style={{ display: 'flex', gap: '12px' }}>
        <Link to={homeUrl}>
          <Button variant="primary" size="md" icon={Home}>
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
