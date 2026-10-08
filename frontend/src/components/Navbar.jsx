import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import NotificationPanel from './NotificationPanel';

const Navbar = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { path: '/', label: 'Home' },
    ...(user?.role === 'patient'
      ? [{ path: '/patient-dashboard', label: 'My Dashboard' }]
      : [
          { path: '/dashboard', label: 'Dashboard' },
        ]
    ),
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 gradient-medical rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">🏥</span>
              </div>
              <div className="hidden sm:block">
                <span className="text-lg font-bold text-gray-900">AI Smart</span>
                <span className="text-lg font-bold text-medical-600"> Hospital</span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navLinks.map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive(path)
                    ? 'bg-medical-50 text-medical-700'
                    : 'text-gray-600 hover:text-medical-600 hover:bg-medical-50'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="hidden lg:flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-3">
                {user.role !== 'patient' && (
                  <NotificationPanel userId={user.id || '1'} userRole={user.role || 'doctor'} />
                )}
                <div className="flex items-center gap-2">
                  <span className="text-sm">{user.role === 'patient' ? '🧑‍🦱' : '👩‍⚕️'}</span>
                  <span className="text-sm text-gray-600">{user.name}</span>
                  {user.id && user.id.startsWith('P-') && (
                    <span className="text-xs text-medical-600 bg-medical-50 px-2 py-0.5 rounded-full">{user.id}</span>
                  )}
                </div>
                <button
                  onClick={onLogout}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-5 py-2 gradient-medical text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Login
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center gap-2">
            {user && user.role !== 'patient' && (
              <NotificationPanel userId={user.id || '1'} userRole={user.role || 'doctor'} />
            )}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="lg:hidden bg-white border-t shadow-lg">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setIsOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive(path)
                    ? 'bg-medical-50 text-medical-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {label}
              </Link>
            ))}
            <div className="pt-3 border-t">
              {user ? (
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm text-gray-600">{user.role === 'patient' ? '🧑‍🦱' : '👩‍⚕️'} {user.name}</span>
                  <button onClick={() => { onLogout(); setIsOpen(false); }} className="text-sm text-red-600 font-medium">Logout</button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="block w-full text-center px-4 py-2 gradient-medical text-white rounded-lg text-sm font-medium"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
