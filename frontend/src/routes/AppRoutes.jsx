import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ProtectedRoute, PublicRoute, RoleGate, STAFF_ROLES } from './RouteGuards';
import { roleHome } from '../utils/roles';

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
import StructurePage from '../pages/admin/StructurePage';
import CatalogPage from '../pages/admin/CatalogPage';
import SubjectsPage from '../pages/admin/SubjectsPage';
import SubjectDetailPage from '../pages/admin/SubjectDetailPage';
import ExaminationsPage from '../pages/admin/ExaminationsPage';
import EligibilityPage from '../pages/admin/EligibilityPage';
import EnrollmentPage from '../pages/admin/EnrollmentPage';
import SchedulesPage from '../pages/admin/SchedulesPage';
import RoomsPage from '../pages/admin/RoomsPage';
import RoomDetailPage from '../pages/admin/RoomDetailPage';
import StudentScheduleDetail from '../pages/student/StudentScheduleDetail';

// Common
import NotFound from '../pages/NotFound';

const RootRedirect = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role && user.role !== 'student') {
    return <Navigate to={roleHome(user.role)} replace />;
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
        <Route path="/exams/schedule/:id" element={<StudentScheduleDetail />} />
        <Route path="/exams/:id" element={<StudentExamDetail />} />
        <Route path="/results" element={<StudentResults />} />
        <Route path="/results/:id" element={<StudentResultDetail />} />
        <Route path="/notifications" element={<StudentNotifications />} />
        <Route path="/profile" element={<StudentProfile />} />
      </Route>

      {/* Admin Protected Routes */}
      <Route
        element={
          <ProtectedRoute allowedRoles={STAFF_ROLES}>
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
        <Route path="/admin/academic-years" element={<RoleGate roles={["super_admin"]}><StructurePage resource="academicYears" /></RoleGate>} />
        <Route path="/admin/departments" element={<RoleGate roles={["super_admin", "department_admin", "examination_cell"]}><StructurePage resource="departments" /></RoleGate>} />
        <Route path="/admin/programs" element={<RoleGate roles={["super_admin", "department_admin", "examination_cell"]}><StructurePage resource="programs" /></RoleGate>} />
        <Route path="/admin/batches" element={<RoleGate roles={["super_admin", "department_admin", "examination_cell"]}><StructurePage resource="batches" /></RoleGate>} />
        <Route path="/admin/sections" element={<RoleGate roles={["super_admin", "department_admin", "examination_cell"]}><StructurePage resource="sections" /></RoleGate>} />
        <Route path="/admin/exam-types" element={<RoleGate roles={["super_admin", "examination_cell", "department_admin"]}><CatalogPage kind="examTypes" /></RoleGate>} />
        <Route path="/admin/sessions" element={<RoleGate roles={["super_admin", "examination_cell", "department_admin"]}><CatalogPage kind="sessions" /></RoleGate>} />
        <Route path="/admin/examinations" element={<RoleGate roles={["super_admin", "examination_cell"]}><ExaminationsPage /></RoleGate>} />
        <Route path="/admin/subjects" element={<RoleGate roles={["super_admin", "examination_cell", "department_admin"]}><SubjectsPage /></RoleGate>} />
        <Route path="/admin/subjects/:id" element={<RoleGate roles={["super_admin", "examination_cell", "department_admin"]}><SubjectDetailPage /></RoleGate>} />
        <Route path="/admin/enrollments" element={<RoleGate roles={["super_admin", "examination_cell", "department_admin"]}><EnrollmentPage /></RoleGate>} />
        <Route path="/admin/eligibility" element={<RoleGate roles={["super_admin", "examination_cell", "department_admin"]}><EligibilityPage /></RoleGate>} />
        <Route path="/admin/schedules" element={<RoleGate roles={["super_admin", "examination_cell", "department_admin"]}><SchedulesPage /></RoleGate>} />
        <Route path="/admin/rooms" element={<RoleGate roles={["super_admin", "examination_cell"]}><RoomsPage /></RoleGate>} />
        <Route path="/admin/rooms/:id" element={<RoleGate roles={["super_admin", "examination_cell"]}><RoomDetailPage /></RoleGate>} />
        <Route path="/admin/profile" element={<AdminProfile />} />
      </Route>

      {/* Fallback 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
