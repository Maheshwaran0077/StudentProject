import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ProtectedRoute from './ProtectedRoute';
import DashboardLayout from '../layouts/DashboardLayout';

// Pages
import Login from '../pages/Login';
import Register from '../pages/Register';
import Profile from '../pages/Profile';
import Notifications from '../pages/Notifications';
import Unauthorized from '../pages/Unauthorized';

// Student Pages
import StudentDashboard from '../pages/student/Dashboard';
import FacultyChat from '../pages/student/FacultyChat';
import StudentCare from '../pages/student/StudentCare';

// Faculty Pages
import FacultyDashboard from '../pages/faculty/Dashboard';

// Student Care Officer Pages
import OfficerDashboard from '../pages/officer/Dashboard';

// Admin Pages
import AdminDashboard from '../pages/admin/Dashboard';
import UserManagement from '../pages/admin/UserManagement';
import DepartmentManagement from '../pages/admin/DepartmentManagement';
import AuditLogs from '../pages/admin/AuditLogs';

// Helper component to redirect root / to the correct role dashboard
const RootRedirect = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case 'STUDENT':
      return <Navigate to="/student/dashboard" replace />;
    case 'FACULTY':
      return <Navigate to="/faculty/dashboard" replace />;
    case 'STUDENT_CARE_OFFICER':
      return <Navigate to="/officer/dashboard" replace />;
    case 'ADMIN':
      return <Navigate to="/admin/dashboard" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Protected Layout Routes */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {/* Index redirect to correct dashboard */}
        <Route index element={<RootRedirect />} />

        {/* Student Specific Routes */}
        <Route 
          path="student/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <StudentDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="student/faculty-chat" 
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <FacultyChat />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="student/student-care" 
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <StudentCare />
            </ProtectedRoute>
          } 
        />

        {/* Faculty Specific Routes */}
        <Route 
          path="faculty/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['FACULTY']}>
              <FacultyDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Student Care Officer Specific Routes */}
        <Route 
          path="officer/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['STUDENT_CARE_OFFICER']}>
              <OfficerDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Admin Specific Routes */}
        <Route 
          path="admin/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="admin/users" 
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <UserManagement />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="admin/departments" 
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <DepartmentManagement />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="admin/audit" 
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AuditLogs />
            </ProtectedRoute>
          } 
        />

        {/* Shared Routes */}
        <Route 
          path="profile" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="notifications" 
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          } 
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
