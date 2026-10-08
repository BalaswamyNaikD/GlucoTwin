import React from 'react';

const HealthMetrics = ({ metrics }) => {
  const defaultMetrics = metrics || {
    heart_rate: 72,
    blood_pressure: '120/80',
    spo2: 98,
    temperature: 98.6,
    respiration_rate: 16,
    blood_glucose: 95,
  };

  const cards = [
    {
      label: 'Heart Rate',
      value: `${defaultMetrics.heart_rate}`,
      unit: 'BPM',
      icon: '❤️',
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      status: defaultMetrics.heart_rate > 100 || defaultMetrics.heart_rate < 60 ? 'warning' : 'normal',
    },
    {
      label: 'Blood Pressure',
      value: defaultMetrics.blood_pressure,
      unit: 'mmHg',
      icon: '🩸',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      status: 'normal',
    },
    {
      label: 'SpO2',
      value: `${defaultMetrics.spo2}`,
      unit: '%',
      icon: '🫁',
      color: 'text-teal-500',
      bgColor: 'bg-teal-50',
      status: defaultMetrics.spo2 < 95 ? 'warning' : 'normal',
    },
    {
      label: 'Temperature',
      value: `${defaultMetrics.temperature}`,
      unit: '°F',
      icon: '🌡️',
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
      status: defaultMetrics.temperature > 100.4 ? 'warning' : 'normal',
    },
    {
      label: 'Respiration',
      value: `${defaultMetrics.respiration_rate || 16}`,
      unit: '/min',
      icon: '💨',
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
      status: 'normal',
    },
    {
      label: 'Blood Glucose',
      value: `${defaultMetrics.blood_glucose || 95}`,
      unit: 'mg/dL',
      icon: '🧪',
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      status: 'normal',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`${card.bgColor} rounded-2xl p-4 card-hover relative overflow-hidden`}
        >
          {card.status === 'warning' && (
            <div className="absolute top-2 right-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            </div>
          )}
          <span className="text-2xl">{card.icon}</span>
          <div className="mt-2">
            <div className={`text-2xl font-bold ${card.color}`}>
              {card.value}
            </div>
            <div className="text-xs text-gray-500">{card.unit}</div>
          </div>
          <div className="text-xs font-medium text-gray-600 mt-1">{card.label}</div>
        </div>
      ))}
    </div>
  );
};

export default HealthMetrics;
