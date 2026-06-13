import axios from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('railsense_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('railsense_token')
      localStorage.removeItem('railsense_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// --- Auth ---
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (name: string, email: string, password: string, role: string) =>
    api.post('/auth/register', { name, email, password, role }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
}

// --- Trains ---
export const trainsApi = {
  getAll: () => api.get('/trains'),
  getOne: (trainNumber: string) => api.get(`/trains/${trainNumber}`),
  getRoute: (trainNumber: string) => api.get(`/trains/${trainNumber}/route`),
  getFlags: (trainNumber: string) => api.get(`/trains/${trainNumber}/flags`),
  addDelay: (id: string, minutes: number) =>
    api.post(`/trains/${id}/delay`, { minutes }),
}

// --- Stations ---
export const stationsApi = {
  getAll: () => api.get('/stations'),
}

// --- PNR ---
export const pnrApi = {
  lookup: (pnrNumber: string) => api.get(`/pnr/${pnrNumber}`),
}

// --- Flags / Alerts ---
export const flagsApi = {
  getAll: (params?: Record<string, any>) => api.get('/flags', { params }),
  resolve: (id: string, resolution: string) =>
    api.post(`/flags/${id}/resolve`, { resolution }),
}

// --- Dashboard ---
export const dashboardApi = {
  getStats: () => api.get('/agent/stats'),
}

// --- Health ---
export const healthApi = {
  check: () => api.get('/health'),
}
