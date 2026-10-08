import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import HealthTimeline from '../components/HealthTimeline';
import MedicineReminder from '../components/MedicineReminder';
import PatientReviews from '../components/PatientReviews';
import EPrescription from '../components/EPrescription';
import AppointmentBookingWizard from '../components/appointments/AppointmentBookingWizard';
import GlucoTwin from './GlucoTwin';
import { bookingApi } from '../services/bookingApi';
import {
  getDoctors,
  getGlucoTwinLive,
  getGlucoTwinPatients,
  getPatientCheckups,
  resetGlucoTwin,
} from '../services/api';
import { API_BASE } from '../config/apiConfig';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const PatientDashboard = ({ user }) => {
  const [profile, setProfile] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [smartwatchHistory, setSmartwatchHistory] = useState([]);
  const [liveVitals, setLiveVitals] = useState({});
  const [glucoTwinError, setGlucoTwinError] = useState('');
  const [historyRange, setHistoryRange] = useState(7);
  const [activeTab, setActiveTab] = useState('overview');
  const [appointmentBusy, setAppointmentBusy] = useState(false);
  const [appointmentMessage, setAppointmentMessage] = useState('');
  const [showBookingWizard, setShowBookingWizard] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.role !== 'patient') {
      navigate('/login');
      return;
    }
    loadProfile();
    loadDoctors();
  }, [user, navigate]);

  useEffect(() => {
    let active = true;
    let intervalId;

    const loadLiveSimulation = async () => {
      try {
        const response = await getGlucoTwinPatients();
        const available = Array.isArray(response.data?.patients)
          ? response.data.patients
          : [];
        if (!available.length) throw new Error('No GlucoTwin patients are available.');

        const matchingPatient = available.find(
          (patient) => String(patient.patient_id) === String(user?.id)
        );
        const selectedId = String((matchingPatient || available[0]).patient_id);
        if (!active) return;

        await resetGlucoTwin(selectedId);
        const poll = async () => {
          try {
            const liveResponse = await getGlucoTwinLive(selectedId);
            const observation = liveResponse.data?.data;
            if (!liveResponse.data?.success || !observation?.sensor) {
              throw new Error('Invalid GlucoTwin live response.');
            }
            const livePoint = {
              label: observation.timestamp || 'Live',
              heart_rate: observation.sensor.heart_rate_bpm,
              blood_glucose: observation.sensor.glucose_mg_dl,
              ibi: observation.sensor.ibi_ms,
            };
            setSmartwatchHistory((current) => [...current.slice(-29), livePoint]);
            setLiveVitals({
              heart_rate: observation.sensor.heart_rate_bpm,
              blood_glucose: observation.sensor.glucose_mg_dl,
              ibi: observation.sensor.ibi_ms,
            });
            setGlucoTwinError('');
          } catch {
            if (active) setGlucoTwinError('Unable to retrieve GlucoTwin live data.');
          }
        };

        await poll();
        intervalId = window.setInterval(poll, 4000);
      } catch {
        if (active) setGlucoTwinError('Unable to retrieve GlucoTwin live data.');
      }
    };

    if (user?.role === 'patient') loadLiveSimulation();
    return () => {
      active = false;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [user]);

  const buildFallbackHistory = (days, baseVitals) => {
    const base = baseVitals || {};
    const bpParts = String(base.blood_pressure || '120/80').split('/');
    const baseSystolic = Number(bpParts[0]) || 120;
    const baseDiastolic = Number(bpParts[1]) || 80;
    const baseHeartRate = Number(base.heart_rate) || 72;
    const baseSpo2 = Number(base.spo2) || 98;
    const baseGlucose = Number(base.blood_glucose) || 95;

    const hrOffsets = [2, -1, 3, -2, 1, 0, -1];
    const spo2Offsets = [0, -1, 0, 1, 0, -1, 0];
    const sysOffsets = [2, -3, 1, 0, -2, 2, -1];
    const diaOffsets = [1, -2, 0, 1, -1, 1, 0];
    const glucoseOffsets = [4, -2, 3, -1, 2, -3, 1];

    return Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const label = date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      return {
        label,
        heart_rate: Math.max(45, baseHeartRate + hrOffsets[i % hrOffsets.length]),
        spo2: Math.max(88, Math.min(100, baseSpo2 + spo2Offsets[i % spo2Offsets.length])),
        systolic_bp: Math.max(90, baseSystolic + sysOffsets[i % sysOffsets.length]),
        diastolic_bp: Math.max(55, baseDiastolic + diaOffsets[i % diaOffsets.length]),
        blood_glucose: Math.max(70, baseGlucose + glucoseOffsets[i % glucoseOffsets.length]),
      };
    });
  };

  const loadSmartwatchHistory = async (token, days) => {
    try {
      const historyRes = await fetch(`${API_BASE}/auth/patient/smartwatch-history?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const historyData = await historyRes.json();
      if (historyData.success && Array.isArray(historyData.history)) {
        setSmartwatchHistory(historyData.history);
        return;
      }
    } catch {
      // fallback handled below
    }
    setSmartwatchHistory(buildFallbackHistory(days, profile?.vitals));
  };

  const mapBookingAppointment = (apt) => ({
    id: apt._id || apt.id,
    date: apt.date,
    time: apt.time,
    doctor: apt.doctor_name || apt.doctor || 'Doctor',
    hospital: apt.hospital_name || '',
    type: apt.specialization ? `${apt.specialization}${apt.time ? ` • ${apt.time}` : ''}` : `Consultation${apt.time ? ` • ${apt.time}` : ''}`,
    status: apt.status || 'upcoming',
    source: 'booking-service',
  });

  const loadBookingAppointments = async (patientId) => {
    if (!patientId) return;
    try {
      const res = await bookingApi.getAppointments({ patient_id: patientId });
      const mapped = (res.data || []).map(mapBookingAppointment);
      setProfile((prev) => ({
        ...prev,
        appointments: mapped,
      }));
    } catch {
      // Keep existing profile appointments if booking service is unavailable.
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!appointmentId) return;

    const confirmed = window.confirm('Are you sure you want to cancel this appointment?');
    if (!confirmed) {
      return;
    }

    setAppointmentMessage('');
    setAppointmentBusy(true);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${API_BASE}/auth/patient/appointments/${appointmentId}/cancel`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Unable to cancel appointment');
      }

      setProfile((prev) => ({
        ...prev,
        appointments: data.appointments || prev.appointments || [],
      }));
      setAppointmentMessage('Appointment cancelled successfully.');
    } catch (error) {
      // Fallback in demo/offline mode
      setProfile((prev) => ({
        ...prev,
        appointments: (prev?.appointments || []).map((apt) =>
          apt.id === appointmentId ? { ...apt, status: 'cancelled' } : apt
        ),
      }));
      setAppointmentMessage('Appointment cancelled locally (demo mode).');
    } finally {
      setAppointmentBusy(false);
    }
  };

  const loadProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/auth/patient/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        let checkups = data.patient?.checkups || [];
        try {
          const checkupRes = await getPatientCheckups(data.patient.id);
          if (checkupRes.data?.success && Array.isArray(checkupRes.data.checkups)) {
            checkups = checkupRes.data.checkups;
          }
        } catch {
          // Keep profile-provided checkups if endpoint call fails
        }

        setProfile({
          ...data.patient,
          checkups,
        });
        await loadBookingAppointments(data.patient?.id);
      }
    } catch {
      // Demo fallback
      const fallbackVitals = {
        heart_rate: 78,
        blood_pressure: '130/85',
        spo2: 97,
        temperature: 98.6,
        respiration_rate: 16,
        blood_glucose: 110,
      };
      const fallbackHistory = buildFallbackHistory(historyRange, fallbackVitals);
      setProfile({
        id: user?.id || 'P-1001',
        name: user?.name || 'Patient',
        email: user?.email || '',
        age: user?.age || 30,
        gender: user?.gender || 'Not specified',
        blood_group: user?.blood_group || 'Unknown',
        conditions: ['Hypertension'],
        vitals: fallbackVitals,
        ai_results: {
          health_score: 82,
        },
        appointments: [
          { id: 'APT-2001', date: '2026-03-10', doctor: 'Dr. Sarah Johnson', type: 'General Checkup', status: 'upcoming' },
          { id: 'APT-2002', date: '2026-02-25', doctor: 'Dr. Michael Chen', type: 'Follow-up', status: 'completed' },
        ],
        checkups: [],
        medications: [
          { name: 'Amlodipine 5mg', dosage: 'Once daily', status: 'active' },
          { name: 'Aspirin 75mg', dosage: 'Once daily', status: 'active' },
        ],
        smartwatch_history: fallbackHistory,
      });
      await loadBookingAppointments(user?.id || '');
    }
  };

  const loadDoctors = async () => {
    try {
      const res = await getDoctors();
      const data = res.data || {};
      const doctorList = (data.doctors || []).filter((d) => d.role === 'doctor' || d.role === 'admin');
      setDoctors(doctorList);

    } catch {
      const fallbackDoctors = [
        { id: '1', name: 'Dr. Sarah Johnson', specialization: 'General Medicine' },
        { id: '2', name: 'Dr. Michael Chen', specialization: 'Surgery' },
      ];
      setDoctors(fallbackDoctors);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-medical-600 border-t-transparent"></div>
      </div>
    );
  }

  const vitals = { ...(profile.vitals || {}), ...liveVitals };
  const aiResults = profile.ai_results || {};
  const checkups = profile.checkups || [];
  const healthScore = aiResults.health_score || 85;
  const trendPoints = smartwatchHistory;
  const trendLabels = trendPoints.map((p) => p.label || 'Day');
  const hrTrend = trendPoints.map((p) => Number(p.heart_rate) || 0);
  const ibiTrend = trendPoints.map((p) => Number(p.ibi) || 0);
  const glucoseTrend = trendPoints.map((p) => Number(p.blood_glucose) || 0);

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
    },
    scales: {
      y: { grid: { color: '#f1f5f9' } },
      x: { grid: { display: false } },
    },
  };

  const smartwatchTrendData = {
    labels: trendLabels,
    datasets: [
      {
        label: 'Heart Rate (BPM)',
        data: hrTrend,
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        fill: true,
        tension: 0.35,
      },
      {
        label: 'IBI / HRV (ms)',
        data: ibiTrend,
        borderColor: '#0D9488',
        backgroundColor: 'rgba(13, 148, 136, 0.12)',
        fill: true,
        tension: 0.35,
      },
    ],
  };

  const ibiTrendData = {
    labels: trendLabels,
    datasets: [
      {
        label: 'IBI / HRV (ms)',
        data: ibiTrend,
        borderColor: '#8B5CF6',
        backgroundColor: 'rgba(139, 92, 246, 0.15)',
        fill: true,
        tension: 0.35,
      },
    ],
  };

  const glucoseTrendData = {
    labels: trendLabels,
    datasets: [
      {
        label: 'Blood Glucose (mg/dL)',
        data: glucoseTrend,
        borderColor: '#DB2777',
        backgroundColor: 'rgba(219, 39, 119, 0.12)',
        fill: true,
        tension: 0.35,
      },
    ],
  };

  const vitalCards = [
    { label: 'Heart Rate', value: `${vitals.heart_rate ?? '--'} bpm`, icon: '❤️', color: 'text-red-600', bg: 'bg-red-50', warn: vitals.heart_rate > 100 || vitals.heart_rate < 60 },
    { label: 'Blood Pressure', value: vitals.blood_pressure || '120/80', icon: '🩸', color: 'text-blue-600', bg: 'bg-blue-50', warn: false },
    { label: 'SpO2', value: `${vitals.spo2 || 98}%`, icon: '🫁', color: 'text-teal-600', bg: 'bg-teal-50', warn: vitals.spo2 < 95 },
    { label: 'Temperature', value: `${vitals.temperature || 98.6}°F`, icon: '🌡️', color: 'text-orange-600', bg: 'bg-orange-50', warn: vitals.temperature > 99.5 },
    { label: 'Respiration', value: `${vitals.respiration_rate || 16}/min`, icon: '💨', color: 'text-purple-600', bg: 'bg-purple-50', warn: false },
    { label: 'Blood Glucose', value: `${vitals.blood_glucose ?? '--'} mg/dL`, icon: '🍬', color: 'text-pink-600', bg: 'bg-pink-50', warn: vitals.blood_glucose > 140 },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'vitals', label: 'My Vitals', icon: '❤️' },
    { id: 'appointments', label: 'Appointments', icon: '📅' },
    { id: 'medicines', label: 'Medicines & E-Prescriptions', icon: '💊' },
    { id: 'reminders', label: 'Reminders', icon: '⏰' },
    { id: 'glucotwin', label: 'GlucoTwin', icon: '🧬' },
    { id: 'reviews', label: 'Reviews', icon: '⭐' },
  ];

  return (
    <div className="clay-theme page-3d-enter min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-medical-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-start sm:items-center gap-4 w-full sm:w-auto">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl">
                🧑‍🦱
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold">{profile.name}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-white/80">
                  <span>ID: {profile.id}</span>
                  <span className="hidden sm:inline">•</span>
                  <span>Age: {profile.age}</span>
                  <span className="hidden sm:inline">•</span>
                  <span>{profile.gender}</span>
                  <span className="hidden sm:inline">•</span>
                  <span>Blood: {profile.blood_group}</span>
                </div>
              </div>
            </div>
            {/* Health Score */}
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => setActiveTab('glucotwin')}
                className="clay-button rounded-2xl bg-white/20 px-4 py-3 text-left text-white backdrop-blur-sm transition hover:bg-white/30"
              >
                <div className="text-xs text-white/70">Live patient readings</div>
                <div className="text-sm font-semibold">🧬 Open GlucoTwin</div>
              </button>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-3 flex items-center gap-3">
              <div className="relative w-14 h-14">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="5" />
                  <circle cx="28" cy="28" r="24" fill="none" stroke="#fff" strokeWidth="5"
                    strokeDasharray={`${(healthScore / 100) * 150.8} 150.8`} strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{healthScore}</span>
              </div>
              <div>
                <div className="text-xs text-white/70">Health Score</div>
                <div className="text-sm font-semibold">
                  {healthScore >= 80 ? 'Good' : healthScore >= 60 ? 'Fair' : 'Needs Attention'}
                </div>
              </div>
              </div>
              {glucoTwinError && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-800">
                {glucoTwinError}
              </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`clay-button flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-teal-600 to-medical-600 text-white shadow-lg'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-medical-300'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Vitals */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {vitalCards.map((v, idx) => (
                  <div key={idx} className={`bg-white rounded-2xl p-4 shadow-sm border ${v.warn ? 'border-red-200' : 'border-gray-100'} card-hover`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">{v.icon}</span>
                      {v.warn && <span className="text-xs text-red-500 font-medium">⚠</span>}
                    </div>
                    <div className={`text-xl font-bold ${v.color}`}>{v.value}</div>
                    <div className="text-xs text-gray-500 mt-1">{v.label}</div>
                  </div>
                ))}
              </div>

              {/* AI Results & Info */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* AI Analysis Summary */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">🤖 AI Health Analysis</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2">
                        <span>📈</span>
                        <span className="text-sm text-gray-700">Health Score</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{
                            width: `${Math.max(0, Math.min(100, healthScore))}%`,
                            backgroundColor: healthScore >= 80 ? '#10B981' : healthScore >= 60 ? '#F59E0B' : '#EF4444'
                          }}></div>
                        </div>
                        <span className={`text-sm font-bold ${healthScore < 60 ? 'text-red-600' : 'text-green-600'}`}>
                          {healthScore}/100
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2">
                        <span>🤝</span>
                        <span className="text-sm text-gray-700">Peer Support Chat</span>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                        Active
                      </span>
                    </div>

                  </div>
                </div>

                {/* Upcoming Appointments */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">📅 Upcoming Appointments</h3>
                  {(profile.appointments || []).length > 0 ? (
                    <div className="space-y-3">
                      {profile.appointments.map((apt, idx) => (
                        <div key={idx} className={`p-3 rounded-xl border ${apt.status === 'upcoming' ? 'border-medical-200 bg-medical-50' : 'border-gray-100 bg-gray-50'}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{apt.type}</div>
                              <div className="text-xs text-gray-500 mt-0.5">{apt.doctor} • {apt.date}</div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              apt.status === 'upcoming' ? 'bg-medical-100 text-medical-700' : 'bg-gray-200 text-gray-600'
                            }`}>
                              {apt.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-6">No appointments scheduled</p>
                  )}
                </div>
              </div>

              {/* Conditions & Medications Quick View */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">🩺 Conditions</h3>
                  {(profile.conditions || []).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {profile.conditions.map((c, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-medical-50 text-medical-700 rounded-full text-sm font-medium">{c}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No conditions recorded</p>
                  )}
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">💊 Active Medications</h3>
                  {(profile.medications || []).filter(m => m.status === 'active').length > 0 ? (
                    <div className="space-y-2">
                      {profile.medications.filter(m => m.status === 'active').map((med, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-900">{med.name}</span>
                          <span className="text-xs text-gray-500">{med.dosage}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No active medications</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VITALS TAB */}
          {activeTab === 'vitals' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vitalCards.map((v, idx) => (
                  <div key={idx} className={`bg-white rounded-2xl shadow-sm border ${v.warn ? 'border-red-200' : 'border-gray-100'} p-6`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 ${v.bg} rounded-xl flex items-center justify-center text-2xl`}>
                          {v.icon}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900">{v.label}</h4>
                          <p className="text-xs text-gray-500">Current reading</p>
                        </div>
                      </div>
                      {v.warn && <span className="px-2 py-1 bg-red-100 text-red-600 text-xs font-semibold rounded-full">Abnormal</span>}
                    </div>
                    <div className={`text-3xl font-bold ${v.color}`}>{v.value}</div>
                    <div className="mt-3 flex items-center gap-1 text-xs text-gray-400">
                      <span>📈</span> Last updated: Just now
                    </div>
                  </div>
                ))}
              </div>

              {/* Smartwatch Analysis Graphs */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-5">
                  <span className="text-xl">⌚</span>
                  <h3 className="text-lg font-semibold text-gray-900">Smartwatch Analysis</h3>
                </div>
                <div className="flex items-center gap-2 mb-5">
                  {[7, 14, 30].map((days) => (
                    <button
                      key={days}
                      onClick={() => setHistoryRange(days)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        historyRange === days
                          ? 'bg-medical-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {days}d
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div className="rounded-xl border border-gray-100 p-4">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3">Heart Rate & IBI Trend ({historyRange} Days)</h4>
                    <div className="h-64">
                      <Line data={smartwatchTrendData} options={lineChartOptions} />
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-100 p-4">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3">IBI / HRV Trend ({historyRange} Days)</h4>
                    <div className="h-64">
                      <Line data={ibiTrendData} options={lineChartOptions} />
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-100 p-4 xl:col-span-2">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3">Blood Glucose Trend ({historyRange} Days)</h4>
                    <div className="h-56">
                      <Line data={glucoseTrendData} options={lineChartOptions} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Health Score Detail */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Health Score</h3>
                <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 text-center md:text-left">
                  <div className="relative w-32 h-32">
                    <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
                      <circle cx="64" cy="64" r="56" fill="none" stroke="#E5E7EB" strokeWidth="10" />
                      <circle cx="64" cy="64" r="56" fill="none"
                        stroke={healthScore >= 80 ? '#10B981' : healthScore >= 60 ? '#F59E0B' : '#EF4444'}
                        strokeWidth="10" strokeDasharray={`${(healthScore / 100) * 351.86} 351.86`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-gray-900">{healthScore}</span>
                  </div>
                  <div>
                    <div className={`text-xl font-bold ${healthScore >= 80 ? 'text-green-600' : healthScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {healthScore >= 80 ? 'Good Health' : healthScore >= 60 ? 'Fair - Monitor Closely' : 'Needs Medical Attention'}
                    </div>
                    <p className="text-sm text-gray-500 mt-2 max-w-md">
                      Your health score is calculated by our AI engine based on your vitals and ongoing clinical indicators.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 sm:p-4">
                <HealthTimeline patientId={profile.id} />
              </div>
            </div>
          )}

          {/* APPOINTMENTS TAB */}
          {activeTab === 'appointments' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Book Appointment</h3>
                  <p className="text-xs text-gray-500 mt-1">Click to open guided appointment booking.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBookingWizard((prev) => !prev)}
                  className="px-4 py-2.5 text-sm font-semibold rounded-lg bg-medical-600 text-white hover:bg-medical-700"
                >
                  {showBookingWizard ? 'Close' : 'Take Appointment'}
                </button>
              </div>

              {showBookingWizard && (
                <AppointmentBookingWizard
                  user={profile}
                  onBooked={() => {
                    loadBookingAppointments(profile.id);
                    setShowBookingWizard(false);
                  }}
                />
              )}

              {appointmentMessage && (
                <div className={`rounded-xl px-4 py-3 text-sm border ${
                  appointmentMessage.toLowerCase().includes('cancelled')
                    ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                    : 'bg-green-50 border-green-200 text-green-700'
                }`}>
                  {appointmentMessage}
                </div>
              )}

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900">My Appointments</h3>
                </div>
                {(profile.appointments || []).length > 0 ? (
                  <div className="divide-y divide-gray-50">
                    {profile.appointments.map((apt, idx) => (
                      <div key={apt.id || idx} className="p-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                          apt.status === 'upcoming' ? 'bg-medical-100' : apt.status === 'cancelled' ? 'bg-red-100' : 'bg-gray-100'
                        }`}>
                          {apt.status === 'upcoming' ? '📅' : apt.status === 'cancelled' ? '❌' : '✅'}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-900">{apt.type}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{apt.doctor}{apt.hospital ? ` • ${apt.hospital}` : ''}</div>
                          {apt.id && <div className="text-xs text-gray-400 mt-0.5">ID: {apt.id}</div>}
                        </div>
                        <div className="w-full sm:w-auto text-right flex items-center justify-between sm:justify-end gap-3">
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">{apt.date}</div>
                            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              apt.status === 'upcoming'
                                ? 'bg-medical-100 text-medical-700'
                                : apt.status === 'cancelled'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-green-100 text-green-700'
                            }`}>
                              {apt.status}
                            </span>
                          </div>
                          {apt.status === 'upcoming' && apt.id && apt.source !== 'booking-service' && (
                            <button
                              onClick={() => handleCancelAppointment(apt.id)}
                              disabled={appointmentBusy}
                              className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center text-gray-400">
                    <span className="text-4xl">📅</span>
                    <p className="mt-3 text-sm">No appointments yet</p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Checkups</h3>
                  <span className="text-xs text-gray-500">Total: {checkups.length}</span>
                </div>
                {checkups.length > 0 ? (
                  <div className="divide-y divide-gray-50">
                    {checkups.map((checkup) => (
                      <div key={checkup.id} className="p-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-xl">🩺</div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-900">{checkup.type || 'Checkup'}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{checkup.doctor_name || checkup.doctor || 'Doctor N/A'} • {checkup.department || 'General'}</div>
                          <div className="text-xs text-gray-500 mt-1">{checkup.diagnosis || checkup.assessment || 'No diagnosis provided'}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">{checkup.date || 'N/A'}</div>
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            {checkup.assessment || 'Review'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-sm text-gray-400">No checkup records found yet.</div>
                )}
              </div>
            </div>
          )}

          {/* MEDICATIONS TAB */}
          {activeTab === 'medicines' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900">My Medications</h3>
                </div>
                {(profile.medications || []).length > 0 ? (
                  <div className="divide-y divide-gray-50">
                    {profile.medications.map((med, idx) => (
                      <div key={idx} className="p-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                          med.status === 'active' ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          💊
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-900">{med.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{med.dosage}</div>
                        </div>
                        <span className={`self-start sm:self-auto px-3 py-1 rounded-full text-xs font-semibold ${
                          med.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {med.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center text-gray-400">
                    <span className="text-4xl">💊</span>
                    <p className="mt-3 text-sm">No medications prescribed</p>
                  </div>
                )}
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 E-Prescriptions</h3>
                <EPrescription user={user} />
              </div>
            </div>
          )}
        </div>
      </div>
      {/* MEDICINE REMINDER TAB */}
      {activeTab === 'reminders' && (
        <MedicineReminder user={profile} />
      )}

      {/* GLUCOTWIN TAB */}
      {activeTab === 'glucotwin' && (
        <GlucoTwin user={user} />
      )}

      {/* REVIEWS TAB */}
      {activeTab === 'reviews' && (
        <PatientReviews user={user} doctors={doctors} />
      )}
    </div>
  );
};

export default PatientDashboard;
