import React from 'react';

const AlertPanel = ({ alerts }) => {
  const defaultAlerts = alerts || [
    { id: 1, level: 'critical', module: 'Smart Diagnosis', patient: 'John Doe', message: 'High-risk signal detected', time: '5 min ago', acknowledged: false },
    { id: 2, level: 'warning', module: 'Symptom Monitor', patient: 'Jane Smith', message: 'Symptom risk indicators detected', time: '18 min ago', acknowledged: false },
    { id: 3, level: 'info', module: 'Smartwatch', patient: 'Emily Davis', message: 'All vitals within normal range', time: '1 hr ago', acknowledged: true },
  ];

  const levelStyles = {
    critical: { bg: 'bg-red-50', border: 'border-red-200', icon: '🚨', textColor: 'text-red-700', badge: 'bg-red-100 text-red-700' },
    warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: '⚠️', textColor: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700' },
    info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'ℹ️', textColor: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' },
    normal: { bg: 'bg-green-50', border: 'border-green-200', icon: '✅', textColor: 'text-green-700', badge: 'bg-green-100 text-green-700' },
  };

  return (
    <div className="space-y-3">
      {defaultAlerts.map((alert) => {
        const style = levelStyles[alert.level] || levelStyles.info;
        return (
          <div
            key={alert.id}
            className={`${style.bg} border ${style.border} rounded-xl p-4 flex items-start gap-3 transition-all hover:shadow-sm ${
              !alert.acknowledged ? 'ring-1 ring-offset-1' : 'opacity-75'
            }`}
            style={{ ringColor: alert.level === 'critical' ? '#EF4444' : 'transparent' }}
          >
            <span className="text-xl flex-shrink-0">{style.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>
                  {alert.level.toUpperCase()}
                </span>
                <span className="text-xs text-gray-500">{alert.module}</span>
              </div>
              <p className={`text-sm font-medium ${style.textColor}`}>{alert.message}</p>
              <div className="flex items-center gap-3 mt-1.5">
                {alert.patient && (
                  <span className="text-xs text-gray-500">Patient: {alert.patient}</span>
                )}
                <span className="text-xs text-gray-400">{alert.time}</span>
              </div>
            </div>
            {!alert.acknowledged && (
              <button className="px-3 py-1 text-xs font-medium text-gray-600 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors flex-shrink-0">
                Acknowledge
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AlertPanel;
