import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, Hash, BookOpen, GraduationCap, Phone, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import FormField from '../../components/common/FormField';
import { useToast } from '../../components/common/Toast';
import './AuthPages.css';

const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Electrical Engineering',
  'Information Technology',
  'Data Science & AI',
  'Mechanical Engineering',
  'Business Administration',
];

const PROGRAMS = [
  'B.Sc. in Software Engineering',
  'B.Sc. in Computer Science',
  'B.Sc. in Artificial Intelligence',
  'B.Sc. in Cybersecurity',
  'B.Eng. in Electronics & Communication',
  'B.Eng. in Robotics',
];

const SEMESTERS = [
  '1st Semester',
  '2nd Semester',
  '3rd Semester',
  '4th Semester',
  '5th Semester',
  '6th Semester',
  '7th Semester',
  '8th Semester',
];

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    studentId: '',
    department: 'Computer Science & Engineering',
    program: 'B.Sc. in Software Engineering',
    semester: '1st Semester',
    academicYear: '2025 - 2026',
    phone: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Full name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (!formData.studentId.trim()) newErrors.studentId = 'Student ID is required';
    if (!formData.phone.trim()) newErrors.phone = 'Contact number is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const user = await register(formData);
      showToast(`Account successfully created for ${user.name}!`, 'success');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Registration failed.';
      setAuthError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-header-text">
        <h2 className="auth-title">Student Registration</h2>
        <p className="auth-subtitle">
          Register your official academic identity to access the Exam Management Portal.
        </p>
      </div>

      {authError && (
        <div className="auth-alert-error" role="alert">
          {authError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="auth-form">
        <div className="form-grid-two">
          <FormField label="Full Name" required error={errors.name}>
            <Input
              name="name"
              placeholder="e.g. Rohmad Khoirudin"
              value={formData.name}
              onChange={handleChange}
              icon={User}
              error={!!errors.name}
              disabled={isSubmitting}
            />
          </FormField>

          <FormField label="Student ID" required error={errors.studentId}>
            <Input
              name="studentId"
              placeholder="e.g. STU-2026-9041"
              value={formData.studentId}
              onChange={handleChange}
              icon={Hash}
              error={!!errors.studentId}
              disabled={isSubmitting}
            />
          </FormField>
        </div>

        <div className="form-grid-two">
          <FormField label="Institutional Email" required error={errors.email}>
            <Input
              type="email"
              name="email"
              placeholder="student@campus.edu"
              value={formData.email}
              onChange={handleChange}
              icon={Mail}
              error={!!errors.email}
              disabled={isSubmitting}
            />
          </FormField>

          <FormField label="Password" required error={errors.password}>
            <Input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="At least 6 characters"
              value={formData.password}
              onChange={handleChange}
              icon={Lock}
              endIcon={showPassword ? EyeOff : Eye}
              onEndIconClick={() => setShowPassword(!showPassword)}
              error={!!errors.password}
              disabled={isSubmitting}
            />
          </FormField>
        </div>

        <div className="form-grid-two">
          <FormField label="Department" required>
            <Select
              name="department"
              value={formData.department}
              options={DEPARTMENTS}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </FormField>

          <FormField label="Degree Program" required>
            <Select
              name="program"
              value={formData.program}
              options={PROGRAMS}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </FormField>
        </div>

        <div className="form-grid-three">
          <FormField label="Current Semester" required>
            <Select
              name="semester"
              value={formData.semester}
              options={SEMESTERS}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </FormField>

          <FormField label="Academic Year" required>
            <Input
              name="academicYear"
              value={formData.academicYear}
              onChange={handleChange}
              icon={Calendar}
              disabled={isSubmitting}
            />
          </FormField>

          <FormField label="Phone Number" required error={errors.phone}>
            <Input
              type="tel"
              name="phone"
              placeholder="+1 (555) 000-0000"
              value={formData.phone}
              onChange={handleChange}
              icon={Phone}
              error={!!errors.phone}
              disabled={isSubmitting}
            />
          </FormField>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isSubmitting}
          className="auth-submit-btn"
        >
          Create Student Account
        </Button>
      </form>

      <div className="auth-switch-prompt">
        <span>Already have an account?</span>
        <Link to="/login" className="auth-switch-link">
          Sign In
        </Link>
      </div>
    </div>
  );
};

export default RegisterPage;
