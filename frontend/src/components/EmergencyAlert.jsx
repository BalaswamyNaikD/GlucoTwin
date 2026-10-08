import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../config/apiConfig';

const EmergencyAlert = ({ userRole }) => {
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEscalations = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/emergency/escalations`);
      const data = await res.json();
      setEscalations(data.escalations || []);
    } catch {
      setEscalations([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEscalations();
    const interval = setInterval(fetchEscalations, 10000);
    return () => clearInterval(interval);
  }, [fetchEscalations]);

  const handleAcknowledge = async (id) => {
    try {
      await fetch(`${API_BASE}/emergency/escalations/${encodeURIComponent(id)}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctor_id: '1', doctor_name: 'Dr. Sarah Johnson' }),
      });
      fetchEscalations();
    } catch {}
  };

  const handleResolve = async (id) => {
    try {
      await fetch(`${API_BASE}/emergency/escalations/${encodeURIComponent(id)}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctor_id: '1', resolution_notes: 'Reviewed and resolved' }),
      });
      fetchEscalations();
    } catch {}
  };

  const levelColors = {
    1: { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-800', badge: 'bg-yellow-200 text-yellow-800', icon: '⚠️', label: 'Warning' },
    2: { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-800', badge: 'bg-orange-200 text-orange-800', icon: '🔶', label: 'Alert' },
    3: { bg: 'bg-red-50', border: 'border-red-400', text: 'text-red-800', badge: 'bg-red-200 text-red-800', icon: '🚨', label: 'Emergency' },
  };

  const activeEscalations = escalations.filter(e => e.status !== 'resolved');
  const resolvedEscalations = escalations.filter(e => e.status === 'resolved');

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-gray-200 rounded w-1/3"></div>
          <div className="h-20 bg-gray-100 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active Emergencies */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🚨</span>
          <h3 className="text-lg font-semibold text-gray-900">Emergency Alerts</h3>
          {activeEscalations.length > 0 && (
            <span className="ml-auto bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full">
              {activeEscalations.length} Active
            </span>
          )}
        </div>

        {activeEscalations.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <span className="text-3xl block mb-2">✅</span>
            <p className="text-sm">No active emergencies</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeEscalations.map((esc) => {
              const style = levelColors[esc.level] || levelColors[1];
              return (
                <div key={esc.id} className={`${style.bg} ${style.border} border rounded-xl p-4`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{style.icon}</span>
                      <div>
                        <span className={`${style.badge} text-xs font-bold px-2 py-0.5 rounded-full`}>
                          Level {esc.level} - {style.label}
                        </span>
                        <p className={`text-sm font-medium ${style.text} mt-1`}>
                          Patient: {esc.patient_id}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(esc.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <p className={`text-sm ${style.text} mb-2`}>{esc.reason}</p>

                  {esc.triggers && esc.triggers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {esc.triggers.map((t, i) => (
                        <span key={i} className="bg-white/60 text-xs px-2 py-0.5 rounded-full border">
                          {t.vital}: {t.value} ({t.severity})
                        </span>
                      ))}
                    </div>
                  )}

                  {userRole === 'doctor' && (
                    <div className="flex gap-2 mt-2">
                      {esc.status === 'active' && (
                        <button
                          onClick={() => handleAcknowledge(esc.id)}
                          className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Acknowledge
                        </button>
                      )}
                      <button
                        onClick={() => handleResolve(esc.id)}
                        className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Resolve
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resolved History */}
      {resolvedEscalations.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Recently Resolved</h4>
          <div className="space-y-2">
            {resolvedEscalations.slice(0, 5).map((esc) => (
              <div key={esc.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div>
                  <p className="text-sm text-gray-700">Patient: {esc.patient_id}</p>
                  <p className="text-xs text-gray-500">{esc.reason}</p>
                </div>
                <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">Resolved</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmergencyAlert;
