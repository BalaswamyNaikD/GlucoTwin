import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { API_BASE } from '../config/apiConfig';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const HealthTimeline = ({ patientId }) => {
  const [timeline, setTimeline] = useState(null);
  const [activeView, setActiveView] = useState('vitals');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimeline();
  }, [patientId]);

  const loadTimeline = async () => {
    setLoading(true);
    try {
      const id = patientId || 'P-1000';
      const res = await fetch(`${API_BASE}/timeline/${id}`);
      const data = await res.json();
      setTimeline(data.timeline);
    } catch {
      // Demo data
      setTimeline(generateDemoTimeline());
    }
    setLoading(false);
  };

  const generateDemoTimeline = () => {
    const now = new Date();
    return {
      vitals_history: Array.from({ length: 14 }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (13 - i));
        return {
          date: d.toISOString().split('T')[0],
          label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          heart_rate: 68 + Math.floor(Math.random() * 25),
          systolic_bp: 115 + Math.floor(Math.random() * 35),
          spo2: 94 + Math.floor(Math.random() * 6),
          temperature: +(97.5 + Math.random() * 3).toFixed(1),
          steps: 2000 + Math.floor(Math.random() * 10000),
        };
      }),
      pain_history: [
        { date: '2026-03-09', pain_score: 3, pain_label: 'Moderate', confidence: 78 },
        { date: '2026-03-06', pain_score: 5, pain_label: 'Moderate', confidence: 82 },
        { date: '2026-03-03', pain_score: 2, pain_label: 'Mild', confidence: 71 },
        { date: '2026-02-28', pain_score: 7, pain_label: 'Severe', confidence: 88 },
      ],
      voice_history: [
        { date: '2026-03-08', condition: 'healthy', condition_name: 'Healthy', confidence: 85 },
        { date: '2026-03-03', condition: 'respiratory', condition_name: 'Respiratory Disorder', confidence: 62 },
        { date: '2026-02-26', condition: 'healthy', condition_name: 'Healthy', confidence: 91 },
      ],
      ai_predictions: [
        { date: '2026-03-10', health_score: 78, status: 'Fair', confidence: 82, modules_used: 4 },
        { date: '2026-03-08', health_score: 85, status: 'Good', confidence: 79, modules_used: 3 },
        { date: '2026-03-06', health_score: 62, status: 'Concerning', confidence: 87, modules_used: 5 },
        { date: '2026-03-04', health_score: 72, status: 'Fair', confidence: 75, modules_used: 4 },
      ],
      prescriptions: [
        { date: '2026-03-08', doctor: 'Dr. Sarah Johnson', type: 'prescription', title: 'Medication Update', details: 'Amlodipine 5mg - Once daily', notes: 'Monitor BP weekly.' },
        { date: '2026-03-01', doctor: 'Dr. Michael Chen', type: 'diagnosis', title: 'Follow-up', details: 'BP stable. Continue medication.', notes: 'Exercise recommended.' },
      ],
    };
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading health timeline...</div>;
  }

  if (!timeline) return null;

  const vitals = timeline.vitals_history || [];

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top', labels: { font: { size: 11 } } } },
    scales: {
      y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } },
      x: { grid: { display: false }, ticks: { font: { size: 10 }, maxTicksLimit: 10 } },
    },
  };

  const heartRateChart = {
    labels: vitals.map(v => v.label),
    datasets: [{
      label: 'Heart Rate (BPM)',
      data: vitals.map(v => v.heart_rate),
      borderColor: '#EF4444',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      fill: true,
      tension: 0.4,
    }],
  };

  const bpChart = {
    labels: vitals.map(v => v.label),
    datasets: [{
      label: 'Systolic BP',
      data: vitals.map(v => v.systolic_bp),
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4,
    }],
  };

  const tempChart = {
    labels: vitals.map(v => v.label),
    datasets: [{
      label: 'Temperature (°F)',
      data: vitals.map(v => v.temperature),
      borderColor: '#F59E0B',
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      fill: true,
      tension: 0.4,
    }],
  };

  const spo2Chart = {
    labels: vitals.map(v => v.label),
    datasets: [{
      label: 'SpO2 (%)',
      data: vitals.map(v => v.spo2),
      borderColor: '#10B981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      fill: true,
      tension: 0.4,
    }],
  };

  const views = [
    { id: 'vitals', label: 'Vital Signs', icon: '💓' },
    { id: 'ai', label: 'AI Predictions', icon: '🤖' },
    { id: 'prescriptions', label: 'Prescriptions', icon: '💊' },
  ];

  const statusColor = (status) => {
    if (status === 'Good') return 'text-green-600 bg-green-100';
    if (status === 'Fair') return 'text-yellow-600 bg-yellow-100';
    if (status === 'Concerning') return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Health Timeline</h3>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {views.map(v => (
          <button
            key={v.id}
            onClick={() => setActiveView(v.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeView === v.id
                ? 'bg-blue-600 text-white shadow'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>{v.icon}</span> {v.label}
          </button>
        ))}
      </div>

      {/* Vitals Charts */}
      {activeView === 'vitals' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Heart Rate Trend</h4>
            <div className="h-48"><Line data={heartRateChart} options={chartOptions} /></div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Blood Pressure Trend</h4>
            <div className="h-48"><Line data={bpChart} options={chartOptions} /></div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Temperature Trend</h4>
            <div className="h-48"><Line data={tempChart} options={chartOptions} /></div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Oxygen Saturation Trend</h4>
            <div className="h-48"><Line data={spo2Chart} options={chartOptions} /></div>
          </div>
        </div>
      )}

      {/* Pain History */}
      {activeView === 'pain' && (
        <div className="space-y-3">
          {(timeline.pain_history || []).map((p, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                p.pain_score >= 7 ? 'bg-red-500' : p.pain_score >= 4 ? 'bg-yellow-500' : 'bg-green-500'
              }`}>
                {p.pain_score}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{p.pain_label} Pain</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Confidence: {p.confidence}%</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{p.date} {p.regions ? `- ${p.regions}` : ''}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-gray-700">{p.pain_score}/10</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Voice Analysis History */}
      {activeView === 'voice' && (
        <div className="space-y-3">
          {(timeline.voice_history || []).map((v, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
              <span className="text-2xl">{v.condition === 'healthy' ? '✅' : '⚠️'}</span>
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-900">{v.condition_name}</div>
                <div className="text-xs text-gray-500 mt-0.5">{v.date}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-gray-700">Confidence: {v.confidence}%</div>
                <div className={`text-xs mt-0.5 capitalize ${
                  v.risk_level === 'high' ? 'text-red-600' : v.risk_level === 'medium' ? 'text-yellow-600' : 'text-green-600'
                }`}>{v.risk_level} risk</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Predictions */}
      {activeView === 'ai' && (
        <div className="space-y-3">
          {(timeline.ai_predictions || []).map((pred, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1 rounded-lg text-sm font-bold ${statusColor(pred.status)}`}>
                    {pred.health_score}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{pred.status}</div>
                    <div className="text-xs text-gray-500">{pred.date} - {pred.modules_used} modules analyzed</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">Confidence</div>
                  <div className="text-sm font-bold text-gray-700">{pred.confidence}%</div>
                </div>
              </div>
              {/* Score bar */}
              <div className="mt-3 bg-gray-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    pred.health_score >= 80 ? 'bg-green-500' :
                    pred.health_score >= 60 ? 'bg-yellow-500' :
                    pred.health_score >= 40 ? 'bg-orange-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${pred.health_score}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Prescriptions */}
      {activeView === 'prescriptions' && (
        <div className="space-y-3">
          {(timeline.prescriptions || []).map((rx, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-start gap-3">
                <span className="text-lg mt-0.5">{rx.type === 'prescription' ? '💊' : rx.type === 'lab_result' ? '🔬' : '📋'}</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900">{rx.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{rx.doctor} - {rx.date}</div>
                  <div className="text-sm text-gray-700 mt-2">{rx.details}</div>
                  {rx.notes && <div className="text-xs text-gray-500 mt-1 italic">Note: {rx.notes}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HealthTimeline;
