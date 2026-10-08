import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import {
  getGlucoTwinLive,
  getGlucoTwinMetadata,
  getGlucoTwinPatients,
  resetGlucoTwin,
} from '../services/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const POLL_INTERVAL = 4000;

const formatMetric = (value, suffix = '') =>
  value === null || value === undefined ? '--' : `${value}${suffix}`;

const formatTimestamp = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const riskBar = (value) => Math.max(8, Math.min(100, Math.round(value || 0)));

const getStatusFromRisk = (riskProbability, slope, variability) => {
  if (riskProbability >= 0.75 || Math.abs(slope) >= 18 || variability >= 18) return 'High Risk';
  if (riskProbability >= 0.40 || Math.abs(slope) >= 8 || variability >= 10) return 'Changing';
  return 'Stable';
};

const summarizeWindow = (windowValues) => {
  if (!windowValues || windowValues.length < 2) {
    return { delta: 0, slope: 0, variability: 0 };
  }

  const delta = windowValues[windowValues.length - 1] - windowValues[0];
  const slope = (delta / (windowValues.length - 1)) * 5;
  const mean = windowValues.reduce((sum, value) => sum + value, 0) / windowValues.length;
  const variance = windowValues.reduce((sum, value) => sum + (value - mean) ** 2, 0) / windowValues.length;

  return {
    delta,
    slope,
    variability: Math.sqrt(variance),
  };
};

const GlucoTwin = ({ user }) => {
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [observation, setObservation] = useState(null);
  const [history, setHistory] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const intervalRef = useRef(null);

  const stopSimulation = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRunning(false);
  }, []);

  const fetchObservation = useCallback(async (selectedPatientId) => {
    try {
      const response = await getGlucoTwinLive(selectedPatientId);
      if (!response.data?.success || !response.data?.data) throw new Error('Invalid response');
      const next = response.data.data;
      setObservation(next);
      setHistory((current) => [
        ...current.slice(-29),
        {
          timestamp: next.timestamp,
          glucose: next.sensor.glucose_mg_dl,
          heartRate: next.sensor.heart_rate_bpm,
          ibi: next.sensor.ibi_ms,
        },
      ]);
      setError('');
    } catch (error) {
      stopSimulation();
      setError(error.response?.data?.error || 'Unable to retrieve Digital Twin data.');
    }
  }, [stopSimulation]);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        const [patientResult, metadataResult] = await Promise.allSettled([
          getGlucoTwinPatients(),
          getGlucoTwinMetadata(),
        ]);
        if (!active) return;
        if (patientResult.status === 'rejected') {
          throw patientResult.reason;
        }
        const patientResponse = patientResult.value;
        const available = Array.isArray(patientResponse.data?.patients)
          ? patientResponse.data.patients
          : [];
        setPatients(available);
        setMetadata(
          metadataResult.status === 'fulfilled'
            ? metadataResult.value.data?.data || null
            : null
        );
        if (available.length) {
          const matchingPatient = available.find(
            (patient) => String(patient.patient_id) === String(user?.id)
          );
          const selectedId = String((matchingPatient || available[available.length - 1]).patient_id);
          setPatientId(selectedId);
          await resetGlucoTwin(selectedId);
          await fetchObservation(selectedId);
          if (!active) return;
          intervalRef.current = setInterval(() => fetchObservation(selectedId), POLL_INTERVAL);
          setRunning(true);
        } else {
          setError('No Digital Twin patients are available.');
        }
      } catch (error) {
        if (active) {
          setError(error.response?.data?.error || 'Unable to retrieve Digital Twin data.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    loadData();
    return () => {
      active = false;
      stopSimulation();
    };
  }, [stopSimulation]);

  useEffect(() => () => stopSimulation(), [stopSimulation]);

  const changePatient = async (event) => {
    stopSimulation();
    const selected = event.target.value;
    setPatientId(selected);
    setObservation(null);
    setHistory([]);
    setError('');
    if (selected) {
      try {
        await resetGlucoTwin(selected);
      } catch {
        setError('Unable to reset the selected Digital Twin stream.');
      }
    }
  };

  const startSimulation = async () => {
    if (!patientId) return;
    stopSimulation();
    await fetchObservation(patientId);
    intervalRef.current = setInterval(() => fetchObservation(patientId), POLL_INTERVAL);
    setRunning(true);
  };

  const resetSimulation = async () => {
    if (!patientId) return;
    stopSimulation();
    try {
      await resetGlucoTwin(patientId);
      setObservation(null);
      setHistory([]);
      setError('');
    } catch {
      setError('Unable to reset the Digital Twin stream.');
    }
  };

  const selectedPatient = patients.find((patient) => String(patient.patient_id) === patientId);
  const metrics = metadata?.metrics || {};
  const prediction = observation?.prediction;

  const summarizeWindow = useCallback((windowValues) => {
    if (!Array.isArray(windowValues) || windowValues.length < 2) {
      return { change: 0, slope: 0, variability: 0 };
    }

    const first = windowValues[0];
    const last = windowValues[windowValues.length - 1];
    const change = last - first;
    const slope = (change / (windowValues.length - 1)) * 5;
    const mean = windowValues.reduce((sum, value) => sum + value, 0) / windowValues.length;
    const variance = windowValues.reduce((sum, value) => sum + (value - mean) ** 2, 0) / windowValues.length;

    return {
      change,
      slope,
      variability: Math.sqrt(variance),
    };
  }, []);

  const recentTrends = useMemo(() => {
    const glucoseSeries = history.map((item) => item.glucose).filter((value) => value !== undefined && value !== null);
    const windows = {
      '15m': glucoseSeries.slice(-3),
      '30m': glucoseSeries.slice(-6),
      '60m': glucoseSeries.slice(-12),
    };

    return Object.fromEntries(
      Object.entries(windows).map(([key, values]) => [key, summarizeWindow(values)])
    );
  }, [history, summarizeWindow]);

  const latestGlucose = history[history.length - 1]?.glucose;
  const previousGlucose = history[history.length - 2]?.glucose;
  const glucoseChange = latestGlucose !== undefined && previousGlucose !== undefined
    ? latestGlucose - previousGlucose
    : 0;
  const variability = history.length > 1
    ? Math.sqrt(history.reduce((sum, item) => sum + ((item.glucose - latestGlucose) ** 2), 0) / history.length)
    : 0;

  const twinStatus = useMemo(() => {
    const probability = Number(prediction?.risk_probability || 0);
    const slope = recentTrends['60m']?.slope || 0;
    const variance = recentTrends['60m']?.variability || 0;
    if (probability >= 0.75 || Math.abs(slope) >= 18 || variance >= 18) return 'High Risk';
    if (probability >= 0.40 || Math.abs(slope) >= 8 || variance >= 10) return 'Changing';
    return 'Stable';
  }, [prediction?.risk_probability, recentTrends]);

  const explainers = useMemo(() => [
    ['Glucose slope 60m', riskBar(Math.abs(recentTrends['60m']?.slope || 0) * 4)],
    ['Glucose change 60m', riskBar(Math.abs(recentTrends['60m']?.change || 0) * 2.5)],
    ['Glucose variability', riskBar((recentTrends['60m']?.variability || 0) * 5)],
    ['Current risk probability', riskBar((prediction?.risk_probability || 0) * 100)],
  ], [prediction?.risk_probability, recentTrends]);

  const chartData = {
    labels: history.map((item) => formatTimestamp(item.timestamp)),
    datasets: [{
      label: 'Glucose (mg/dL)',
      data: history.map((item) => item.glucose),
      borderColor: '#0f9fbd',
      backgroundColor: 'rgba(15, 159, 189, 0.13)',
      tension: 0.35,
      fill: true,
      pointRadius: 2,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#78909c' } },
      y: { grid: { color: '#e7f0f2' }, ticks: { color: '#78909c' } },
    },
  };

  if (loading) return <div className="mx-auto max-w-7xl px-4 py-12 text-center text-gray-600">Loading GlucoTwin...</div>;

  return (
    <div className="clay-theme page-3d-enter min-h-screen bg-[#f4f9fa] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-t-2xl bg-gradient-to-r from-[#063b55] via-[#08738a] to-[#13a9a0] px-5 py-5 text-white shadow-sm sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xl font-bold tracking-tight">GlucoTwin</p>
              <p className="mt-1 text-sm text-cyan-50">AI-Powered Glucose Digital Twin</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              System Connected
            </span>
          </div>
        </header>

        <main className="space-y-5 rounded-b-2xl bg-[#f8fcfc] p-4 shadow-sm sm:p-6">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <section className="flex flex-col gap-4 rounded-xl border border-[#d9eaed] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
              Patient:
              <select value={patientId} onChange={changePatient} className="rounded-lg border border-[#c5dfe3] bg-white px-3 py-2 font-medium text-slate-700">
                {patients.map((patient) => <option key={patient.patient_id} value={patient.patient_id}>Patient {patient.patient_id}</option>)}
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={startSimulation} disabled={running || !patientId} className="rounded-lg bg-[#0b98ad] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#087d92] disabled:opacity-50">Start Simulation</button>
              <button type="button" onClick={stopSimulation} disabled={!running} className="rounded-lg border border-[#b9d6db] bg-white px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50">Pause</button>
              <button type="button" onClick={resetSimulation} disabled={!patientId} className="rounded-lg border border-[#b9d6db] bg-white px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50">Reset</button>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['GLUCOSE', formatMetric(observation?.sensor?.glucose_mg_dl, ' mg/dL')],
              ['HEART RATE', formatMetric(observation?.sensor?.heart_rate_bpm, ' BPM')],
              ['IBI / HRV', formatMetric(observation?.sensor?.ibi_ms, ' ms')],
              ['TIMESTAMP', formatTimestamp(observation?.timestamp)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-[#d9eaed] bg-white p-4 shadow-sm">
                <p className="text-xs font-bold tracking-wider text-[#62818a]">{label}</p>
                <p className="mt-2 text-2xl font-bold text-slate-800">{value}</p>
                <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600"><span className={`h-2 w-2 rounded-full ${running ? 'bg-emerald-500' : 'bg-slate-300'}`} />{running ? 'LIVE' : 'PAUSED'}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-xl border border-[#d9eaed] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold tracking-widest text-[#3e6972]">CURRENT STATE</h2>
                <span className="rounded-full bg-[#ecfbf8] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#0a766f]">Historical + live dynamic physiology</span>
              </div>
              <div className="h-64">{history.length ? <Line data={chartData} options={chartOptions} /> : <div className="flex h-full items-center justify-center text-sm text-slate-400">Start the simulation to view glucose observations.</div>}</div>
            </div>
            <div className="rounded-xl border border-[#d9eaed] bg-white p-5 text-center shadow-sm">
              <h2 className="text-sm font-bold tracking-widest text-[#3e6972]">FUTURE 2-HOUR RISK</h2>
              <p className="mt-7 text-5xl font-bold text-[#087f9a]">{formatMetric(prediction?.risk_percent, '%')}</p>
              <p className={`mt-2 text-lg font-bold ${prediction?.risk_level === 'HIGH' ? 'text-red-500' : prediction?.risk_level === 'MEDIUM' ? 'text-amber-500' : 'text-emerald-600'}`}>{prediction?.risk_level || '--'}</p>
              <p className="mt-2 text-sm text-slate-500">Prediction horizon: {prediction?.prediction_window || 'Next 2 hours'}</p>
              <div className="mt-4 rounded-lg bg-[#f5fafb] p-3 text-left">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.12em] text-[#62818a]">
                  <span>Digital Twin Status</span>
                  <span className="font-bold text-slate-700">{twinStatus}</span>
                </div>
                <div className="mt-2 text-xs text-slate-600">Historical state loaded · Live simulated data updating · Temporal features calculated · AI prediction active</div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-[#d9eaed] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-sm font-bold tracking-widest text-[#3e6972]">DIGITAL TWIN STATUS</h2>
                <p className="mt-1 text-xs text-slate-500">Predictive Digital Twin using historical + simulated dynamic physiological data.</p>
              </div>
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${twinStatus === 'High Risk' ? 'bg-red-100 text-red-700' : twinStatus === 'Changing' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {twinStatus}
              </span>
            </div>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div><h3 className="border-b border-[#d9eaed] pb-2 text-sm font-bold text-slate-600">Historical State</h3><dl className="mt-3 space-y-2 text-sm"><div className="flex justify-between"><dt className="text-slate-500">Historical profile</dt><dd className="font-semibold text-slate-700">{observation?.historical?.sex ?? selectedPatient?.sex ?? '--'} / {formatMetric(observation?.historical?.hba1c ?? selectedPatient?.hba1c, '')}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Patient history</dt><dd className="font-semibold text-slate-700">{selectedPatient ? `${selectedPatient.observations} observations` : '--'}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Trend window</dt><dd className="font-semibold text-slate-700">15 / 30 / 60 min</dd></div></dl></div>
              <div><h3 className="border-b border-[#d9eaed] pb-2 text-sm font-bold text-slate-600">Current State</h3><dl className="mt-3 space-y-2 text-sm"><div className="flex justify-between"><dt className="text-slate-500">Current glucose</dt><dd className="font-semibold text-slate-700">{formatMetric(observation?.sensor?.glucose_mg_dl, ' mg/dL')}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Current HR</dt><dd className="font-semibold text-slate-700">{formatMetric(observation?.sensor?.heart_rate_bpm, ' BPM')}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Current IBI</dt><dd className="font-semibold text-slate-700">{formatMetric(observation?.sensor?.ibi_ms, ' ms')}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Live update</dt><dd className="font-semibold text-slate-700">{running ? 'Updating' : 'Paused'} · {formatTimestamp(observation?.timestamp)}</dd></div></dl></div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-lg bg-[#f6fbfc] p-3"><div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#62818a]">Recent 15 min</div><div className="mt-2 text-sm font-semibold text-slate-700">Δ {recentTrends['15m']?.change?.toFixed(1) || '0.0'} mg/dL</div><div className="text-xs text-slate-500">Slope {recentTrends['15m']?.slope?.toFixed(1) || '0.0'} mg/dL per 5m</div></div>
              <div className="rounded-lg bg-[#f6fbfc] p-3"><div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#62818a]">Recent 30 min</div><div className="mt-2 text-sm font-semibold text-slate-700">Δ {recentTrends['30m']?.change?.toFixed(1) || '0.0'} mg/dL</div><div className="text-xs text-slate-500">Variability {recentTrends['30m']?.variability?.toFixed(1) || '0.0'} mg/dL</div></div>
              <div className="rounded-lg bg-[#f6fbfc] p-3"><div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#62818a]">Recent 60 min</div><div className="mt-2 text-sm font-semibold text-slate-700">Δ {recentTrends['60m']?.change?.toFixed(1) || '0.0'} mg/dL</div><div className="text-xs text-slate-500">Risk trend {prediction?.risk_level || 'LOW'}</div></div>
            </div>
          </section>

          <section className="rounded-xl border border-[#d9eaed] bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold tracking-widest text-[#3e6972]">WHY IS RISK CHANGING?</h2>
            <p className="mt-2 text-sm text-slate-500">The Digital Twin updates risk using the model's real calculated temporal features: glucose slope, glucose change, and glucose variability.</p>
            <div className="mt-4 space-y-3">{explainers.map(([label, value]) => <div key={label} className="grid grid-cols-[180px_1fr] items-center gap-3 text-xs text-slate-600"><span>{label}</span><div className="h-2.5 overflow-hidden rounded-full bg-[#e5f1f2]"><div className="h-full rounded-full bg-gradient-to-r from-[#42c8bc] to-[#087f9a] transition-all duration-500" style={{ width: `${value}%` }} /></div><span className="text-[11px] font-bold text-slate-700">{value}%</span></div>)}</div>
          </section>

          <section className="rounded-xl border border-[#d9eaed] bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold tracking-widest text-[#3e6972]">MODEL PERFORMANCE</h2>
            <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-600">{[['Accuracy', metrics.accuracy], ['Recall', metrics.recall], ['F1', metrics.f1], ['PR-AUC', metrics.pr_auc], ['ROC-AUC', metrics.roc_auc]].map(([label, value]) => <span key={label}><strong className="text-slate-800">{value === undefined ? '--' : `${(value * 100).toFixed(2)}%`}</strong> {label}</span>)}</div>
          </section>

          <p className="text-center text-xs text-slate-500">Research prototype - Not medical diagnosis. Clinician review required.</p>
        </main>
      </div>
    </div>
  );
};

export default GlucoTwin;
