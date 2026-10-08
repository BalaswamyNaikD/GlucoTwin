import React, { useMemo, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import DoctorDashboard from './pages/DoctorDashboard';
import DoctorPatientDetail from './pages/DoctorPatientDetail';
import PatientDashboard from './pages/PatientDashboard';
import LoginPage from './pages/LoginPage';
import GlucoTwin from './pages/GlucoTwin';

function App() {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const normalizedUser = useMemo(() => user, [user]);

  const handleLogin = (userData) => {
    setUser(userData);
    try {
      localStorage.setItem('user', JSON.stringify(userData));
    } catch {
      // Ignore storage errors in private mode
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar user={normalizedUser} onLogout={handleLogout} />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/dashboard" element={<DoctorDashboard user={normalizedUser} />} />
            <Route path="/glucotwin" element={<GlucoTwin user={normalizedUser} />} />
            <Route path="/doctor/patient/:patientId" element={<DoctorPatientDetail />} />
            <Route path="/patient-dashboard" element={<PatientDashboard user={normalizedUser} />} />
            <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
