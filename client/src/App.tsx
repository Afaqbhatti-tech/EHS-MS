import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './pages/dashboard/DashboardPage';
import PlaceholderPage from './pages/PlaceholderPage';
import LoginPage from './pages/auth/LoginPage';
import SetupPasswordPage from './pages/auth/SetupPasswordPage';
import AccessManagementPage from './pages/admin/AccessManagementPage';
import RoleDetailPage from './pages/admin/RoleDetailPage';
import ReportsPage from './pages/reports/ReportsPage';
import RamsBoardPage from './pages/rams/RamsBoardPage';
import WorkLineDetailPage from './pages/rams/WorkLineDetailPage';
import NewRamsDocumentPage from './pages/rams/NewRamsDocumentPage';
import MyProfilePage from './pages/MyProfilePage';
import HelpSupportPage from './pages/HelpSupportPage';
import ObservationPage from './pages/observations/ObservationPage';
import PermitsPage from './pages/permits/PermitsPage';
import ManpowerPage from './pages/manpower/ManpowerPage';
import ChecklistPage from './pages/checklists/ChecklistPage';
import TrackerPage from './pages/tracker/TrackerPage';
import CategoryDetailPage from './pages/tracker/CategoryDetailPage';
import InspectionsPage from './pages/tracker/inspections/InspectionsPage';
import TotalItemRegisterPage from './pages/tracker/TotalItemRegisterPage';
import TrainingMatrixPage from './pages/training/TrainingMatrixPage';
import MockupRegisterPage from './pages/mockups/MockupRegisterPage';
import MomPage from './pages/MOM/MomPage';
import ViolationPage from './pages/violations/ViolationPage';
import RecycleBinPage from './pages/admin/RecycleBinPage';
import DocumentImportPage from './pages/imports/DocumentImportPage';
import EquipmentRegisterPage from './pages/equipment-register/EquipmentRegisterPage';
import IncidentRegisterPage from './pages/incidents/IncidentRegisterPage';
import DrillsPage from './pages/drills/DrillsPage';
import AmendmentsPage from './pages/permit-amendments/AmendmentsPage';
import CampaignsPage from './pages/campaigns/CampaignsPage';
import PostersPage from './pages/posters/PostersPage';
import PosterDesignPage from './pages/posters/PosterDesignPage';
import EnvironmentalPage from './pages/Environmental/EnvironmentalPage';
import ManifestsPage from './pages/WasteManifests/ManifestsPage';
import ContractorsPage from './pages/Contractors/ContractorsPage';
import DocumentsPage from './pages/Documents/DocumentsPage';
import AiPage from './pages/AI/AiPage';
import { ToastProvider } from './components/ui/Toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
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
              <Route path="/help-support" element={<HelpSupportPage />} />
              <Route path="/ai-intelligence" element={
                <ProtectedRoute permission="can_access_ai_intelligence">
                  <AiPage />
                </ProtectedRoute>
              } />

              {/* Daily Operations */}
              <Route path="/observations" element={
                <ProtectedRoute permission="can_access_observations">
                  <ObservationPage />
                </ProtectedRoute>
              } />
              <Route path="/observation-analytics" element={
                <ProtectedRoute permission="can_access_observations">
                  <ObservationPage />
                </ProtectedRoute>
              } />
              <Route path="/permits" element={
                <ProtectedRoute permission="can_access_permits">
                  <PermitsPage />
                </ProtectedRoute>
              } />
              <Route path="/manpower" element={
                <ProtectedRoute permission="can_access_manpower">
                  <ManpowerPage />
                </ProtectedRoute>
              } />
              <Route path="/checklists" element={
                <ProtectedRoute permission="can_access_checklists">
                  <ChecklistPage />
                </ProtectedRoute>
              } />
              <Route path="/tracker" element={
                <ProtectedRoute permission="can_access_equipment">
                  <TrackerPage />
                </ProtectedRoute>
              } />
              <Route path="/tracker/groups/:groupId" element={
                <Navigate to="/tracker" replace />
              } />
              <Route path="/tracker/categories/:categoryId" element={
                <ProtectedRoute permission="can_access_equipment">
                  <CategoryDetailPage />
                </ProtectedRoute>
              } />
              <Route path="/tracker/inspections" element={
                <ProtectedRoute permission="can_access_equipment">
                  <InspectionsPage />
                </ProtectedRoute>
              } />
              <Route path="/tracker/all-items" element={
                <ProtectedRoute permission="can_access_equipment">
                  <TotalItemRegisterPage />
                </ProtectedRoute>
              } />

              {/* Procedures & Meetings */}
              <Route path="/mockup-register" element={
                <ProtectedRoute permission="can_access_mockup_register">
                  <MockupRegisterPage />
                </ProtectedRoute>
              } />
              <Route path="/weekly-mom" element={
                <ProtectedRoute permission="can_access_weekly_mom">
                  <MomPage />
                </ProtectedRoute>
              } />

              {/* People & Assets */}
              <Route path="/training-matrix" element={
                <ProtectedRoute permission="can_access_training">
                  <TrainingMatrixPage />
                </ProtectedRoute>
              } />
              <Route path="/equipment" element={
                <ProtectedRoute permission="can_access_equipment">
                  <EquipmentRegisterPage />
                </ProtectedRoute>
              } />
              <Route path="/violations" element={
                <ProtectedRoute permission="can_access_violations">
                  <ViolationPage />
                </ProtectedRoute>
              } />

              {/* Incidents & Emergency */}
              <Route path="/incidents" element={
                <ProtectedRoute permission="can_access_incidents">
                  <IncidentRegisterPage />
                </ProtectedRoute>
              } />
              <Route path="/incident-analytics" element={
                <ProtectedRoute permission="can_access_incidents">
                  <IncidentRegisterPage />
                </ProtectedRoute>
              } />
              <Route path="/mock-drills" element={
                <ProtectedRoute permission="can_access_mock_drills">
                  <DrillsPage />
                </ProtectedRoute>
              } />

              {/* Permits */}
              <Route path="/permits/calendar" element={
                <ProtectedRoute permission="can_access_permit_calendar">
                  <PermitsPage />
                </ProtectedRoute>
              } />
              <Route path="/permit-amendments" element={
                <ProtectedRoute permission="can_access_permit_amendments">
                  <AmendmentsPage />
                </ProtectedRoute>
              } />

              {/* Documents */}
              <Route path="/document-control" element={
                <ProtectedRoute permission="can_access_document_control">
                  <DocumentsPage />
                </ProtectedRoute>
              } />
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
              <Route path="/campaigns" element={
                <ProtectedRoute permission="can_access_campaigns">
                  <CampaignsPage />
                </ProtectedRoute>
              } />
              <Route path="/poster-generator" element={
                <ProtectedRoute permission="can_access_poster_generator">
                  <PostersPage />
                </ProtectedRoute>
              } />
              <Route path="/poster-generator/create" element={
                <ProtectedRoute permission="can_manage_posters">
                  <PosterDesignPage />
                </ProtectedRoute>
              } />
              <Route path="/poster-generator/:id/edit" element={
                <ProtectedRoute permission="can_manage_posters">
                  <PosterDesignPage />
                </ProtectedRoute>
              } />

              {/* Environmental */}
              <Route path="/environmental" element={
                <ProtectedRoute permission="can_access_environmental">
                  <EnvironmentalPage />
                </ProtectedRoute>
              } />
              <Route path="/environmental/waste-manifests" element={
                <ProtectedRoute permission="can_access_waste_manifests">
                  <ManifestsPage />
                </ProtectedRoute>
              } />
              <Route path="/environmental/contractor-records" element={
                <ProtectedRoute permission="can_access_contractor_records">
                  <ContractorsPage />
                </ProtectedRoute>
              } />

              {/* Analytics & Admin */}
              <Route path="/reports" element={
                <ProtectedRoute permission="can_access_kpis_reports">
                  <ReportsPage />
                </ProtectedRoute>
              } />
              <Route path="/kpis-reports" element={<Navigate to="/reports" replace />} />
              <Route path="/admin/users" element={
                <ProtectedRoute permission="can_manage_users">
                  <AccessManagementPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/roles" element={
                <ProtectedRoute permission="can_manage_roles|can_manage_users">
                  <AccessManagementPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/roles/:role" element={
                <ProtectedRoute permission="can_manage_roles">
                  <RoleDetailPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/audit-log" element={
                <ProtectedRoute permission="can_manage_roles">
                  <AccessManagementPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/recycle-bin" element={
                <ProtectedRoute permission="can_manage_users">
                  <RecycleBinPage />
                </ProtectedRoute>
              } />
              {/* Document Import */}
              <Route path="/document-import" element={
                <ProtectedRoute permission="can_import_documents">
                  <DocumentImportPage />
                </ProtectedRoute>
              } />
              <Route path="/users-permissions" element={<Navigate to="/admin/users" replace />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
