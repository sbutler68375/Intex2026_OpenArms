import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'

import PublicLayout from './components/PublicLayout'
import AdminLayout from './components/AdminLayout'

import Home from './pages/Home'
import Impact from './pages/Impact'
import Awareness from './pages/Awareness'
import Login from './pages/Login'
import Privacy from './pages/Privacy'
import Signup from './pages/Signup'
import Donate from './pages/Donate'
import DonorDashboard from './pages/DonorDashboard'
import DonorDonationDetail from './pages/DonorDonationDetail'

import Dashboard from './pages/admin/Dashboard'
import Residents from './pages/admin/Residents'
import ResidentDetail from './pages/admin/ResidentDetail'
import Donors from './pages/admin/Donors'
import DonorDetail from './pages/admin/DonorDetail'
import Donations from './pages/admin/Donations'
import DonationDetail from './pages/admin/DonationDetail'
import Safehouses from './pages/admin/Safehouses'
import Partners from './pages/admin/Partners'
import PartnerDetail from './pages/admin/PartnerDetail'
import Incidents from './pages/admin/Incidents'
import Analytics from './pages/admin/Analytics'
import SocialMedia from './pages/admin/SocialMedia'
import SocialMediaPostDetail from './pages/admin/SocialMediaPostDetail'

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } })

function RequireDonor({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><div className="spinner" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'donor') return <Navigate to="/admin" replace />
  return <>{children}</>
}

function RequireInternalStaff({ children }: { children: React.ReactNode }) {
  const { user, loading, isInternalStaff } = useAuth()
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><div className="spinner" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (!isInternalStaff) return <Navigate to="/" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { lang } = useLanguage()

  return (
    <Routes>
      <Route path="/" element={<PublicLayout><Home lang={lang} /></PublicLayout>} />
      <Route path="/impact" element={<PublicLayout><Impact lang={lang} /></PublicLayout>} />
      <Route path="/awareness" element={<PublicLayout><Awareness lang={lang} /></PublicLayout>} />
      <Route path="/privacy" element={<PublicLayout><Privacy lang={lang} /></PublicLayout>} />
      <Route path="/donate" element={<PublicLayout><Donate lang={lang} /></PublicLayout>} />
      <Route path="/signup" element={<PublicLayout><Signup lang={lang} /></PublicLayout>} />
      <Route path="/login" element={<PublicLayout><Login lang={lang} /></PublicLayout>} />

      <Route path="/donor" element={<PublicLayout><RequireDonor><DonorDashboard lang={lang} /></RequireDonor></PublicLayout>} />
      <Route path="/donor/donations/:id" element={<PublicLayout><RequireDonor><DonorDonationDetail lang={lang} /></RequireDonor></PublicLayout>} />

      <Route path="/admin" element={<RequireInternalStaff><AdminLayout><Dashboard /></AdminLayout></RequireInternalStaff>} />
      <Route path="/admin/residents" element={<RequireInternalStaff><AdminLayout><Residents /></AdminLayout></RequireInternalStaff>} />
      <Route path="/admin/residents/:id" element={<RequireInternalStaff><AdminLayout><ResidentDetail /></AdminLayout></RequireInternalStaff>} />
      <Route path="/admin/donors" element={<RequireInternalStaff><AdminLayout><Donors /></AdminLayout></RequireInternalStaff>} />
      <Route path="/admin/donors/:id" element={<RequireInternalStaff><AdminLayout><DonorDetail /></AdminLayout></RequireInternalStaff>} />
      <Route path="/admin/donations" element={<RequireInternalStaff><AdminLayout><Donations /></AdminLayout></RequireInternalStaff>} />
      <Route path="/admin/donations/:id" element={<RequireInternalStaff><AdminLayout><DonationDetail /></AdminLayout></RequireInternalStaff>} />
      <Route path="/admin/safehouses" element={<RequireInternalStaff><AdminLayout><Safehouses /></AdminLayout></RequireInternalStaff>} />
      <Route path="/admin/partners" element={<RequireInternalStaff><AdminLayout><Partners /></AdminLayout></RequireInternalStaff>} />
      <Route path="/admin/partners/:id" element={<RequireInternalStaff><AdminLayout><PartnerDetail /></AdminLayout></RequireInternalStaff>} />
      <Route path="/admin/incidents" element={<RequireInternalStaff><AdminLayout><Incidents /></AdminLayout></RequireInternalStaff>} />
      <Route path="/admin/analytics" element={<RequireInternalStaff><AdminLayout><Analytics /></AdminLayout></RequireInternalStaff>} />
      <Route path="/admin/social-media" element={<RequireInternalStaff><AdminLayout><SocialMedia /></AdminLayout></RequireInternalStaff>} />
      <Route path="/admin/social-media/:id" element={<RequireInternalStaff><AdminLayout><SocialMediaPostDetail /></AdminLayout></RequireInternalStaff>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <LanguageProvider>
            <AppRoutes />
          </LanguageProvider>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
