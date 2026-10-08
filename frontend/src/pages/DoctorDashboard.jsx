import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import AlertPanel from '../components/AlertPanel';
import EmergencyAlert from '../components/EmergencyAlert';
import NotificationPanel from '../components/NotificationPanel';
import { API_BASE, BOOKING_API_BASE } from '../config/apiConfig';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const toDateOnly = (value) => {
  if (!value) return null;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
};

const getComputedAppointmentStatus = (date, status) => {
  const raw = String(status || 'upcoming').toLowerCase();
  if (raw === 'deleted') return 'deleted';
  if (raw === 'cancelled') return 'cancelled';
  if (raw === 'completed') return 'completed';

  const today = toDateOnly(new Date().toISOString());
  const appointmentDay = toDateOnly(date);
  if (raw === 'upcoming' && today && appointmentDay && appointmentDay < today) {
    return 'expired';
  }
  return raw;
};

const DoctorDashboard = ({ user = null }) => {
  const [overview, setOverview] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [patients, setPatients] = useState([]);
  const [recentCheckups, setRecentCheckups] = useState([]);
  const [doctorDirectory, setDoctorDirectory] = useState([]);
  const [hospitalCatalog, setHospitalCatalog] = useState([]);
  const [bookingDoctorDirectory, setBookingDoctorDirectory] = useState([]);
  const [activeTab, setActiveTab] = useState('activity');
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [patientIdInput, setPatientIdInput] = useState('');
  const [addPatientMessage, setAddPatientMessage] = useState('');
  const [appointmentFilter, setAppointmentFilter] = useState('all');
  const [appointmentDateRange, setAppointmentDateRange] = useState('all');
  const [bookingAppointments, setBookingAppointments] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientRiskFilter, setPatientRiskFilter] = useState('all');
  const [patientStatusFilter, setPatientStatusFilter] = useState('all');
  const navigate = useNavigate();

  const doctorProfile = useMemo(() => {
    if (user && user.role === 'doctor') {
      return user;
    }
    try {
      const stored = localStorage.getItem('user');
      const parsed = stored ? JSON.parse(stored) : null;
      return parsed && parsed.role === 'doctor' ? parsed : null;
    } catch {
      return null;
    }
  }, [user]);

  const doctorId = doctorProfile?.id ? String(doctorProfile.id) : '';
  const doctorName = doctorProfile?.name || 'Doctor';
  const doctorSpecialization = doctorProfile?.specialization || 'General Medicine';

  const getHospitalFeatureList = (hospitalName, specializations = []) => {
    const features = new Set([
      '24x7 Emergency Care',
      'ICU Support',
      'Advanced Diagnostic Lab',
    ]);

    const name = String(hospitalName || '').toLowerCase();
    if (name.includes('apollo')) {
      features.add('Cardiac Critical Care');
      features.add('Robotic Surgery Support');
    }
    if (name.includes('aiims')) {
      features.add('Tertiary Referral Care');
      features.add('Multi-specialty OPD');
    }
    if (name.includes('kims') || name.includes('medicover')) {
      features.add('Trauma & Stroke Unit');
    }

    specializations.forEach((spec) => {
      const s = String(spec || '').toLowerCase();
      if (s.includes('cardio')) features.add('Cardiology Unit');
      if (s.includes('neuro')) features.add('Neurology Unit');
      if (s.includes('ortho')) features.add('Orthopedic Care');
      if (s.includes('gyn')) features.add('Women & Maternity Care');
      if (s.includes('nephro')) features.add('Renal & Dialysis Support');
      if (s.includes('pediatric')) features.add('Pediatric Care');
      if (s.includes('surgery')) features.add('General Surgery');
    });

    return Array.from(features).slice(0, 6);
  };

  useEffect(() => {
    loadDashboardData();
  }, [doctorId, doctorName]);

  const loadDashboardData = async () => {
    try {
      const qs = new URLSearchParams();
      if (doctorId) qs.set('doctor_id', doctorId);
      if (doctorName) qs.set('doctor_name', doctorName);
      const overviewUrl = `${API_BASE}/dashboard/overview${qs.toString() ? `?${qs.toString()}` : ''}`;

      const [ovRes, alRes, ptRes, regRes, checkupRes, doctorsRes] = await Promise.all([
        fetch(overviewUrl).then(r => r.json()),
        fetch(`${API_BASE}/dashboard/alerts`).then(r => r.json()),
        fetch(`${API_BASE}/patients`).then(r => r.json()),
        fetch(`${API_BASE}/auth/patients/registered`).then(r => r.json()).catch(() => ({ patients: [] })),
        fetch(`${API_BASE}/patients/checkups/recent?limit=25`).then(r => r.json()).catch(() => ({ checkups: [] })),
        fetch(`${API_BASE}/auth/doctors`).then(r => r.json()).catch(() => ({ doctors: [] })),
      ]);
      setOverview(ovRes);
      setAlerts(alRes.alerts || []);

      const normalizedDoctorName = String(doctorName || '').toLowerCase();

      const mergedMap = new Map();
      const allPatients = [
        ...(ptRes.patients || []),
        ...(regRes.patients || []),
      ];

      allPatients.forEach((patient) => {
        const key = String(patient.id);
        const existing = mergedMap.get(key);
        if (!existing) {
          mergedMap.set(key, patient);
          return;
        }
        // Prefer records that carry richer profile details.
        mergedMap.set(key, {
          ...existing,
          ...patient,
          appointments: patient.appointments || existing.appointments || [],
          medications: patient.medications || existing.medications || [],
          vitals: patient.vitals || existing.vitals || {},
          ai_results: patient.ai_results || existing.ai_results || {},
          source: patient.source || existing.source,
        });
      });

      const mergedPatients = Array.from(mergedMap.values());
      const scopedPatients = normalizedDoctorName
        ? mergedPatients.filter((patient) =>
            (patient.appointments || []).some(
              (apt) => String(apt.doctor || '').toLowerCase() === normalizedDoctorName
            )
            || (ovRes.recent_checkups || []).some((c) => String(c.patient_id) === String(patient.id))
          )
        : mergedPatients;

      setPatients(scopedPatients);

      const checkups = checkupRes.checkups || ovRes.recent_checkups || [];
      const scopedCheckups = normalizedDoctorName
        ? checkups.filter((c) => String(c.doctor_name || '').toLowerCase() === normalizedDoctorName)
        : checkups;

      setRecentCheckups(scopedCheckups);
      setDoctorDirectory(doctorsRes.doctors || []);

      try {
        const [bookingRes, hospitalsRes, bookingDoctorsRes] = await Promise.all([
          fetch(`${BOOKING_API_BASE}/appointments`),
          fetch(`${BOOKING_API_BASE}/hospitals`),
          fetch(`${BOOKING_API_BASE}/doctors`),
        ]);

        const bookingData = await bookingRes.json();
        if (bookingData.success && Array.isArray(bookingData.data)) {
          const normalizedDoctorName = String(doctorName || '').toLowerCase();
          const normalized = bookingData.data
            .filter((apt) => {
              const aptDoctorId = String(apt.doctor_id || apt.doctorId || '');
              const aptDoctorName = String(apt.doctor_name || apt.doctor || '').toLowerCase();
              if (!doctorId && !normalizedDoctorName) return true;
              return (doctorId && aptDoctorId === String(doctorId))
                || (normalizedDoctorName && aptDoctorName === normalizedDoctorName);
            })
            .map((apt) => ({
              id: apt._id || apt.id,
              patient_id: apt.patient_id,
              patient_name: apt.patient_name,
              doctor_id: apt.doctor_id,
              hospital_id: apt.hospital_id,
              doctor: apt.doctor_name || apt.doctor || 'Doctor',
              date: apt.date,
              time: apt.time,
              type: apt.specialization ? `${apt.specialization}${apt.time ? ` • ${apt.time}` : ''}` : 'Consultation',
              status: getComputedAppointmentStatus(apt.date, apt.status),
              source: 'booking-service',
            }))
            .filter((apt) => apt.status !== 'deleted');
          setBookingAppointments(normalized);
        } else {
          setBookingAppointments([]);
        }

        const hospitalsData = await hospitalsRes.json();
        if (hospitalsData.success && Array.isArray(hospitalsData.data)) {
          setHospitalCatalog(hospitalsData.data);
        } else {
          setHospitalCatalog([]);
        }

        const bookingDoctorsData = await bookingDoctorsRes.json();
        if (bookingDoctorsData.success && Array.isArray(bookingDoctorsData.data)) {
          setBookingDoctorDirectory(bookingDoctorsData.data);
        } else {
          setBookingDoctorDirectory([]);
        }
      } catch {
        setBookingAppointments([]);
        setHospitalCatalog([]);
        setBookingDoctorDirectory([]);
      }
    } catch {
      // Use defaults if backend not available
      setOverview({
        stats: { total_patients: 156, active_monitoring: 23, critical_alerts: 3, scans_today: 47, ai_accuracy: 94.7, avg_risk_score: 2.3 },
        health_trends: Array.from({ length: 7 }, (_, i) => ({
          label: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
          heart_rate: 68 + Math.floor(Math.random() * 20),
          blood_pressure_systolic: 115 + Math.floor(Math.random() * 25),
          spo2: 95 + Math.floor(Math.random() * 5),
          pain_score: Math.floor(Math.random() * 4),
        })),
        recent_activity: [
          { time: '2 min ago', event: 'Risk scan completed', patient: 'Patient #1042', severity: 'normal' },
          { time: '15 min ago', event: 'Symptom alert raised', patient: 'Patient #1038', severity: 'warning' },
          { time: '32 min ago', event: 'Surgery risk assessed', patient: 'Patient #1035', severity: 'critical' },
        ],
      });
      setAlerts([
        { id: 1, level: 'critical', module: 'Smart Diagnosis', patient: 'John Doe', message: 'High-risk signal detected', time: '5 min ago', acknowledged: false },
        { id: 2, level: 'warning', module: 'Symptom Monitor', patient: 'Jane Smith', message: 'Symptom risk indicators detected', time: '18 min ago', acknowledged: false },
        { id: 3, level: 'info', module: 'AI Engine', patient: 'Michael Wilson', message: 'Checkup completed - normal', time: '2 hr ago', acknowledged: true },
      ]);
      setPatients([
        { id: 1, name: 'John Doe', age: 67, status: 'critical', risk_level: 'high', conditions: ['Hypertension', 'Diabetes'], vitals: { heart_rate: 92, blood_pressure: '158/95', spo2: 94, temperature: 99.1 }, ai_results: { pain_score: 8, voice_condition: 'parkinsons', surgery_risk: 'high' } },
        { id: 2, name: 'Jane Smith', age: 45, status: 'monitoring', risk_level: 'medium', conditions: ['Asthma'], vitals: { heart_rate: 78, blood_pressure: '132/85', spo2: 96, temperature: 98.8 }, ai_results: { pain_score: 3, voice_condition: 'respiratory', surgery_risk: 'medium' } },
        { id: 3, name: 'Robert Brown', age: 72, status: 'critical', risk_level: 'high', conditions: ['CAD', 'COPD'], vitals: { heart_rate: 105, blood_pressure: '165/100', spo2: 91, temperature: 100.2 }, ai_results: { pain_score: 6, voice_condition: 'respiratory', surgery_risk: 'high' } },
        { id: 4, name: 'Emily Davis', age: 34, status: 'active', risk_level: 'low', conditions: [], vitals: { heart_rate: 68, blood_pressure: '118/76', spo2: 99, temperature: 98.4 }, ai_results: { pain_score: 0, voice_condition: 'healthy', surgery_risk: 'low' } },
        { id: 5, name: 'Michael Wilson', age: 58, status: 'monitoring', risk_level: 'medium', conditions: ['High Cholesterol'], vitals: { heart_rate: 82, blood_pressure: '142/88', spo2: 97, temperature: 98.6 }, ai_results: { pain_score: 2, voice_condition: 'healthy', surgery_risk: 'medium' } },
        { id: 6, name: 'Sarah Martinez', age: 29, status: 'monitoring', risk_level: 'low', conditions: ['Depression'], vitals: { heart_rate: 72, blood_pressure: '115/72', spo2: 98, temperature: 98.2 }, ai_results: { pain_score: 1, voice_condition: 'depression', surgery_risk: 'low' } },
      ]);
      setRecentCheckups([]);
      setDoctorDirectory([]);
      setBookingAppointments([]);
      setHospitalCatalog([
        { _id: '661111111111111111111111', name: 'AIIMS Mangalagiri', location: 'Mangalagiri' },
        { _id: '662222222222222222222222', name: 'Apollo Hospitals Visakhapatnam', location: 'Visakhapatnam' },
        { _id: '663333333333333333333333', name: 'Andhra Hospitals Vijayawada', location: 'Vijayawada' },
      ]);
      setBookingDoctorDirectory([]);
    }
  };

  const stats = overview?.stats || {};

  const addPatient = async () => {
    const normalizedId = patientIdInput.trim().toUpperCase();
    if (!normalizedId) {
      setAddPatientMessage('Please enter a patient ID (example: P-1001).');
      return;
    }

    if (patients.some((p) => String(p.id).toUpperCase() === normalizedId)) {
      setAddPatientMessage('This patient is already added in the doctor dashboard.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/patients/by-id/${encodeURIComponent(normalizedId)}`);
      const data = await res.json();
      if (data.success) {
        setPatients(prev => [data.patient, ...prev]);
        setPatientIdInput('');
        setAddPatientMessage(`Patient ${data.patient.name} (${data.patient.id}) added successfully.`);
        setShowAddPatient(false);
      } else {
        setAddPatientMessage(data.error || 'Patient ID not found.');
      }
    } catch {
      setAddPatientMessage('Unable to fetch patient by ID right now. Please try again.');
    }
  };

  const deletePatient = async (patientId) => {
    if (!window.confirm('Are you sure you want to remove this patient?')) return;
    try {
      await fetch(`${API_BASE}/patients/${patientId}`, { method: 'DELETE' });
    } catch {
      // Continue with local removal
    }
    setPatients(prev => prev.filter(p => p.id !== patientId));
  };

  const openPatientPage = (patient) => {
    navigate(`/doctor/patient/${encodeURIComponent(patient.id)}`, { state: { patient } });
  };
  const trends = overview?.health_trends || [];

  const heartRateChart = {
    labels: trends.map(t => t.label),
    datasets: [{
      label: 'Avg Heart Rate',
      data: trends.map(t => t.heart_rate),
      borderColor: '#EF4444',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#EF4444',
    }],
  };

  const bpChart = {
    labels: trends.map(t => t.label),
    datasets: [{
      label: 'Systolic BP',
      data: trends.map(t => t.blood_pressure_systolic),
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4,
    }],
  };

  const diseaseDistribution = {
    labels: ['Stable', 'Monitoring', 'Follow-up', 'Behavioral', 'Other'],
    datasets: [{
      data: [62, 12, 15, 8, 3],
      backgroundColor: ['#10B981', '#8B5CF6', '#F59E0B', '#3B82F6', '#6B7280'],
      borderWidth: 0,
    }],
  };

  const painChart = {
    labels: trends.map(t => t.label),
    datasets: [{
      label: 'Avg Symptom Risk',
      data: trends.map(t => t.pain_score),
      backgroundColor: 'rgba(12, 165, 235, 0.8)',
      borderColor: '#0CA5EB',
      borderWidth: 1,
      borderRadius: 6,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } } },
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { padding: 15, font: { size: 11 } } },
    },
    cutout: '65%',
  };

  const statusColors = {
    critical: 'bg-red-100 text-red-700',
    monitoring: 'bg-yellow-100 text-yellow-700',
    active: 'bg-green-100 text-green-700',
  };

  const riskColors = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-green-100 text-green-700',
  };

  const filteredPatients = patients.filter((patient) => {
    const name = String(patient.name || '').toLowerCase();
    const id = String(patient.id || '').toLowerCase();
    const conditions = Array.isArray(patient.conditions) ? patient.conditions.join(' ').toLowerCase() : '';
    const query = patientSearch.trim().toLowerCase();
    const matchesSearch = query
      ? name.includes(query) || id.includes(query) || conditions.includes(query)
      : true;
    const matchesRisk = patientRiskFilter === 'all'
      ? true
      : String(patient.risk_level || '').toLowerCase() === patientRiskFilter;
    const matchesStatus = patientStatusFilter === 'all'
      ? true
      : String(patient.status || '').toLowerCase() === patientStatusFilter;

    return matchesSearch && matchesRisk && matchesStatus;
  });

  const patientSummary = {
    total: patients.length,
    critical: patients.filter((p) => String(p.risk_level || '').toLowerCase() === 'high').length,
    monitoring: patients.filter((p) => String(p.status || '').toLowerCase() === 'monitoring').length,
    registered: patients.filter((p) => String(p.source || '').toLowerCase() !== 'prototype').length,
  };

  const patientCounts = {
    critical: patients.filter((p) => String(p.risk_level || '').toLowerCase() === 'high').length,
    monitoring: patients.filter((p) => String(p.status || '').toLowerCase() === 'monitoring').length,
  };

  const tabs = [
    { id: 'activity', label: 'Hospital Activity', icon: '🏥' },
    { id: 'patients', label: 'Patients', icon: '👥' },
    { id: 'appointments', label: 'Appointments', icon: '📅' },
    { id: 'alerts', label: 'Alerts', icon: '🔔', badge: alerts.filter(a => !a.acknowledged).length },
    { id: 'emergency', label: 'Emergency', icon: '🚨' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
  ];

  const patientAppointments = patients
    .flatMap((patient) =>
      (patient.appointments || []).map((apt) => ({
        ...apt,
        patient_id: patient.id,
        patient_name: patient.name,
        status: getComputedAppointmentStatus(apt.date, apt.status),
      }))
    );

  const allAppointments = [...patientAppointments, ...bookingAppointments]
    .filter((apt) => String(apt.status || '').toLowerCase() !== 'deleted')
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

  const matchesDateRange = (dateText) => {
    if (appointmentDateRange === 'all') return true;
    if (!dateText) return false;

    const aptDate = new Date(dateText);
    if (Number.isNaN(aptDate.getTime())) return false;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const aptDay = new Date(aptDate.getFullYear(), aptDate.getMonth(), aptDate.getDate());

    if (appointmentDateRange === 'today') {
      return aptDay.getTime() === todayStart.getTime();
    }

    if (appointmentDateRange === 'week') {
      const weekEnd = new Date(todayStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      return aptDay >= todayStart && aptDay < weekEnd;
    }

    if (appointmentDateRange === 'month') {
      const monthEnd = new Date(todayStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      return aptDay >= todayStart && aptDay < monthEnd;
    }

    return true;
  };

  const filteredAppointments = allAppointments.filter((apt) => {
    const statusMatch = appointmentFilter === 'all'
      ? true
      : String(apt.status || '').toLowerCase() === appointmentFilter;
    const dateMatch = matchesDateRange(apt.date);
    return statusMatch && dateMatch;
  });

  const hospitalInsights = useMemo(() => {
    const doctorsByHospital = {};
    bookingDoctorDirectory.forEach((doc) => {
      const hospitalObj = doc?.hospital_id;
      const hospitalId = typeof hospitalObj === 'object' ? hospitalObj?._id : hospitalObj;
      if (!hospitalId) return;
      if (!doctorsByHospital[hospitalId]) doctorsByHospital[hospitalId] = [];
      doctorsByHospital[hospitalId].push(doc);
    });

    const appointmentsByHospital = {};
    bookingAppointments.forEach((apt) => {
      const hid = apt.hospital_id || apt.hospitalId;
      if (!hid) return;
      appointmentsByHospital[hid] = (appointmentsByHospital[hid] || 0) + 1;
    });

    return (hospitalCatalog || []).map((hospital) => {
      const doctors = doctorsByHospital[hospital._id] || [];
      const specializations = [...new Set(doctors.map((d) => d.specialization).filter(Boolean))];
      return {
        ...hospital,
        doctorCount: doctors.length,
        activeAppointments: appointmentsByHospital[hospital._id] || 0,
        specializations,
        topDoctors: doctors.slice(0, 3).map((d) => d.name),
        features: getHospitalFeatureList(hospital.name, specializations),
      };
    });
  }, [hospitalCatalog, bookingDoctorDirectory, bookingAppointments]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="gradient-medical-dark text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold">Doctor Dashboard</h1>
              <p className="text-gray-300 text-sm mt-1">Real-time patient monitoring & AI insights for {doctorName}</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
              <NotificationPanel userId={doctorId || 'doctor'} userRole="doctor" />
              <div className="relative">
                <button
                  onClick={() => setShowQuickMenu((prev) => !prev)}
                  className="h-10 px-3 bg-white/20 rounded-xl flex items-center gap-2 hover:bg-white/30 transition-colors"
                  title="Patients Data"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-5-3.87M17 20H7m10 0v-2c0-.66-.08-1.3-.24-1.9M7 20H2v-2a4 4 0 015-3.87M7 20v-2c0-.66.08-1.3.24-1.9m0 0a5 5 0 019.52 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-xs font-semibold hidden md:inline">Patients Data</span>
                </button>
                {showQuickMenu && (
                  <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                          setShowQuickMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-gray-50 ${
                          activeTab === tab.id ? 'text-medical-700 bg-medical-50' : 'text-gray-700'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{tab.icon}</span>
                          {tab.label}
                        </span>
                        {tab.badge > 0 && (
                          <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                            {tab.badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium">{doctorName}</div>
                <div className="text-xs text-gray-400">{doctorSpecialization}</div>
              </div>
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-lg">👩‍⚕️</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {[
            { label: 'Total Patients', value: stats.total_patients || 156, icon: '👥', color: 'text-medical-600' },
            { label: 'Active Monitoring', value: stats.active_monitoring || 23, icon: '🖥️', color: 'text-teal-600' },
            { label: 'Critical Alerts', value: stats.critical_alerts || 3, icon: '🚨', color: 'text-red-600' },
            { label: 'Scans Today', value: stats.scans_today || 47, icon: '🔍', color: 'text-purple-600' },
            { label: 'AI Accuracy', value: `${stats.ai_accuracy || 94.7}%`, icon: '🎯', color: 'text-green-600' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 card-hover">
              <span className="text-2xl">{stat.icon}</span>
              <div className={`text-2xl font-bold mt-2 ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="mb-6 text-sm text-gray-500 flex items-center gap-2">
          <span>Section:</span>
          <span className="px-2 py-1 bg-medical-50 text-medical-700 rounded-md font-medium">
            {tabs.find((t) => t.id === activeTab)?.label || 'Overview'}
          </span>
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in">
          {activeTab === 'patients' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Patient List</h3>
                <button
                  onClick={() => {
                    setShowAddPatient(!showAddPatient);
                    setAddPatientMessage('');
                  }}
                  className="px-4 py-2 gradient-medical text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  {showAddPatient ? '✕ Cancel' : '+ Add Patient'}
                </button>
              </div>

              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                  <div className="bg-white rounded-xl border border-gray-100 p-3">
                    <div className="text-xs text-gray-500">Total Patients</div>
                    <div className="text-xl font-bold text-gray-900 mt-1">{patientSummary.total}</div>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 p-3">
                    <div className="text-xs text-gray-500">High Risk</div>
                    <div className="text-xl font-bold text-red-600 mt-1">{patientSummary.critical}</div>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 p-3">
                    <div className="text-xs text-gray-500">Monitoring</div>
                    <div className="text-xl font-bold text-yellow-600 mt-1">{patientSummary.monitoring}</div>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 p-3">
                    <div className="text-xs text-gray-500">Registered IDs</div>
                    <div className="text-xl font-bold text-medical-700 mt-1">{patientSummary.registered}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    placeholder="Search by name, ID, condition..."
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-medical-400 bg-white"
                  />
                  <select
                    value={patientRiskFilter}
                    onChange={(e) => setPatientRiskFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-medical-400 bg-white"
                  >
                    <option value="all">All Risk Levels</option>
                    <option value="high">High Risk</option>
                    <option value="medium">Medium Risk</option>
                    <option value="low">Low Risk</option>
                  </select>
                  <select
                    value={patientStatusFilter}
                    onChange={(e) => setPatientStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-medical-400 bg-white"
                  >
                    <option value="all">All Status</option>
                    <option value="critical">Critical</option>
                    <option value="monitoring">Monitoring</option>
                    <option value="active">Active</option>
                  </select>
                </div>
              </div>

              {showAddPatient && (
                <div className="p-4 bg-medical-50 border-b border-medical-100 animate-slide-up">
                  <div className="flex flex-col sm:flex-row gap-3 mb-3">
                    <input
                      type="text"
                      placeholder="Enter Unique Patient ID (e.g., P-1001)"
                      value={patientIdInput}
                      onChange={(e) => setPatientIdInput(e.target.value.toUpperCase())}
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-medical-400"
                    />
                    <button
                      onClick={addPatient}
                      disabled={!patientIdInput.trim()}
                      className="w-full sm:w-auto px-5 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Fetch Patient Data
                    </button>
                  </div>
                  <p className="text-xs text-gray-600">Use the unique patient ID shown in patient dashboard.</p>
                  {addPatientMessage && (
                    <p className="text-xs text-medical-700 mt-2 bg-white px-3 py-2 rounded-lg border border-medical-100">
                      {addPatientMessage}
                    </p>
                  )}
                </div>
              )}

              <div className="divide-y divide-gray-50">
                {filteredPatients.map((patient) => (
                  <div key={patient.id} className="p-4 flex items-start sm:items-center gap-3 sm:gap-4 hover:bg-gray-50 transition-colors">
                    <button
                      onClick={() => openPatientPage(patient)}
                      className="flex-1 flex items-center gap-4 min-w-0 text-left"
                    >
                      <div className="w-10 h-10 bg-medical-100 rounded-full flex items-center justify-center text-medical-600 font-bold text-sm">
                        {patient.name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">{patient.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[patient.status] || 'bg-gray-100 text-gray-600'}`}>
                            {patient.status}
                          </span>
                          {String(patient.source || '').toLowerCase() !== 'prototype' && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-medical-100 text-medical-700">Real</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-2 gap-y-1">
                          <span>{typeof patient.id === 'string' && patient.id.startsWith('P-') ? `ID: ${patient.id}` : `ID: ${patient.id}`}</span>
                          <span>Age: {patient.age ?? 'N/A'}</span>
                          {patient.gender && <span>Gender: {patient.gender}</span>}
                          {patient.blood_group && <span>Blood: {patient.blood_group}</span>}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 truncate">
                          Conditions: {patient.conditions?.join(', ') || 'No conditions'}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${riskColors[patient.risk_level] || 'bg-gray-100'}`}>
                        {patient.risk_level?.toUpperCase()}
                      </span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePatient(patient.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                      title="Remove patient"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
                {filteredPatients.length === 0 && (
                  <div className="p-10 text-center text-gray-400">
                    <span className="text-4xl">🔎</span>
                    <p className="mt-3 text-sm">No patients match current filters</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'alerts' && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Alert Notifications</h3>
                <span className="text-sm text-gray-500">
                  {alerts.filter(a => !a.acknowledged).length} unacknowledged
                </span>
              </div>
              <AlertPanel alerts={alerts} />
            </div>
          )}

          {activeTab === 'appointments' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Appointments</h3>
                <span className="text-sm text-gray-500">Total: {allAppointments.length}</span>
              </div>

              <div className="px-4 pt-4 flex flex-wrap gap-2">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'upcoming', label: 'Upcoming' },
                  { key: 'completed', label: 'Completed' },
                  { key: 'cancelled', label: 'Cancelled' },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setAppointmentFilter(item.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      appointmentFilter === item.key
                        ? 'bg-medical-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="px-4 pt-3 pb-2 flex flex-wrap items-center gap-2 border-b border-gray-50">
                {[
                  { key: 'all', label: 'All Dates' },
                  { key: 'today', label: 'Today' },
                  { key: 'week', label: 'This Week' },
                  { key: 'month', label: 'This Month' },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setAppointmentDateRange(item.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      appointmentDateRange === item.key
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
                <span className="ml-auto text-xs text-gray-500">
                  Showing {filteredAppointments.length} of {allAppointments.length}
                </span>
              </div>

              {filteredAppointments.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {filteredAppointments.map((apt, idx) => (
                    <div key={apt.id || idx} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900">{apt.type || 'Appointment'}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Patient: {apt.patient_name || 'Unknown'} ({apt.patient_id || 'N/A'})
                        </div>
                        <div className="text-xs text-gray-500">Doctor: {apt.doctor || 'N/A'}</div>
                      </div>
                      <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-3">
                        <button
                          onClick={() => openPatientPage({ id: apt.patient_id, name: apt.patient_name })}
                          className="px-3 py-1.5 text-xs font-semibold bg-medical-50 text-medical-700 rounded-lg hover:bg-medical-100"
                        >
                          Open Patient
                        </button>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">{apt.date || 'N/A'}</div>
                          <div className="text-xs text-gray-500">{apt.time || 'Time N/A'}</div>
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            apt.status === 'upcoming'
                              ? 'bg-medical-100 text-medical-700'
                              : apt.status === 'cancelled'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-green-100 text-green-700'
                          }`}>
                            {apt.status || 'unknown'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-gray-400">
                  <span className="text-4xl">📅</span>
                  <p className="mt-3 text-sm">No appointments found for selected filter</p>
                </div>
              )}

              <div className="border-t border-gray-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-900">Recent Checkups</h4>
                  <span className="text-xs text-gray-500">{recentCheckups.length} records</span>
                </div>
                {recentCheckups.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {recentCheckups.slice(0, 8).map((checkup) => (
                      <div key={checkup.id} className="rounded-xl border border-gray-100 p-3 bg-gray-50">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{checkup.type || 'Checkup'}</div>
                            <div className="text-xs text-gray-500 mt-0.5">Patient: {checkup.patient_id || 'N/A'} • {checkup.doctor_name || 'Doctor N/A'}</div>
                            <div className="text-xs text-gray-500 mt-1">{checkup.diagnosis || checkup.assessment || 'No assessment'}</div>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 whitespace-nowrap">{checkup.date || 'N/A'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">No recent checkup records available.</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'emergency' && (
            <EmergencyAlert userRole="doctor" />
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Symptom Trend */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Average Symptom Risk</h3>
                  <div className="h-64">
                    <Bar data={painChart} options={chartOptions} />
                  </div>
                </div>

                {/* Monitoring Distribution */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Condition Distribution</h3>
                  <div className="h-64">
                    <Doughnut data={diseaseDistribution} options={doughnutOptions} />
                  </div>
                </div>

                {/* Heart Rate Trend */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Heart Rate Monitoring</h3>
                  <div className="h-64">
                    <Line data={heartRateChart} options={chartOptions} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ACTIVITY TAB - Doctor Activity & Statistics */}
          {activeTab === 'activity' && (
            <div className="space-y-6">
              {/* Activity Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Patients Handled Today', value: patients.length, icon: '👥', color: 'blue' },
                  { label: 'Alerts Responded', value: alerts.filter(a => a.acknowledged).length, icon: '✅', color: 'green' },
                  { label: 'Pending Alerts', value: alerts.filter(a => !a.acknowledged).length, icon: '⏳', color: 'yellow' },
                  { label: 'Checkups Completed', value: recentCheckups.length, icon: '✓', color: 'purple' },
                ].map((stat, idx) => (
                  <div key={idx} className={`bg-${stat.color}-50 rounded-2xl border border-${stat.color}-200 p-6`}>
                    <span className="text-3xl">{stat.icon}</span>
                    <div className="text-3xl font-bold mt-2 text-gray-900">{stat.value}</div>
                    <div className="text-xs text-gray-600 mt-2">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Detailed Activity */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Doctor Activity Log</h3>
                <div className="space-y-3">
                  {[
                    { time: '09:15 AM', action: 'Reviewed patient vitals', patient: 'John Doe', status: 'completed' },
                    { time: '09:45 AM', action: 'Responded to critical alert', patient: 'Jane Smith', status: 'completed' },
                    { time: '10:20 AM', action: 'Completed checkup', patient: 'Robert Brown', status: 'completed' },
                    { time: '10:45 AM', action: 'Prescribed medication', patient: 'Emily Davis', status: 'completed' },
                    { time: '11:00 AM', action: 'Scheduled follow-up', patient: 'Michael Wilson', status: 'pending' },
                  ].map((log, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-semibold text-gray-900 min-w-20">{log.time}</div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{log.action}</div>
                        <div className="text-xs text-gray-500">{log.patient}</div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        log.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hospital Data & Features */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">🏥 Hospitals & Available Features</h3>
                  <span className="text-xs text-gray-500">{hospitalInsights.length} hospitals</span>
                </div>

                {hospitalInsights.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {hospitalInsights.map((hospital) => (
                      <div key={hospital._id} className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{hospital.name}</div>
                            <div className="text-xs text-gray-500">{hospital.location}</div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-xs bg-medical-100 text-medical-700 font-semibold">
                            {hospital.doctorCount} doctors
                          </span>
                        </div>

                        <div className="text-xs text-gray-600 mb-2">
                          Active appointments in scope: <span className="font-semibold text-gray-900">{hospital.activeAppointments}</span>
                        </div>

                        {hospital.specializations.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {hospital.specializations.slice(0, 4).map((spec) => (
                              <span key={`${hospital._id}-${spec}`} className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                                {spec}
                              </span>
                            ))}
                          </div>
                        )}

                        {hospital.topDoctors.length > 0 && (
                          <div className="mb-3">
                            <div className="text-xs font-semibold text-gray-700 mb-1">Doctors</div>
                            <div className="text-xs text-gray-600">{hospital.topDoctors.join(', ')}</div>
                          </div>
                        )}

                        <div>
                          <div className="text-xs font-semibold text-gray-700 mb-1">Features Available</div>
                          <ul className="space-y-1">
                            {hospital.features.map((feature) => (
                              <li key={`${hospital._id}-${feature}`} className="text-xs text-gray-600 flex items-start gap-1.5">
                                <span className="text-teal-600">•</span>
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">Hospital data is currently unavailable.</div>
                )}
              </div>

              {/* Performance Metrics */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Performance Metrics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-4">Patient Categories</h4>
                    <div className="space-y-3">
                      {[
                        { category: 'Critical', count: patientCounts.critical, color: 'red' },
                        { category: 'Monitoring', count: patientCounts.monitoring, color: 'yellow' },
                        { category: 'Stable', count: patients.length - patientCounts.critical - patientCounts.monitoring, color: 'green' },
                      ].map((cat, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{cat.category}</span>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full bg-${cat.color}-500`}></div>
                            <span className="font-semibold text-gray-900">{cat.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-4">Response Times</h4>
                    <div className="space-y-3">
                      {[
                        { metric: 'Avg Alert Response', time: '4.2 min', badge: 'Excellent' },
                        { metric: 'Avg Checkup Time', time: '18 min', badge: 'Good' },
                        { metric: 'Follow-up Rate', time: '94%', badge: 'Excellent' },
                      ].map((metric, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <span className="text-sm text-gray-700">{metric.metric}</span>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">{metric.time}</div>
                            <span className="text-xs text-green-600 font-medium">{metric.badge}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
};

export { DoctorDashboard };
export default DoctorDashboard;
