import axios from 'axios';
import { API_BASE } from '../config/apiConfig';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const login = (email, password) =>
  api.post('/auth/login', { email, password });

export const register = (data) =>
  api.post('/auth/register', data);

// Patient Auth
export const patientLogin = (email, password) =>
  api.post('/auth/patient/login', { email, password });

export const patientRegister = (data) =>
  api.post('/auth/patient/register', data);

export const getPatientProfile = () =>
  api.get('/auth/patient/profile');

export const getRegisteredPatients = () =>
  api.get('/auth/patients/registered');

export const getDoctors = () =>
  api.get('/auth/doctors');

// Diagnosis
export const analyzePain = (imageData) =>
  api.post('/diagnosis/pain-detection', { image: imageData });

export const analyzeVoice = (audioData) =>
  api.post('/diagnosis/voice-analysis', { audio: audioData });

export const mobileCheckup = (data) =>
  api.post('/diagnosis/mobile-checkup', data);

export const runAIAnalysis = (data) =>
  api.post('/diagnosis/ai-analysis', data);

// Dashboard
export const getDashboardOverview = () =>
  api.get('/dashboard/overview');

export const getAlerts = () =>
  api.get('/dashboard/alerts');

export const getWeeklyStats = () =>
  api.get('/dashboard/stats/weekly');

// Patients
export const getPatients = () =>
  api.get('/patients');

export const getPatient = (id) =>
  api.get(`/patients/${id}`);

export const createPatient = (data) =>
  api.post('/patients', data);

export const getRecentCheckups = (limit = 10) =>
  api.get('/patients/checkups/recent', { params: { limit } });

export const getPatientCheckups = (patientId) =>
  api.get(`/patients/checkups/${patientId}`);

// GlucoTwin simulated sensor stream
export const getGlucoTwinPatients = () =>
  api.get('/glucotwin/patients');

export const getGlucoTwinLive = (patientId) =>
  api.get(`/glucotwin/live/${encodeURIComponent(patientId)}`);

export const resetGlucoTwin = (patientId) =>
  api.post(`/glucotwin/reset/${encodeURIComponent(patientId)}`);

export const getGlucoTwinMetadata = () =>
  api.get('/glucotwin/metadata');

export const createPatientCheckup = (data) =>
  api.post('/patients/checkups', data);

// Health Risk Assessment
export const assessHealthRisk = (data) =>
  api.post('/diagnosis/health-risk', data);

export const validateWearable = (data) =>
  api.post('/diagnosis/validate-wearable', data);

// Real-time Alerts
export const monitorAlerts = (vitals) =>
  api.post('/alerts/monitor', vitals);

export const getRealtimeAlerts = () =>
  api.get('/alerts/realtime');

export const getAlertHistory = (patientId) =>
  api.get(`/alerts/history/${patientId}`);

// Health Timeline
export const getTimeline = (patientId) =>
  api.get(`/timeline/${patientId}`);

export const getTimelineVitals = (patientId) =>
  api.get(`/timeline/${patientId}/vitals`);

export const getTimelinePredictions = (patientId) =>
  api.get(`/timeline/${patientId}/predictions`);

export const addTimelineEvent = (patientId, event) =>
  api.post(`/timeline/${patientId}/event`, event);

// Doctor Actions
export const doctorOverride = (data) =>
  api.post('/doctor/override', data);

export const doctorPrescribe = (data) =>
  api.post('/doctor/prescribe', data);

export const doctorNotes = (data) =>
  api.post('/doctor/notes', data);

export const getDoctorOverrides = (patientId) =>
  api.get(`/doctor/overrides/${patientId}`);

export const approveAI = (data) =>
  api.post('/doctor/approve-ai', data);

// Notifications
export const getNotifications = (params) =>
  api.get('/notifications', { params });

export const markNotificationRead = (id) =>
  api.post(`/notifications/read/${id}`);

export const markAllNotificationsRead = () =>
  api.post('/notifications/read-all');

export const getUnreadCount = () =>
  api.get('/notifications/unread-count');

// Emergency
export const evaluateEmergency = (data) =>
  api.post('/emergency/evaluate', data);

export const getEscalations = () =>
  api.get('/emergency/escalations');

export const acknowledgeEscalation = (id, data) =>
  api.post(`/emergency/escalations/${id}/acknowledge`, data);

export const resolveEscalation = (id, data) =>
  api.post(`/emergency/escalations/${id}/resolve`, data);

// System Logs
export const getSystemLogs = (params) =>
  api.get('/logs', { params });

export const getLogTypes = () =>
  api.get('/logs/types');

// AI Chatbot
export const sendChatMessage = (data) =>
  api.post('/chatbot/chat', data);

export const getChatHistory = (conversationId) =>
  api.get('/chatbot/history', { params: { conversation_id: conversationId } });

export const getChatSuggestions = (role) =>
  api.get('/chatbot/suggestions', { params: { role } });

export default api;
