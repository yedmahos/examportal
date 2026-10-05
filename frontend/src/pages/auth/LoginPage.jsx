import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, GraduationCap, BookOpen, Building2, ClipboardCheck, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { roleHome } from '../../utils/roles';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import FormField from '../../components/common/FormField';
import { useToast } from '../../components/common/Toast';
import './AuthPages.css';

const demoAccounts = [
  { key: 'student', label: 'Student', email: 'student@example.com', password: 'student123', icon: GraduationCap },
  { key: 'faculty', label: 'Faculty', email: 'faculty@example.com', password: 'Faculty@12345', icon: BookOpen },
  { key: 'department_admin', label: 'Department Admin', email: 'department.admin@example.com', password: 'DepartmentAdmin@12345', icon: Building2 },
  { key: 'examination_cell', label: 'Examination Cell', email: 'examination.cell@example.com', password: 'ExaminationCell@12345', icon: ClipboardCheck },
  { key: 'super_admin', label: 'Super Admin', email: 'super.admin@example.com', password: 'SuperAdmin@12345', icon: ShieldCheck },
];

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const validate = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const user = await login(email, password);
      showToast(`Welcome back, ${user.name}!`, 'success');
      navigate(roleHome(user.role), { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Login failed. Please check your credentials.';
      setAuthError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = async (account) => {
    setAuthError('');
    setEmail(account.email);
    setPassword(account.password);
    setIsSubmitting(true);

    try {
      const user = await login(account.email, account.password);
      showToast(`Welcome back, ${user.name}!`, 'success');
      navigate(roleHome(user.role), { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Demo sign-in failed.';
      setAuthError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-header-text">
        <h2 className="auth-title">Sign In to Your Account</h2>
        <p className="auth-subtitle">
          Access your exam schedules, academic results, and university notices.
        </p>
      </div>

      {/* Quick Demo Access Box */}
      <div className="demo-accounts-box">
        <div className="demo-box-header">
          <span className="demo-box-title">Quick Demo Sign In</span>
          <span className="demo-badge">One-Click</span>
        </div>
        <p className="demo-box-hint">
          Select a role below to automatically authenticate with pre-configured credentials:
        </p>
        <div className="demo-btns-grid">
          {demoAccounts.map((account) => {
            const Icon = account.icon;
            return (
              <button
                key={account.key}
                type="button"
                className="demo-btn"
                onClick={() => handleQuickDemo(account)}
                disabled={isSubmitting}
              >
                <Icon size={16} className="demo-btn-icon" />
                <div className="demo-btn-text">
                  <span className="demo-role-name">{account.label}</span>
                  <span className="demo-creds">{account.email}</span>
                </div>
                <ArrowRight size={14} className="demo-arrow" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="auth-divider">
        <span>or sign in manually</span>
      </div>

      {authError && (
        <div className="auth-alert-error" role="alert">
          {authError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="auth-form">
        <FormField label="Email Address" required error={errors.email}>
          <Input
            type="email"
            placeholder="student@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
            }}
            icon={Mail}
            error={!!errors.email}
            disabled={isSubmitting}
          />
        </FormField>

        <FormField label="Password" required error={errors.password}>
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
            }}
            icon={Lock}
            endIcon={showPassword ? EyeOff : Eye}
            onEndIconClick={() => setShowPassword(!showPassword)}
            error={!!errors.password}
            disabled={isSubmitting}
          />
        </FormField>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isSubmitting}
          className="auth-submit-btn"
        >
          Sign In
        </Button>
      </form>

      <div className="auth-switch-prompt">
        <span>Don't have a student account yet?</span>
        <Link to="/register" className="auth-switch-link">
          Register here
        </Link>
      </div>
    </div>
  );
};

export default LoginPage;
