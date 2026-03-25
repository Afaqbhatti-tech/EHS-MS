import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './pages/dashboard/DashboardPage';
import PlaceholderPage from './pages/PlaceholderPage';
import LoginPage from './pages/auth/LoginPage';
import SetupPasswordPage from './pages/auth/SetupPasswordPage';
import UsersPage from './pages/admin/UsersPage';
import RoleManagementPage from './pages/admin/RoleManagementPage';
import RoleDetailPage from './pages/admin/RoleDetailPage';
import ReportsPage from './pages/reports/ReportsPage';
import RamsBoardPage from './pages/rams/RamsBoardPage';
import WorkLineDetailPage from './pages/rams/WorkLineDetailPage';
import NewRamsDocumentPage from './pages/rams/NewRamsDocumentPage';
import MyProfilePage from './pages/MyProfilePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/setup-password" element={<SetupPasswordPage />} />

            {/* Protected app routes */}
            <Route element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }>
              {/* Overview */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/profile" element={<MyProfilePage />} />
              <Route path="/ai-intelligence" element={<PlaceholderPage />} />

              {/* Daily Operations */}
              <Route path="/observations" element={<PlaceholderPage />} />
              <Route path="/observation-analytics" element={<PlaceholderPage />} />
              <Route path="/permits" element={<PlaceholderPage />} />
              <Route path="/manpower" element={<PlaceholderPage />} />
              <Route path="/checklists" element={<PlaceholderPage />} />

              {/* Procedures & Meetings */}
              <Route path="/mockup-register" element={<PlaceholderPage />} />
              <Route path="/weekly-mom" element={<PlaceholderPage />} />

              {/* People & Assets */}
              <Route path="/training-matrix" element={<PlaceholderPage />} />
              <Route path="/equipment" element={<PlaceholderPage />} />
              <Route path="/violations" element={<PlaceholderPage />} />

              {/* Incidents & Emergency */}
              <Route path="/incidents" element={<PlaceholderPage />} />
              <Route path="/incident-analytics" element={<PlaceholderPage />} />
              <Route path="/mock-drills" element={<PlaceholderPage />} />

              {/* Permits */}
              <Route path="/permits/calendar" element={<PlaceholderPage />} />
              <Route path="/permit-amendments" element={<PlaceholderPage />} />

              {/* Documents */}
              <Route path="/document-control" element={<PlaceholderPage />} />
              <Route path="/rams-board" element={
                <ProtectedRoute permission="can_access_rams">
                  <RamsBoardPage />
                </ProtectedRoute>
              } />
              <Route path="/rams-board/new" element={
                <ProtectedRoute permission="can_upload_rams">
                  <NewRamsDocumentPage />
                </ProtectedRoute>
              } />
              <Route path="/rams-board/:slug" element={
                <ProtectedRoute permission="can_access_rams">
                  <WorkLineDetailPage />
                </ProtectedRoute>
              } />
              <Route path="/campaigns" element={<PlaceholderPage />} />
              <Route path="/poster-generator" element={<PlaceholderPage />} />

              {/* Environmental */}
              <Route path="/environmental" element={<PlaceholderPage />} />
              <Route path="/environmental/waste-manifests" element={<PlaceholderPage />} />
              <Route path="/environmental/contractor-records" element={<PlaceholderPage />} />

              {/* Analytics & Admin */}
              <Route path="/reports" element={
                <ProtectedRoute permission="can_access_kpis_reports">
                  <ReportsPage />
                </ProtectedRoute>
              } />
              <Route path="/kpis-reports" element={<Navigate to="/reports" replace />} />
              <Route path="/admin/users" element={
                <ProtectedRoute permission="can_manage_users">
                  <UsersPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/roles" element={
                <ProtectedRoute permission="can_manage_roles">
                  <RoleManagementPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/roles/:role" element={
                <ProtectedRoute permission="can_manage_roles">
                  <RoleDetailPage />
                </ProtectedRoute>
              } />
              <Route path="/users-permissions" element={<Navigate to="/admin/users" replace />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
