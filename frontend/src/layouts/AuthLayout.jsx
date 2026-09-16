import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { BookOpen, ShieldCheck, Award, Calendar } from 'lucide-react';
import './AuthLayout.css';

const AuthLayout = () => {
  return (
    <div className="auth-layout-container">
      <div className="auth-card-wrapper animate-fade-in">
        <div className="auth-brand-header">
          <Link to="/login" className="auth-brand-logo">
            <div className="auth-logo-icon">
              <BookOpen size={24} />
            </div>
            <div className="auth-brand-text">
              <span className="auth-brand-name">ExamPortal</span>
              <span className="auth-brand-tag">Academic Information System</span>
            </div>
          </Link>
        </div>

        <div className="auth-content-body">
          <Outlet />
        </div>

        <div className="auth-footer-features">
          <div className="auth-feature-pill">
            <ShieldCheck size={14} />
            <span>Official University System</span>
          </div>
          <div className="auth-feature-pill">
            <Calendar size={14} />
            <span>Fall 2026 Academic Session</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
