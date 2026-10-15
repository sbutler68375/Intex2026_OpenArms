import axios from 'axios'

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim()
const normalizedApiUrl = configuredApiUrl
  ? configuredApiUrl.replace(/\/+$/, '')
  : ''
const baseURL = normalizedApiUrl
  ? (normalizedApiUrl.endsWith('/api') ? normalizedApiUrl : `${normalizedApiUrl}/api`)
  : '/api'

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('oa_user')
      const url = String(err.config?.url ?? '')
      const isSessionProbe = url.includes('/auth/me')
      if (!isSessionProbe && !window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

// Auth
export const login = (username: string, password: string) =>
  api.post('/auth/login', { username, password }).then(r => r.data)

export const logoutRequest = () => api.post('/auth/logout').then(() => undefined)

export const getMe = () => api.get('/auth/me').then(r => r.data)

export const registerDonor = (body: {
  username: string; password: string;
  supporterType?: string; displayName?: string; organizationName?: string;
  firstName?: string; lastName?: string;
  email?: string; phone?: string;
  region?: string; country?: string;
  relationshipType?: string; acquisitionChannel?: string;
  firstDonationDate?: string;
}) => api.post('/auth/register-donor', body).then(r => r.data)

export const getDonorDonations = () => api.get('/donations/mine').then(r => r.data)

/** Signed-in donor's single donation + in_kind_donation_items (404 if not yours). */
export const getMyDonationDetails = (id: number) =>
  api.get(`/donations/mine/${id}/details`).then(r => r.data)

// Public
export const getImpactSnapshot = () => api.get('/public/impact-snapshot').then(r => r.data)
export const getPublicSafehouses = () => api.get('/public/safehouses').then(r => r.data)
export const getDonationTrends = () => api.get('/public/donation-trends').then(r => r.data)
export const getDonationYearProgress = () => api.get('/public/donation-year-progress').then(r => r.data)
export const getOutcomeMetrics = () => api.get('/public/outcome-metrics').then(r => r.data)
export const sendQuickHelpRequest = (body: {
  name?: string
  email?: string
  phone?: string
  message: string
}) => api.post('/public/contact', body).then(r => r.data)

// Residents
export const getResidents = (params?: Record<string, string | number>) =>
  api.get('/residents', { params }).then(r => r.data)
export const getResident = (id: number) => api.get(`/residents/${id}`).then(r => r.data)
export const createResident = (body: Record<string, unknown>) =>
  api.post('/residents', body).then(r => r.data)
export const updateResident = (id: number, body: Record<string, unknown>) =>
  api.patch(`/residents/${id}`, body).then(r => r.data)
export const deleteResident = (id: number) =>
  api.delete(`/residents/${id}`, { data: { confirm: 'DELETE' } })

export const getRecordings = (id: number) => api.get(`/residents/${id}/recordings`).then(r => r.data)
export const addRecording = (id: number, body: Record<string, unknown>) =>
  api.post(`/residents/${id}/recordings`, body).then(r => r.data)
export const updateRecording = (residentId: number, recordingId: number, body: Record<string, unknown>) =>
  api.patch(`/residents/${residentId}/recordings/${recordingId}`, body).then(r => r.data)
export const deleteRecording = (residentId: number, recordingId: number) =>
  api.delete(`/residents/${residentId}/recordings/${recordingId}`, { data: { confirm: 'DELETE' } })

export const getVisitations = (id: number) => api.get(`/residents/${id}/visitations`).then(r => r.data)
export const addVisitation = (id: number, body: Record<string, unknown>) =>
  api.post(`/residents/${id}/visitations`, body).then(r => r.data)
export const updateVisitation = (residentId: number, visitationId: number, body: Record<string, unknown>) =>
  api.patch(`/residents/${residentId}/visitations/${visitationId}`, body).then(r => r.data)
export const deleteVisitation = (residentId: number, visitationId: number) =>
  api.delete(`/residents/${residentId}/visitations/${visitationId}`, { data: { confirm: 'DELETE' } })

export const getHealthRecords = (id: number) => api.get(`/residents/${id}/health`).then(r => r.data)
export const addHealthRecord = (id: number, body: Record<string, unknown>) =>
  api.post(`/residents/${id}/health`, body).then(r => r.data)
export const updateHealthRecord = (residentId: number, healthRecordId: number, body: Record<string, unknown>) =>
  api.patch(`/residents/${residentId}/health/${healthRecordId}`, body).then(r => r.data)
export const deleteHealthRecord = (residentId: number, healthRecordId: number) =>
  api.delete(`/residents/${residentId}/health/${healthRecordId}`, { data: { confirm: 'DELETE' } })

export const getEducationRecords = (id: number) => api.get(`/residents/${id}/education`).then(r => r.data)
export const addEducationRecord = (id: number, body: Record<string, unknown>) =>
  api.post(`/residents/${id}/education`, body).then(r => r.data)
export const updateEducationRecord = (residentId: number, educationRecordId: number, body: Record<string, unknown>) =>
  api.patch(`/residents/${residentId}/education/${educationRecordId}`, body).then(r => r.data)
export const deleteEducationRecord = (residentId: number, educationRecordId: number) =>
  api.delete(`/residents/${residentId}/education/${educationRecordId}`, { data: { confirm: 'DELETE' } })
export const getInterventionPlans = (id: number) => api.get(`/residents/${id}/interventions`).then(r => r.data)
export const addInterventionPlan = (id: number, body: Record<string, unknown>) =>
  api.post(`/residents/${id}/interventions`, body).then(r => r.data)
export const updateInterventionPlan = (residentId: number, planId: number, body: Record<string, unknown>) =>
  api.patch(`/residents/${residentId}/interventions/${planId}`, body).then(r => r.data)
export const deleteInterventionPlan = (residentId: number, planId: number) =>
  api.delete(`/residents/${residentId}/interventions/${planId}`, { data: { confirm: 'DELETE' } })

// Safehouses
export const getSafehouses = () => api.get('/safehouses').then(r => r.data)
export const getSafehouse = (id: number) => api.get(`/safehouses/${id}`).then(r => r.data)
export const createSafehouse = (body: Record<string, unknown>) =>
  api.post('/safehouses', body).then(r => r.data)
export const updateSafehouse = (id: number, body: Record<string, unknown>) =>
  api.patch(`/safehouses/${id}`, body).then(r => r.data)
export const deleteSafehouse = (id: number) =>
  api.delete(`/safehouses/${id}`, { data: { confirm: 'DELETE' } })

// Supporters / Donors
export const getSupporters = (params?: Record<string, string>) =>
  api.get('/supporters', { params }).then(r => r.data)
export const getSupporter = (id: number) => api.get(`/supporters/${id}`).then(r => r.data)
export const createSupporter = (body: Record<string, unknown>) =>
  api.post('/supporters', body).then(r => r.data)
export const updateSupporter = (id: number, body: Record<string, unknown>) =>
  api.patch(`/supporters/${id}`, body).then(r => r.data)
export const deleteSupporter = (id: number) =>
  api.delete(`/supporters/${id}`, { data: { confirm: 'DELETE' } })

// Donations
export const getDonations = (params?: Record<string, string | number>) =>
  api.get('/donations', { params }).then(r => r.data)
export const getDonation = (id: number) => api.get(`/donations/${id}/details`).then(r => r.data)
export const getDonationSummary = () => api.get('/donations/summary').then(r => r.data)
export const createDonation = (body: Record<string, unknown>) =>
  api.post('/donations', body).then(r => r.data)
export const updateDonation = (id: number, body: Record<string, unknown>) =>
  api.patch(`/donations/${id}`, body).then(r => r.data)
export const deleteDonation = (id: number) =>
  api.delete(`/donations/${id}`, { data: { confirm: 'DELETE' } })

/** Replaces all rows in in_kind_donation_items for this donation. */
export const syncDonationInKindItems = (
  donationId: number,
  items: Array<{
    itemName: string
    itemCategory: string
    quantity: number
    unitOfMeasure: string
    estimatedUnitValue: number
    intendedUse: string
    receivedCondition: string
  }>
) => api.put(`/donations/${donationId}/in-kind-items`, items).then(r => r.data)

// Partners
export const getPartners = () => api.get('/partners').then(r => r.data)
export const getPartner = (id: number) => api.get(`/partners/${id}`).then(r => r.data)
export const createPartner = (body: Record<string, unknown>) =>
  api.post('/partners', body).then(r => r.data)
export const updatePartner = (id: number, body: Record<string, unknown>) =>
  api.patch(`/partners/${id}`, body).then(r => r.data)
export const deletePartner = (id: number) =>
  api.delete(`/partners/${id}`, { data: { confirm: 'DELETE' } })

// Incidents
export const getIncidents = (params?: Record<string, string | boolean>) =>
  api.get('/incidents', { params }).then(r => r.data)
export const createIncident = (body: Record<string, unknown>) =>
  api.post('/incidents', body).then(r => r.data)
export const updateIncident = (id: number, body: Record<string, unknown>) =>
  api.patch(`/incidents/${id}`, body).then(r => r.data)
export const deleteIncident = (id: number) =>
  api.delete(`/incidents/${id}`, { data: { confirm: 'DELETE' } })

// Analytics
export const getDashboardAnalytics = () => api.get('/analytics/dashboard').then(r => r.data)
export const getSafehouseComparison = () => api.get('/analytics/safehouse-comparison').then(r => r.data)
export const getAnalyticsDonationTrends = () => api.get('/analytics/donation-trends').then(r => r.data)
export const getResidentOutcomes = () => api.get('/analytics/resident-outcomes').then(r => r.data)
export const getAtRiskResidents = () => api.get('/analytics/at-risk').then(r => r.data)

/** Supabase-backed ML-style pipeline outputs (forecast, risk mix, occupancy, donor recency). */
export const getMlPipelineInsights = () => api.get('/analytics/ml-pipelines').then(r => r.data)

// Social Media
export const getSocialMedia = (params?: Record<string, string>) =>
  api.get('/social-media', { params }).then(r => r.data)
export const getSocialPost = (id: number) => api.get(`/social-media/${id}`).then(r => r.data)
export const getSocialMetrics = () => api.get('/social-media/metrics').then(r => r.data)
export const createSocialPost = (body: Record<string, unknown>) =>
  api.post('/social-media', body).then(r => r.data)
export const updateSocialPost = (id: number, body: Record<string, unknown>) =>
  api.patch(`/social-media/${id}`, body).then(r => r.data)
export const deleteSocialPost = (id: number) =>
  api.delete(`/social-media/${id}`, { data: { confirm: 'DELETE' } })
