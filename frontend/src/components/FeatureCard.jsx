import React from 'react';
import { Link } from 'react-router-dom';

const FeatureCard = ({ icon, title, description, link, color = 'medical' }) => {
  const colorClasses = {
    medical: 'bg-medical-50 text-medical-600 group-hover:bg-medical-100',
    teal: 'bg-teal-50 text-teal-600 group-hover:bg-teal-100',
    purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-100',
    orange: 'bg-orange-50 text-orange-600 group-hover:bg-orange-100',
    red: 'bg-red-50 text-red-600 group-hover:bg-red-100',
    green: 'bg-green-50 text-green-600 group-hover:bg-green-100',
  };

  return (
    <Link to={link} className="group">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 card-hover h-full">
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-colors ${colorClasses[color]}`}>
          <span className="text-2xl">{icon}</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-medical-600 transition-colors">
          {title}
        </h3>
        <p className="text-sm text-gray-500 leading-relaxed">
          {description}
        </p>
        <div className="mt-4 flex items-center text-medical-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          Learn more
          <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
};

export default FeatureCard;
