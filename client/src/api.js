import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (email, password) => api.post('/auth/login', { email, password });
export const getMe = () => api.get('/auth/me');

// Vendors
export const getVendors = () => api.get('/vendors');
export const getVendor = (id) => api.get(`/vendors/${id}`);
export const createVendor = (data) => api.post('/vendors', data);
export const updateVendor = (id, data) => api.put(`/vendors/${id}`, data);

// Candidates
export const getCandidates = (params) => api.get('/candidates', { params });
export const getCandidate = (id) => api.get(`/candidates/${id}`);
export const updateCandidate = (id, data) => api.put(`/candidates/${id}`, data);
export const uploadResume = (formData) => api.post('/candidates/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const addFeedback = (id, data) => api.post(`/candidates/${id}/feedback`, data);

// Pipeline
export const updateCandidateStatus = (id, status, notes) => api.put(`/pipeline/${id}/status`, { status, notes });
export const getPipelineHistory = (id) => api.get(`/pipeline/history/${id}`);

// Dashboard
export const getKanban = (vendorId) => api.get('/dashboard/kanban', { params: { vendorId } });
export const getDashboardStats = () => api.get('/dashboard/stats');

// Reports
export const getVendorAnalytics = () => api.get('/reports/vendor-analytics');
export const getPipelineFunnel = () => api.get('/reports/pipeline-funnel');
export const getTimeline = (days) => api.get('/reports/timeline', { params: { days } });

// Email ingestion
export const getIngestionLog = (params) => api.get('/email-ingestion/log', { params });

export default api;
