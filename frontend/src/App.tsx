import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { ToastProvider } from './components/feedback/ToastProvider'
import { ApplicationDetailPage } from './pages/ApplicationDetailPage'
import { ApplicationFormPage } from './pages/ApplicationFormPage'
import { ApplicationsPage } from './pages/ApplicationsPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { CompanyDetailPage } from './pages/CompanyDetailPage'
import { CompanyFormPage } from './pages/CompanyFormPage'
import { CompaniesPage } from './pages/CompaniesPage'
import { DashboardPage } from './pages/DashboardPage'
import { InterviewsPage } from './pages/InterviewsPage'
import { KanbanBoardPage } from './pages/KanbanBoardPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ResourcePage } from './pages/ResourcePage'
import { RemindersPage } from './pages/RemindersPage'
import { resourcePages } from './pages/resourcePages'

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="applications" element={<ApplicationsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="board" element={<KanbanBoardPage />} />
            <Route path="companies" element={<CompaniesPage />} />
            <Route path="companies/new" element={<CompanyFormPage />} />
            <Route path="companies/:companyId/edit" element={<CompanyFormPage />} />
            <Route path="companies/:companyId" element={<CompanyDetailPage />} />
            <Route path="interviews" element={<InterviewsPage />} />
            <Route path="reminders" element={<RemindersPage />} />
            <Route path="applications/new" element={<ApplicationFormPage />} />
            <Route
              path="applications/:applicationId/edit"
              element={<ApplicationFormPage />}
            />
            <Route
              path="applications/:applicationId"
              element={<ApplicationDetailPage />}
            />
            {resourcePages
              .filter(
                (page) =>
                    page.path !== 'applications' &&
                    page.path !== 'analytics' &&
                    page.path !== 'board' &&
                    page.path !== 'companies' &&
                    page.path !== 'interviews' &&
                    page.path !== 'reminders',
              )
              .map((page) => (
                <Route
                  key={page.path}
                  path={page.path}
                  element={<ResourcePage page={page} />}
                />
              ))}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  )
}
