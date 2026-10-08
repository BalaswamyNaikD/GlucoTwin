import React from 'react';
import { Link } from 'react-router-dom';

const HeroSection = () => {
  return (
    <section className="relative gradient-hero overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-dots opacity-30"></div>

      {/* Floating shapes */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-teal-400/10 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-medical-400/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }}></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="animate-slide-up">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-teal-400 rounded-full mr-2 animate-pulse"></span>
              Predictive Patient Monitoring
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Patient Monitoring &{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-medical-300">
                GlucoTwin Prediction
              </span>
            </h1>

            <p className="text-lg text-gray-300 mb-8 max-w-lg leading-relaxed">
              Predictive Digital Twin using historical + simulated dynamic physiological data
              for continuous patient monitoring and future 2-hour glucose risk prediction.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/login"
                className="px-8 py-3.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-semibold transition-all duration-200 text-center shadow-lg shadow-teal-500/25"
              >
                Login
              </Link>
              <Link
                to="/login"
                className="px-8 py-3.5 glass text-white rounded-xl font-semibold hover:bg-white/20 transition-all duration-200 text-center"
              >
                Login
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mt-12">
              {[
                { value: '2h', label: 'Prediction Horizon' },
                { value: '15/30/60m', label: 'Trend Windows' },
                { value: '24/7', label: 'Patient Monitoring' },
              ].map((stat, idx) => (
                <div key={idx} className="text-center">
                  <div className="text-2xl font-bold text-white stat-animate" style={{ animationDelay: `${idx * 0.2}s` }}>
                    {stat.value}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right content - Visual */}
          <div className="hidden lg:block animate-fade-in">
            <div className="relative">
              {/* Main card */}
              <div className="glass rounded-2xl p-8 shadow-2xl">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <span className="text-gray-300 text-sm ml-2">Digital Twin Monitoring Console</span>
                </div>

                {/* AI Analysis Preview */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">📊</span>
                      <div>
                        <div className="text-white text-sm font-medium">Current Physiological State</div>
                        <div className="text-gray-400 text-xs">Historical + simulated live stream</div>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">Ready</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">📈</span>
                      <div>
                        <div className="text-white text-sm font-medium">Temporal Features</div>
                        <div className="text-gray-400 text-xs">15/30/60 minute trend calculations</div>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">Active</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">⚠️</span>
                      <div>
                        <div className="text-white text-sm font-medium">Future 2-hour Risk</div>
                        <div className="text-gray-400 text-xs">Predictive glucose excursion score</div>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-teal-500/20 text-teal-400 text-xs rounded-full">Predicting</span>
                  </div>

                </div>

                {/* Heartbeat line */}
                <div className="mt-6 h-12 flex items-center">
                  <svg viewBox="0 0 400 50" className="w-full text-teal-400">
                    <path
                      d="M0 25 L50 25 L70 25 L80 10 L90 40 L100 5 L110 45 L120 25 L140 25 L200 25 L220 25 L230 10 L240 40 L250 5 L260 45 L270 25 L290 25 L350 25 L370 25 L380 10 L390 40 L400 25"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="animate-pulse"
                    />
                  </svg>
                </div>
              </div>

              {/* Floating notification */}
              <div className="absolute -top-4 -right-4 glass rounded-xl p-3 shadow-lg animate-float" style={{ animationDelay: '1s' }}>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <div>
                    <div className="text-white text-xs font-medium">Twin Prediction Active</div>
                    <div className="text-gray-400 text-xs">Forecast window: next 2 hours</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 80L60 70C120 60 240 40 360 35C480 30 600 40 720 45C840 50 960 50 1080 45C1200 40 1320 30 1380 25L1440 20V80H1380C1320 80 1200 80 1080 80C960 80 840 80 720 80C600 80 480 80 360 80C240 80 120 80 60 80H0Z" fill="#f8fafc"/>
        </svg>
      </div>
    </section>
  );
};

export default HeroSection;
