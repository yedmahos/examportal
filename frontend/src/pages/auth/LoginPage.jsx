import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, UserCheck, Shield, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import FormField from '../../components/common/FormField';
import { useToast } from '../../components/common/Toast';
import './AuthPages.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const from = location.state?.from?.pathname;

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
      if (from) {
        navigate(from, { replace: true });
      } else if (user.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Login failed. Please check your credentials.';
      setAuthError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = async (role) => {
    setAuthError('');
    let demoEmail = 'student@example.com';
    let demoPass = 'student123';

    if (role === 'admin') {
      demoEmail = 'admin@example.com';
      demoPass = 'admin123';
    }

    setEmail(demoEmail);
    setPassword(demoPass);
    setIsSubmitting(true);

    try {
      const user = await login(demoEmail, demoPass);
      showToast(`Signed in as demo ${role}`, 'success');
      if (role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setAuthError(err.message);
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
          <button
            type="button"
            className="demo-btn student-demo-btn"
            onClick={() => handleQuickDemo('student')}
            disabled={isSubmitting}
          >
            <UserCheck size={16} className="demo-btn-icon" />
            <div className="demo-btn-text">
              <span className="demo-role-name">Student Account</span>
              <span className="demo-creds">student@example.com</span>
            </div>
            <ArrowRight size={14} className="demo-arrow" />
          </button>

          <button
            type="button"
            className="demo-btn admin-demo-btn"
            onClick={() => handleQuickDemo('admin')}
            disabled={isSubmitting}
          >
            <Shield size={16} className="demo-btn-icon" />
            <div className="demo-btn-text">
              <span className="demo-role-name">Admin Officer</span>
              <span className="demo-creds">admin@example.com</span>
            </div>
            <ArrowRight size={14} className="demo-arrow" />
          </button>
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
