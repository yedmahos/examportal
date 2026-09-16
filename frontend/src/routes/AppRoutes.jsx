import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ProtectedRoute, PublicRoute } from './RouteGuards';

// Layouts
import AuthLayout from '../layouts/AuthLayout';
import StudentLayout from '../layouts/StudentLayout';
import AdminLayout from '../layouts/AdminLayout';

// Auth Pages
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';

// Student Pages
import StudentDashboard from '../pages/student/StudentDashboard';
import StudentExams from '../pages/student/StudentExams';
import StudentExamDetail from '../pages/student/StudentExamDetail';
import StudentResults from '../pages/student/StudentResults';
import StudentResultDetail from '../pages/student/StudentResultDetail';
import StudentNotifications from '../pages/student/StudentNotifications';
import StudentProfile from '../pages/student/StudentProfile';

// Admin Pages
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminStudents from '../pages/admin/AdminStudents';
import AdminStudentDetail from '../pages/admin/AdminStudentDetail';
import AdminExams from '../pages/admin/AdminExams';
import AdminExamDetail from '../pages/admin/AdminExamDetail';
import AdminResults from '../pages/admin/AdminResults';
import AdminResultDetail from '../pages/admin/AdminResultDetail';
import AdminAnnouncements from '../pages/admin/AdminAnnouncements';
import AdminAnnouncementDetail from '../pages/admin/AdminAnnouncementDetail';
import AdminProfile from '../pages/admin/AdminProfile';

// Common
import NotFound from '../pages/NotFound';

const RootRedirect = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Public / Authentication Routes */}
      <Route
        element={
          <PublicRoute>
            <AuthLayout />
          </PublicRoute>
        }
      >
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Student Protected Routes */}
      <Route
        element={
          <ProtectedRoute allowedRole="student">
            <StudentLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<StudentDashboard />} />
        <Route path="/exams" element={<StudentExams />} />
        <Route path="/exams/:id" element={<StudentExamDetail />} />
        <Route path="/results" element={<StudentResults />} />
        <Route path="/results/:id" element={<StudentResultDetail />} />
        <Route path="/notifications" element={<StudentNotifications />} />
        <Route path="/profile" element={<StudentProfile />} />
      </Route>

      {/* Admin Protected Routes */}
      <Route
        element={
          <ProtectedRoute allowedRole="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/students" element={<AdminStudents />} />
        <Route path="/admin/students/:id" element={<AdminStudentDetail />} />
        <Route path="/admin/exams" element={<AdminExams />} />
        <Route path="/admin/exams/:id" element={<AdminExamDetail />} />
        <Route path="/admin/results" element={<AdminResults />} />
        <Route path="/admin/results/:id" element={<AdminResultDetail />} />
        <Route path="/admin/announcements" element={<AdminAnnouncements />} />
        <Route path="/admin/announcements/:id" element={<AdminAnnouncementDetail />} />
        <Route path="/admin/profile" element={<AdminProfile />} />
      </Route>

      {/* Fallback 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
