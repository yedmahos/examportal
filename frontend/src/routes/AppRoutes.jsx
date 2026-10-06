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
import FacultyPage from '../pages/admin/FacultyPage';
import FacultyNote from '../pages/faculty/FacultyNote';
import FacultyDashboard from '../pages/faculty/FacultyDashboard';
import DepartmentAdminDashboard from '../pages/department/DepartmentAdminDashboard';
import ExaminationCellDashboard from '../pages/examination/ExaminationCellDashboard';
import SuperAdminDashboard from '../pages/superadmin/SuperAdminDashboard';
import StudentScheduleDetail from '../pages/student/StudentScheduleDetail';

// Common
import NotFound from '../pages/NotFound';

const RootRedirect = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role) {
    return <Navigate to={roleHome(user.role)} replace />;
  }

  return <Navigate to="/login" replace />;
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
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/schedule" element={<StudentExams />} />
        <Route path="/student/results" element={<StudentResults />} />
        <Route path="/student/notifications" element={<StudentNotifications />} />
        <Route path="/student/profile" element={<StudentProfile />} />
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
        <Route path="/admin/students" element={<RoleGate roles={["super_admin", "department_admin", "examination_cell"]}><AdminStudents /></RoleGate>} />
        <Route path="/admin/students/:id" element={<RoleGate roles={["super_admin", "department_admin", "examination_cell"]}><AdminStudentDetail /></RoleGate>} />
        <Route path="/admin/exams" element={<RoleGate roles={["super_admin", "examination_cell"]}><AdminExams /></RoleGate>} />
        <Route path="/admin/exams/:id" element={<RoleGate roles={["super_admin", "examination_cell"]}><AdminExamDetail /></RoleGate>} />
        <Route path="/admin/results" element={<RoleGate roles={["super_admin"]}><AdminResults /></RoleGate>} />
        <Route path="/admin/results/:id" element={<RoleGate roles={["super_admin"]}><AdminResultDetail /></RoleGate>} />
        <Route path="/admin/announcements" element={<RoleGate roles={["super_admin"]}><AdminAnnouncements /></RoleGate>} />
        <Route path="/admin/announcements/:id" element={<RoleGate roles={["super_admin"]}><AdminAnnouncementDetail /></RoleGate>} />
        <Route path="/admin/faculty" element={<RoleGate roles={["super_admin"]}><FacultyPage /></RoleGate>} />
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
        <Route path="/faculty/dashboard" element={<RoleGate roles={["faculty"]}><FacultyDashboard /></RoleGate>} />
        <Route path="/faculty/duties" element={<RoleGate roles={["faculty"]}><FacultyNote title="My Duties" message="No examination duties are assigned yet." /></RoleGate>} />
        <Route path="/faculty/schedule" element={<RoleGate roles={["faculty"]}><FacultyNote title="My Schedule" message="Assigned schedules will appear here when duties are published." /></RoleGate>} />
        <Route path="/faculty/notifications" element={<RoleGate roles={["faculty"]}><StudentNotifications /></RoleGate>} />
        <Route path="/faculty/profile" element={<RoleGate roles={["faculty"]}><AdminProfile /></RoleGate>} />
        <Route path="/department-admin/dashboard" element={<RoleGate roles={["department_admin"]}><DepartmentAdminDashboard /></RoleGate>} />
        <Route path="/department-admin/students" element={<RoleGate roles={["department_admin"]}><AdminStudents /></RoleGate>} />
        <Route path="/department-admin/subjects" element={<RoleGate roles={["department_admin"]}><SubjectsPage /></RoleGate>} />
        <Route path="/department-admin/batches" element={<RoleGate roles={["department_admin"]}><StructurePage resource="batches" /></RoleGate>} />
        <Route path="/department-admin/registrations" element={<RoleGate roles={["department_admin"]}><EnrollmentPage /></RoleGate>} />
        <Route path="/department-admin/eligibility" element={<RoleGate roles={["department_admin"]}><EligibilityPage /></RoleGate>} />
        <Route path="/department-admin/schedules" element={<RoleGate roles={["department_admin"]}><SchedulesPage /></RoleGate>} />
        <Route path="/department-admin/notifications" element={<RoleGate roles={["department_admin"]}><StudentNotifications /></RoleGate>} />
        <Route path="/department-admin/profile" element={<RoleGate roles={["department_admin"]}><AdminProfile /></RoleGate>} />
        <Route path="/examination-cell/dashboard" element={<RoleGate roles={["examination_cell"]}><ExaminationCellDashboard /></RoleGate>} />
        <Route path="/examination-cell/structure" element={<RoleGate roles={["examination_cell"]}><StructurePage resource="departments" /></RoleGate>} />
        <Route path="/examination-cell/examinations" element={<RoleGate roles={["examination_cell"]}><ExaminationsPage /></RoleGate>} />
        <Route path="/examination-cell/subjects" element={<RoleGate roles={["examination_cell"]}><SubjectsPage /></RoleGate>} />
        <Route path="/examination-cell/eligibility" element={<RoleGate roles={["examination_cell"]}><EligibilityPage /></RoleGate>} />
        <Route path="/examination-cell/schedules" element={<RoleGate roles={["examination_cell"]}><SchedulesPage /></RoleGate>} />
        <Route path="/examination-cell/rooms" element={<RoleGate roles={["examination_cell"]}><RoomsPage /></RoleGate>} />
        <Route path="/examination-cell/notifications" element={<RoleGate roles={["examination_cell"]}><StudentNotifications /></RoleGate>} />
        <Route path="/examination-cell/profile" element={<RoleGate roles={["examination_cell"]}><AdminProfile /></RoleGate>} />
        <Route path="/super-admin/dashboard" element={<RoleGate roles={["super_admin"]}><SuperAdminDashboard /></RoleGate>} />
        <Route path="/super-admin/users" element={<RoleGate roles={["super_admin"]}><FacultyPage /></RoleGate>} />
        <Route path="/super-admin/departments" element={<RoleGate roles={["super_admin"]}><StructurePage resource="departments" /></RoleGate>} />
        <Route path="/super-admin/configuration" element={<RoleGate roles={["super_admin"]}><StructurePage resource="academicYears" /></RoleGate>} />
        <Route path="/super-admin/examinations" element={<RoleGate roles={["super_admin"]}><ExaminationsPage /></RoleGate>} />
        <Route path="/super-admin/subjects" element={<RoleGate roles={["super_admin"]}><SubjectsPage /></RoleGate>} />
        <Route path="/super-admin/eligibility" element={<RoleGate roles={["super_admin"]}><EligibilityPage /></RoleGate>} />
        <Route path="/super-admin/schedules" element={<RoleGate roles={["super_admin"]}><SchedulesPage /></RoleGate>} />
        <Route path="/super-admin/rooms" element={<RoleGate roles={["super_admin"]}><RoomsPage /></RoleGate>} />
        <Route path="/super-admin/notifications" element={<RoleGate roles={["super_admin"]}><StudentNotifications /></RoleGate>} />
        <Route path="/super-admin/profile" element={<RoleGate roles={["super_admin"]}><AdminProfile /></RoleGate>} />
      </Route>

      {/* Fallback 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
