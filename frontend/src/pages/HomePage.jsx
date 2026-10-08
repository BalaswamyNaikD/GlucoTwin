import React from 'react';
import HeroSection from '../components/HeroSection';
import FeatureCard from '../components/FeatureCard';

const HomePage = () => {
  const features = [
    {
      icon: '📡',
      title: 'Patient Monitoring',
      description: 'Continuous monitoring of glucose, heart rate, and IBI from the simulated live physiological stream.',
      link: '/glucotwin',
      color: 'teal',
    },
    {
      icon: '📈',
      title: 'Trend Windows',
      description: 'Recent 15/30/60 minute trends to make Digital Twin state and direction visible at a glance.',
      link: '/glucotwin',
      color: 'blue',
    },
    {
      icon: '⚠️',
      title: 'GlucoTwin Prediction',
      description: 'Future 2-hour glucose excursion risk prediction from real model output and temporal features.',
      link: '/glucotwin',
      color: 'green',
    },
  ];

  const benefits = [
    {
      icon: '🧬',
      title: 'Historical + Simulated Dynamics',
      description: 'Combines historical profile with dynamic simulated physiological updates in one twin view.',
    },
    {
      icon: '🧭',
      title: 'Current State → Future Risk',
      description: 'Clearly separates current physiological state from future 2-hour risk to support proactive care.',
    },
    {
      icon: '🧮',
      title: 'Feature-Driven Prediction',
      description: 'Risk changes are tied to temporal model features such as slope, change, and variability.',
    },
    {
      icon: '🔒',
      title: 'Scoped to Monitoring',
      description: 'Focused interface for patient monitoring and GlucoTwin prediction without unrelated modules.',
    },
  ];

  return (
    <div>
      <HeroSection />

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Patient Monitoring and GlucoTwin Prediction
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Focused modules for monitoring current physiological state and forecasting future glucose risk.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <FeatureCard key={idx} {...feature} />
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Why this monitoring view?
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Built to highlight patient monitoring signals and GlucoTwin prediction behavior only.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center card-hover">
                <span className="text-4xl">{benefit.icon}</span>
                <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">{benefit.title}</h3>
                <p className="text-sm text-gray-500">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 gradient-medical-dark relative overflow-hidden">
        <div className="absolute inset-0 bg-dots opacity-20"></div>
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to access GlucoTwin monitoring?
          </h2>
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
            Login to view patient monitoring and future 2-hour GlucoTwin prediction.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/login"
              className="px-8 py-3.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-semibold transition-colors shadow-lg"
            >
              Login
            </a>
            <a
              href="/login"
              className="px-8 py-3.5 glass text-white rounded-xl font-semibold hover:bg-white/20 transition-all"
            >
              Login
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
