import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { createPatientCheckup, getPatientCheckups } from '../services/api';
import { API_BASE } from '../config/apiConfig';

const DoctorPatientDetail = () => {
  const { patientId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(location.state?.patient || null);
  const [checkups, setCheckups] = useState(location.state?.patient?.checkups || []);
  const [checkupForm, setCheckupForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'Routine Follow-up',
    department: 'General Medicine',
    chief_complaint: '',
    diagnosis: '',
    assessment: 'Moderate risk',
    plan: '',
    follow_up_in_days: 14,
    heart_rate: '',
    blood_pressure: '',
    spo2: '',
    temperature: '',
    respiration_rate: '',
    blood_glucose: '',
  });
  const [checkupBusy, setCheckupBusy] = useState(false);
  const [checkupMessage, setCheckupMessage] = useState('');
  const [loading, setLoading] = useState(!location.state?.patient);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadPatient = async () => {
      if (patient) return;

      setLoading(true);
      setError('');

      try {
        const byUniqueId = await fetch(`${API_BASE}/auth/patients/by-id/${encodeURIComponent(patientId)}`);
        const byUniqueIdData = await byUniqueId.json();
        if (byUniqueIdData.success && byUniqueIdData.patient) {
          setPatient(byUniqueIdData.patient);
          setLoading(false);
          return;
        }
      } catch {
        // try numeric patient endpoint below
      }

      try {
        const byNumericId = await fetch(`${API_BASE}/patients/${encodeURIComponent(patientId)}`);
        const byNumericIdData = await byNumericId.json();
        if (byNumericIdData.success && byNumericIdData.patient) {
          setPatient(byNumericIdData.patient);
          setLoading(false);
          return;
        }
      } catch {
        // handled below
      }

      setError('Unable to load patient details for this ID.');
      setLoading(false);
    };

    loadPatient();
  }, [patient, patientId]);

  useEffect(() => {
    const loadCheckups = async () => {
      if (!patient?.id) return;
      try {
        const res = await getPatientCheckups(patient.id);
        if (res.data?.success && Array.isArray(res.data.checkups)) {
          setCheckups(res.data.checkups);
          return;
        }
      } catch {
        // Keep existing checkups if request fails
      }
      setCheckups(patient.checkups || []);
    };

    loadCheckups();
  }, [patient?.id]);

  const handleCheckupInputChange = (e) => {
    const { name, value } = e.target;
    setCheckupForm((prev) => ({ ...prev, [name]: value }));
    setCheckupMessage('');
  };

  const handleCreateCheckup = async (e) => {
    e.preventDefault();
    if (!patient?.id) return;

    const storedUser = localStorage.getItem('user');
    const doctor = storedUser ? JSON.parse(storedUser) : null;
    const doctorName = doctor?.name || 'Doctor';
    const doctorId = doctor?.id || 'UNKNOWN';

    if (!checkupForm.type || !checkupForm.date || !checkupForm.diagnosis) {
      setCheckupMessage('Please fill date, type and diagnosis.');
      return;
    }

    const vitals = {
      ...(checkupForm.heart_rate ? { heart_rate: Number(checkupForm.heart_rate) } : {}),
      ...(checkupForm.blood_pressure ? { blood_pressure: checkupForm.blood_pressure } : {}),
      ...(checkupForm.spo2 ? { spo2: Number(checkupForm.spo2) } : {}),
      ...(checkupForm.temperature ? { temperature: Number(checkupForm.temperature) } : {}),
      ...(checkupForm.respiration_rate ? { respiration_rate: Number(checkupForm.respiration_rate) } : {}),
      ...(checkupForm.blood_glucose ? { blood_glucose: Number(checkupForm.blood_glucose) } : {}),
    };

    try {
      setCheckupBusy(true);
      const payload = {
        patient_id: patient.id,
        doctor_id: doctorId,
        doctor_name: doctorName,
        date: checkupForm.date,
        type: checkupForm.type,
        department: checkupForm.department,
        chief_complaint: checkupForm.chief_complaint,
        diagnosis: checkupForm.diagnosis,
        assessment: checkupForm.assessment,
        plan: checkupForm.plan,
        follow_up_in_days: Number(checkupForm.follow_up_in_days || 14),
        vitals,
      };

      const res = await createPatientCheckup(payload);
      if (res.data?.success && res.data?.checkup) {
        setCheckups((prev) => [res.data.checkup, ...prev]);
        setCheckupMessage('Checkup created successfully.');
        setCheckupForm((prev) => ({
          ...prev,
          chief_complaint: '',
          diagnosis: '',
          plan: '',
          heart_rate: '',
          blood_pressure: '',
          spo2: '',
          temperature: '',
          respiration_rate: '',
          blood_glucose: '',
        }));
      } else {
        setCheckupMessage(res.data?.error || 'Unable to create checkup record.');
      }
    } catch {
      setCheckupMessage('Failed to create checkup record. Please try again.');
    } finally {
      setCheckupBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-medical-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Patient Details</h2>
          <p className="text-sm text-red-600">{error || 'Patient data not found.'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-4 py-2 rounded-lg bg-medical-600 text-white text-sm font-medium"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const vitals = patient.vitals || {};
  const ai = patient.ai_results || {};
  const conditions = patient.conditions || [];
  const appointments = patient.appointments || [];
  const medications = patient.medications || [];
  const smartwatch = patient.smartwatch_history || [];

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-medical-600 hover:text-medical-700 mb-4"
          >
            ← Back to Doctor Dashboard
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-center sm:text-left">
            <div className="w-16 h-16 rounded-full gradient-medical text-white flex items-center justify-center text-2xl font-bold">
              {patient.name?.charAt(0) || 'P'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{patient.name}</h1>
              <p className="text-sm text-gray-600 mt-1">
                ID: {patient.id} • Age: {patient.age ?? 'N/A'}
                {patient.gender ? ` • ${patient.gender}` : ''}
                {patient.blood_group ? ` • Blood: ${patient.blood_group}` : ''}
              </p>
              {patient.email && <p className="text-xs text-gray-500 mt-1">Email: {patient.email}</p>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: 'Heart Rate', value: vitals.heart_rate ? `${vitals.heart_rate} bpm` : 'N/A', icon: '❤️' },
            { label: 'Blood Pressure', value: vitals.blood_pressure || 'N/A', icon: '🩸' },
            { label: 'SpO2', value: vitals.spo2 ? `${vitals.spo2}%` : 'N/A', icon: '🫁' },
            { label: 'Temperature', value: vitals.temperature ? `${vitals.temperature}°F` : 'N/A', icon: '🌡️' },
            { label: 'Respiration', value: vitals.respiration_rate ? `${vitals.respiration_rate}/min` : 'N/A', icon: '💨' },
            { label: 'Blood Glucose', value: vitals.blood_glucose ? `${vitals.blood_glucose} mg/dL` : 'N/A', icon: '🧪' },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="text-2xl">{item.icon}</div>
              <div className="text-xs text-gray-500 mt-2">{item.label}</div>
              <div className="text-lg font-semibold text-gray-900 mt-1">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Analysis</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-700">Pain Score</span>
                <span className="text-sm font-semibold text-gray-900">{ai.pain_score ?? 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-700">Voice Condition</span>
                <span className="text-sm font-semibold text-gray-900 capitalize">{ai.voice_condition || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-700">Health Score</span>
                <span className="text-sm font-semibold text-gray-900">{ai.health_score ?? 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Conditions</h3>
            {conditions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {conditions.map((condition) => (
                  <span key={condition} className="px-3 py-1 bg-medical-50 text-medical-700 rounded-full text-sm font-medium">
                    {condition}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No conditions recorded.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Checkup</h3>
          <form onSubmit={handleCreateCheckup} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="date"
                name="date"
                value={checkupForm.date}
                onChange={handleCheckupInputChange}
                className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
                required
              />
              <input
                type="text"
                name="type"
                placeholder="Checkup Type"
                value={checkupForm.type}
                onChange={handleCheckupInputChange}
                className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
                required
              />
              <input
                type="text"
                name="department"
                placeholder="Department"
                value={checkupForm.department}
                onChange={handleCheckupInputChange}
                className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                name="chief_complaint"
                placeholder="Chief Complaint"
                value={checkupForm.chief_complaint}
                onChange={handleCheckupInputChange}
                className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
              />
              <input
                type="text"
                name="diagnosis"
                placeholder="Diagnosis"
                value={checkupForm.diagnosis}
                onChange={handleCheckupInputChange}
                className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select
                name="assessment"
                value={checkupForm.assessment}
                onChange={handleCheckupInputChange}
                className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
              >
                <option value="Low risk">Low risk</option>
                <option value="Moderate risk">Moderate risk</option>
                <option value="High risk">High risk</option>
              </select>
              <input
                type="number"
                name="follow_up_in_days"
                placeholder="Follow-up days"
                value={checkupForm.follow_up_in_days}
                onChange={handleCheckupInputChange}
                className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
                min="1"
              />
              <input
                type="text"
                name="plan"
                placeholder="Treatment Plan"
                value={checkupForm.plan}
                onChange={handleCheckupInputChange}
                className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <input type="number" name="heart_rate" placeholder="HR" value={checkupForm.heart_rate} onChange={handleCheckupInputChange} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
              <input type="text" name="blood_pressure" placeholder="BP (120/80)" value={checkupForm.blood_pressure} onChange={handleCheckupInputChange} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
              <input type="number" name="spo2" placeholder="SpO2" value={checkupForm.spo2} onChange={handleCheckupInputChange} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
              <input type="number" step="0.1" name="temperature" placeholder="Temp" value={checkupForm.temperature} onChange={handleCheckupInputChange} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
              <input type="number" name="respiration_rate" placeholder="Resp" value={checkupForm.respiration_rate} onChange={handleCheckupInputChange} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
              <input type="number" name="blood_glucose" placeholder="Glucose" value={checkupForm.blood_glucose} onChange={handleCheckupInputChange} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
            </div>

            <button
              type="submit"
              disabled={checkupBusy}
              className="px-4 py-2.5 bg-medical-600 text-white rounded-xl text-sm font-semibold hover:bg-medical-700 disabled:opacity-50"
            >
              {checkupBusy ? 'Saving...' : 'Save Checkup'}
            </button>
            {checkupMessage && <p className="text-sm text-medical-700">{checkupMessage}</p>}
          </form>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointments</h3>
            {appointments.length > 0 ? (
              <div className="space-y-2">
                {appointments.map((apt, idx) => (
                  <div key={apt.id || idx} className="p-3 bg-gray-50 rounded-xl">
                    <div className="text-sm font-medium text-gray-900">{apt.type || 'Appointment'}</div>
                    <div className="text-xs text-gray-500 mt-1">{apt.date || 'N/A'} • {apt.doctor || 'N/A'}</div>
                    {apt.status && (
                      <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs bg-medical-100 text-medical-700">
                        {apt.status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No appointments recorded.</p>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Medications</h3>
            {medications.length > 0 ? (
              <div className="space-y-2">
                {medications.map((med, idx) => (
                  <div key={med.name || idx} className="p-3 bg-gray-50 rounded-xl">
                    <div className="text-sm font-medium text-gray-900">{med.name || 'Medication'}</div>
                    <div className="text-xs text-gray-500 mt-1">{med.dosage || 'Dosage N/A'}</div>
                    {med.status && (
                      <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                        {med.status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No medications recorded.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Checkup Records</h3>
            <span className="text-xs text-gray-500">Total: {checkups.length}</span>
          </div>
          {checkups.length > 0 ? (
            <div className="space-y-2">
              {checkups.map((checkup) => (
                <div key={checkup.id} className="p-3 bg-gray-50 rounded-xl">
                  <div className="text-sm font-medium text-gray-900">{checkup.type || 'Checkup'}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {checkup.date || 'N/A'} • {checkup.doctor_name || 'Doctor N/A'} • {checkup.department || 'General'}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">{checkup.diagnosis || checkup.assessment || 'No diagnosis provided'}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No checkup records available for this patient.</p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Smartwatch History</h3>
          {smartwatch.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">HR</th>
                    <th className="py-2 pr-4">SpO2</th>
                    <th className="py-2 pr-4">BP</th>
                    <th className="py-2 pr-4">Glucose</th>
                  </tr>
                </thead>
                <tbody>
                  {smartwatch.map((row, idx) => (
                    <tr key={`${row.label}-${idx}`} className="border-b border-gray-50 text-gray-700">
                      <td className="py-2 pr-4">{row.label || 'N/A'}</td>
                      <td className="py-2 pr-4">{row.heart_rate ?? 'N/A'}</td>
                      <td className="py-2 pr-4">{row.spo2 ?? 'N/A'}</td>
                      <td className="py-2 pr-4">{row.systolic_bp ?? 'N/A'}/{row.diastolic_bp ?? 'N/A'}</td>
                      <td className="py-2 pr-4">{row.blood_glucose ?? 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No smartwatch history found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorPatientDetail;
