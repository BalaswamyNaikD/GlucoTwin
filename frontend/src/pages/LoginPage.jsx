import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ORIGIN } from '../config/apiConfig';

const LoginPage = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState('doctor'); // 'doctor' or 'patient'
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    specialization: '',
    age: '',
    gender: '',
    phone: '',
    blood_group: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    let endpoint;
    let payload;

    if (role === 'patient') {
      endpoint = isRegister ? '/api/auth/patient/register' : '/api/auth/patient/login';
      payload = isRegister
        ? { email: formData.email, password: formData.password, name: formData.name, age: formData.age, gender: formData.gender, phone: formData.phone, blood_group: formData.blood_group }
        : { email: formData.email, password: formData.password };
    } else {
      endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      payload = isRegister
        ? { email: formData.email, password: formData.password, name: formData.name, specialization: formData.specialization }
        : { email: formData.email, password: formData.password };
    }

    try {
      const response = await fetch(`${API_ORIGIN}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        if (onLogin) onLogin(data.user);
        navigate(data.user.role === 'patient' ? '/patient-dashboard' : '/dashboard');
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch {
      // Demo mode - allow login without backend
      if (formData.email && formData.password) {
        const demoUser = role === 'patient'
          ? {
              id: `P-${1000 + Math.floor(Math.random() * 999)}`,
              name: isRegister ? formData.name : 'John Doe',
              email: formData.email,
              role: 'patient',
              age: isRegister ? formData.age : 45,
              gender: isRegister ? formData.gender : 'Male',
              blood_group: isRegister ? formData.blood_group : 'O+',
            }
          : {
              id: '1',
              name: isRegister ? formData.name : 'Dr. Sarah Johnson',
              email: formData.email,
              specialization: isRegister ? formData.specialization : 'General Medicine',
              role: 'doctor',
            };
        localStorage.setItem('token', 'demo-token');
        localStorage.setItem('user', JSON.stringify(demoUser));
        if (onLogin) onLogin(demoUser);
        navigate(demoUser.role === 'patient' ? '/patient-dashboard' : '/dashboard');
      } else {
        setError('Please fill in all required fields');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="gradient-medical p-8 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">{role === 'patient' ? '🧑‍🦱' : '🏥'}</span>
            </div>
            <h1 className="text-2xl font-bold text-white">
              {isRegister ? 'Create Account' : `${role === 'patient' ? 'Patient' : 'Doctor'} Login`}
            </h1>
            <p className="text-medical-100 text-sm mt-2">
              {isRegister
                ? `Register as a ${role === 'patient' ? 'patient' : 'doctor'}`
                : `Sign in as ${role === 'patient' ? 'Patient' : 'Doctor'}`}
            </p>
            {/* Role Toggle */}
            <div className="flex justify-center mt-4">
              <div className="bg-white/10 rounded-xl p-1 flex gap-1">
                <button
                  type="button"
                  onClick={() => { setRole('doctor'); setError(''); }}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    role === 'doctor' ? 'bg-white text-medical-700' : 'text-white/80 hover:text-white'
                  }`}
                >
                  👩‍⚕️ Doctor
                </button>
                <button
                  type="button"
                  onClick={() => { setRole('patient'); setError(''); }}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    role === 'patient' ? 'bg-white text-medical-700' : 'text-white/80 hover:text-white'
                  }`}
                >
                  🧑‍🦱 Patient
                </button>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="p-8">
            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Demo credentials hint */}
            {!isRegister && (
              <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-xs text-blue-700 font-medium">Demo Credentials ({role === 'patient' ? 'Patient' : 'Doctor'}):</p>
                <p className="text-xs text-blue-600">
                  {role === 'patient'
                    ? 'Email: patient@hospital.com | Password: patient123'
                    : 'Email: doctor@hospital.com | Password: doctor123'}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder={role === 'patient' ? 'John Doe' : 'Dr. John Doe'}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-medical-500 focus:border-transparent bg-gray-50 focus:bg-white"
                      required
                    />
                  </div>
                  {role === 'doctor' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Specialization</label>
                      <select
                        name="specialization"
                        value={formData.specialization}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-medical-500 focus:border-transparent bg-gray-50 focus:bg-white"
                      >
                        <option value="">Select specialization</option>
                        <option value="General Medicine">General Medicine</option>
                        <option value="Surgery">Surgery</option>
                        <option value="Cardiology">Cardiology</option>
                        <option value="Neurology">Neurology</option>
                        <option value="Pulmonology">Pulmonology</option>
                        <option value="Psychiatry">Psychiatry</option>
                        <option value="Orthopedics">Orthopedics</option>
                      </select>
                    </div>
                  )}
                  {role === 'patient' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Age</label>
                          <input
                            type="number"
                            name="age"
                            value={formData.age}
                            onChange={handleChange}
                            placeholder="30"
                            min="1"
                            max="120"
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-medical-500 focus:border-transparent bg-gray-50 focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Gender</label>
                          <select
                            name="gender"
                            value={formData.gender}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-medical-500 focus:border-transparent bg-gray-50 focus:bg-white"
                          >
                            <option value="">Select</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                          <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="555-0100"
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-medical-500 focus:border-transparent bg-gray-50 focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Blood Group</label>
                          <select
                            name="blood_group"
                            value={formData.blood_group}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-medical-500 focus:border-transparent bg-gray-50 focus:bg-white"
                          >
                            <option value="">Select</option>
                            <option value="A+">A+</option>
                            <option value="A-">A-</option>
                            <option value="B+">B+</option>
                            <option value="B-">B-</option>
                            <option value="O+">O+</option>
                            <option value="O-">O-</option>
                            <option value="AB+">AB+</option>
                            <option value="AB-">AB-</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="doctor@hospital.com"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-medical-500 focus:border-transparent bg-gray-50 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-medical-500 focus:border-transparent bg-gray-50 focus:bg-white"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 gradient-medical text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    {isRegister ? 'Creating Account...' : 'Signing In...'}
                  </>
                ) : (
                  isRegister ? 'Create Account' : 'Sign In'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => { setIsRegister(!isRegister); setError(''); }}
                className="text-sm text-medical-600 hover:text-medical-700 font-medium"
              >
                {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register"}
              </button>
              {isRegister && role === 'patient' && (
                <p className="text-xs text-gray-400 mt-2">
                  Your Patient ID will be auto-generated upon registration
                </p>
              )}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          AI Smart Hospital Assistant &copy; 2026 | HIPAA Compliant
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
