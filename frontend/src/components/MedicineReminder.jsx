import React, { useMemo, useState, useEffect } from 'react';
import { API_BASE } from '../config/apiConfig';

const MedicineReminder = ({ user }) => {
  const [reminders, setReminders] = useState([]);
  const [todaysReminders, setTodaysReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState('today');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [formData, setFormData] = useState({
    medicine_name: '',
    dosage: '',
    time: '',
    frequency: 'daily',
    days_of_week: [],
    instructions: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: ''
  });

  const todayIso = new Date().toISOString().split('T')[0];

  const resolvedPatientId = useMemo(() => user?.id || user?.patient_id || user?.patientId || user?._id || (() => {
    try {
      const stored = localStorage.getItem('user');
      const parsed = stored ? JSON.parse(stored) : null;
      return parsed?.id || parsed?.patient_id || parsed?.patientId || parsed?._id || '';
    } catch {
      return '';
    }
  })(), [user]);

  const getHeaders = (withJson = false) => {
    const token = localStorage.getItem('token');
    return {
      ...(withJson ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  useEffect(() => {
    loadReminders();
  }, [resolvedPatientId]);

  useEffect(() => {
    if (!success) return undefined;
    setShowToast(true);
    const t = setTimeout(() => setShowToast(false), 2500);
    return () => clearTimeout(t);
  }, [success]);

  const parseJsonSafe = async (response) => {
    const raw = await response.text();
    let data = null;

    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        data = null;
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
      raw,
    };
  };

  const loadReminders = async () => {
    if (!resolvedPatientId) {
      setError('Patient profile not available. Please sign in again.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const [allHttp, todayHttp] = await Promise.all([
        fetch(`${API_BASE}/reminders?patient_id=${encodeURIComponent(resolvedPatientId)}`, {
          headers: getHeaders(false)
        }),
        fetch(`${API_BASE}/reminders/today?patient_id=${encodeURIComponent(resolvedPatientId)}`, {
          headers: getHeaders(false)
        })
      ]);

      const [allParsed, todayParsed] = await Promise.all([
        parseJsonSafe(allHttp),
        parseJsonSafe(todayHttp),
      ]);

      const allData = allParsed.data;
      const todayData = todayParsed.data;
      const allOk = allParsed.ok && allData?.success;
      const todayOk = todayParsed.ok && todayData?.success;

      setReminders(allOk ? (allData.reminders || []) : []);
      setTodaysReminders(todayOk ? (todayData.reminders || []) : []);

      if (!allOk || !todayOk) {
        const backendError = allData?.error || todayData?.error;
        const fallback = (!allParsed.ok || !todayParsed.ok)
          ? 'Reminder service is unavailable right now. Please try again in a moment.'
          : 'Failed to load reminders.';
        setError(backendError || fallback);
      }
    } catch (error) {
      console.error('Failed to load reminders:', error);
      setReminders([]);
      setTodaysReminders([]);
      setError('Unable to load reminders. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resolvedPatientId) {
      setError('Patient profile not available. Please sign in again.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      const normalizedMedicine = formData.medicine_name.trim();
      const normalizedDosage = formData.dosage.trim();
      const normalizedInstructions = formData.instructions.trim();

      if (!normalizedMedicine || !normalizedDosage || !formData.time) {
        setError('Medicine name, dosage, and time are required.');
        return;
      }

      if (formData.frequency === 'weekly' && formData.days_of_week.length === 0) {
        setError('Select at least one day for weekly reminders.');
        return;
      }

      const payload = {
        medicine_name: normalizedMedicine,
        dosage: normalizedDosage,
        time: formData.time,
        frequency: formData.frequency,
        start_date: formData.start_date,
        end_date: formData.end_date,
        instructions: normalizedInstructions,
        days_of_week: formData.days_of_week,
        patient_id: resolvedPatientId,
      };

      console.log('Reminder create payload:', payload);

      const response = await fetch(`${API_BASE}/reminders`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify(payload)
      });

      const parsed = await parseJsonSafe(response);
      const data = parsed.data;

      if (parsed.ok && data?.success) {
        setFormData({
          medicine_name: '',
          dosage: '',
          time: '',
          frequency: 'daily',
          days_of_week: [],
          instructions: '',
          start_date: todayIso,
          end_date: ''
        });
        setShowForm(false);
        setSuccess('Reminder created successfully');
        await loadReminders();
      } else {
        setError(data?.error || `Failed to create reminder (HTTP ${parsed.status}).`);
      }
    } catch (error) {
      console.error('Failed to create reminder:', error);
      setError('Unable to create reminder. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const markAsTaken = async (reminderId) => {
    try {
      setError('');
      setSuccess('');
      const response = await fetch(`${API_BASE}/reminders/${reminderId}/mark-taken`, {
        method: 'POST',
        headers: getHeaders(false)
      });

      const parsed = await parseJsonSafe(response);
      const data = parsed.data;

      if (parsed.ok && data?.success) {
        setSuccess('Reminder marked as taken.');
        await loadReminders();
      } else {
        setError(data?.error || 'Failed to mark reminder as taken.');
      }
    } catch (error) {
      console.error('Failed to mark reminder as taken:', error);
      setError('Unable to update reminder. Please try again.');
    }
  };

  const deleteReminder = async (reminderId) => {
    if (!window.confirm('Delete this reminder?')) return;

    try {
      setError('');
      setSuccess('');
      const response = await fetch(`${API_BASE}/reminders/${reminderId}`, {
        method: 'DELETE',
        headers: getHeaders(false)
      });

      const parsed = await parseJsonSafe(response);
      const data = parsed.data;

      if (parsed.ok && data?.success) {
        setSuccess('Reminder deleted successfully.');
        await loadReminders();
      } else {
        setError(data?.error || 'Failed to delete reminder.');
      }
    } catch (error) {
      console.error('Failed to delete reminder:', error);
      setError('Unable to delete reminder. Please try again.');
    }
  };

  const takenTodayCount = todaysReminders.filter((r) =>
    r.taken_dates?.includes(todayIso)
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-medical-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showToast && (
        <div className="fixed top-5 right-5 z-40 rounded-xl border border-green-200 bg-green-50 text-green-800 px-4 py-3 shadow-lg text-sm font-semibold">
          Reminder created successfully
        </div>
      )}

      <div className="rounded-3xl border border-sky-100 bg-gradient-to-r from-sky-50 via-white to-cyan-50 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Medicine Reminders</h2>
            <p className="text-xs text-slate-600 mt-1">Plan doses, track daily intake, and manage your reminder history from one place.</p>
          </div>
          <div className="inline-flex rounded-2xl bg-white p-1.5 border border-sky-100 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode('today')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition ${viewMode === 'today' ? 'bg-sky-600 text-white shadow' : 'text-sky-700 hover:bg-sky-100'}`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition ${viewMode === 'all' ? 'bg-sky-600 text-white shadow' : 'text-sky-700 hover:bg-sky-100'}`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(true);
                setViewMode('form');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition ${viewMode === 'form' ? 'bg-sky-600 text-white shadow' : 'text-sky-700 hover:bg-sky-100'}`}
            >
              Add
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-4">
          <p className="text-xs text-gray-500">Total Reminders</p>
          <p className="text-2xl font-bold text-sky-700 mt-1">{reminders.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-4">
          <p className="text-xs text-gray-500">Scheduled Today</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{todaysReminders.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-4">
          <p className="text-xs text-gray-500">Taken Today</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{takenTodayCount}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 text-green-700 px-4 py-3 text-sm">
          {success}
        </div>
      )}

      {/* Today's Reminders */}
      {(viewMode === 'today' || viewMode === 'form') && (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span>⏰</span> Today's Medicine Schedule
          </h3>
          <span className="px-3 py-1 bg-medical-100 text-medical-700 rounded-full text-xs font-semibold">
            {todaysReminders.length} reminder(s)
          </span>
        </div>

        {todaysReminders.length > 0 ? (
          <div className="space-y-3">
            {todaysReminders.map((reminder) => {
              const isTakenToday = reminder.taken_dates?.includes(new Date().toISOString().split('T')[0]);
              return (
                <div key={reminder.id} className={`p-4 rounded-xl border-2 flex items-center justify-between ${
                  isTakenToday ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'
                }`}>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{reminder.medicine_name}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      <span>💊 {reminder.dosage}</span>
                      <span className="mx-2">•</span>
                      <span>🕐 {reminder.time}</span>
                    </div>
                    {reminder.instructions && (
                      <div className="text-xs text-gray-500 mt-2">ℹ️ {reminder.instructions}</div>
                    )}
                  </div>
                  {!isTakenToday ? (
                    <button
                      onClick={() => markAsTaken(reminder.id)}
                      className="ml-4 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600"
                    >
                      ✓ Mark Taken
                    </button>
                  ) : (
                    <div className="ml-4 px-4 py-2 bg-green-200 text-green-700 rounded-lg text-sm font-semibold">
                      ✓ Taken
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-6">No reminders for today</p>
        )}
      </div>
      )}

      {/* Add New Reminder */}
      <button
        onClick={() => {
          setShowForm(!showForm);
          setViewMode('form');
        }}
        className="w-full px-4 py-3 bg-gradient-to-r from-sky-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-sky-700 hover:to-cyan-700 transition-colors shadow-sm"
      >
        {showForm ? '✕ Cancel' : '+ Add New Reminder'}
      </button>

      {showForm && (
        <div className="max-w-[700px] mx-auto bg-white shadow-lg rounded-2xl p-6 border border-gray-100">
          <div className="mb-5">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <span>💊</span>
              <span>Medicine Reminder</span>
            </h3>
            <p className="text-sm text-gray-500 mt-1">Set your daily medication schedule</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Medicine Name *</label>
                <input
                  type="text"
                  value={formData.medicine_name}
                  onChange={(e) => setFormData({ ...formData, medicine_name: e.target.value })}
                  placeholder="e.g., Aspirin"
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Dosage *</label>
                <input
                  type="text"
                  value={formData.dosage}
                  onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                  placeholder="e.g., 5mg"
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Time *</label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Frequency</label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              {formData.frequency === 'weekly' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Days of Week</label>
                  <div className="flex flex-wrap gap-2">
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                      const selected = formData.days_of_week.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            const next = selected
                              ? formData.days_of_week.filter((d) => d !== day)
                              : [...formData.days_of_week, day];
                            setFormData({ ...formData, days_of_week: next });
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400'}`}
                        >
                          {day.slice(0, 3).toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date (Optional)</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Instructions</label>
              <textarea
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                placeholder="e.g., Take with food"
                rows="2"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-xl font-semibold hover:from-green-600 hover:to-teal-600 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {submitting && <span className="inline-block h-4 w-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin"></span>}
              {submitting ? 'Creating Reminder...' : 'Create Reminder'}
            </button>
          </form>
        </div>
      )}

      {/* All Reminders List */}
      {(viewMode === 'all' || viewMode === 'form') && (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">All Medicine Reminders</h3>
        {reminders.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {reminders.map((reminder) => (
              <div key={reminder.id} className="py-4 flex items-start justify-between">
                <div>
                  <div className="font-semibold text-gray-900">{reminder.medicine_name}</div>
                  <div className="text-sm text-gray-600 mt-1.5">
                    <div>💊 {reminder.dosage} - {reminder.frequency}</div>
                    <div>🕐 {reminder.time}</div>
                    <div>📅 {reminder.start_date} {reminder.end_date ? `to ${reminder.end_date}` : '(Ongoing)'}</div>
                  </div>
                  <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-semibold ${
                    reminder.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {reminder.status}
                  </span>
                </div>
                <button
                  onClick={() => deleteReminder(reminder.id)}
                  className="text-red-600 hover:text-red-700 px-3 py-1"
                >
                  🗑️ Delete
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">No reminders yet. Create one to get started!</p>
        )}
      </div>
      )}
    </div>
  );
};

export default MedicineReminder;
