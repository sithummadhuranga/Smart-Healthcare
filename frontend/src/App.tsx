import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

// Auth pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Patient pages
import PatientDashboard from './pages/patient/PatientDashboard';
import BrowseDoctors from './pages/patient/BrowseDoctors';
import SymptomChecker from './pages/patient/SymptomChecker';
import MyAppointments from './pages/patient/MyAppointments';
import VideoRoom from './pages/patient/VideoRoom';
import Prescriptions from './pages/patient/Prescriptions';
import PatientProfile from './pages/patient/PatientProfile';
import MedicalReports from './pages/patient/MedicalReports';
import PaymentPage from './pages/patient/PaymentPage';

// Doctor pages
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import DoctorAppointments from './pages/doctor/DoctorAppointments';
import IssuePrescription from './pages/doctor/IssuePrescription';
import DoctorVideoRoom from './pages/doctor/DoctorVideoRoom';
import DoctorProfile from './pages/doctor/DoctorProfile';
import ManageSchedule from './pages/doctor/ManageSchedule';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageUsers from './pages/admin/ManageUsers';
import VerifyDoctors from './pages/admin/VerifyDoctors';
import ManageAppointments from './pages/admin/ManageAppointments';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Patient routes */}
        <Route path="/patient/dashboard" element={<ProtectedRoute role="patient"><PatientDashboard /></ProtectedRoute>} />
        <Route path="/patient/doctors" element={<ProtectedRoute role="patient"><BrowseDoctors /></ProtectedRoute>} />
        <Route path="/patient/symptom-checker" element={<ProtectedRoute role="patient"><SymptomChecker /></ProtectedRoute>} />
        <Route path="/patient/appointments" element={<ProtectedRoute role="patient"><MyAppointments /></ProtectedRoute>} />
        <Route path="/patient/video/:roomId" element={<ProtectedRoute role="patient"><VideoRoom /></ProtectedRoute>} />
        <Route path="/patient/prescriptions" element={<ProtectedRoute role="patient"><Prescriptions /></ProtectedRoute>} />
        <Route path="/patient/profile" element={<ProtectedRoute role="patient"><PatientProfile /></ProtectedRoute>} />
        <Route path="/patient/reports" element={<ProtectedRoute role="patient"><MedicalReports /></ProtectedRoute>} />
        <Route path="/patient/payment/:appointmentId" element={<ProtectedRoute role="patient"><PaymentPage /></ProtectedRoute>} />

        {/* Doctor routes */}
        <Route path="/doctor/dashboard" element={<ProtectedRoute role="doctor"><DoctorDashboard /></ProtectedRoute>} />
        <Route path="/doctor/appointments" element={<ProtectedRoute role="doctor"><DoctorAppointments /></ProtectedRoute>} />
        <Route path="/doctor/prescriptions" element={<ProtectedRoute role="doctor"><IssuePrescription /></ProtectedRoute>} />
        <Route path="/doctor/video/:roomId" element={<ProtectedRoute role="doctor"><DoctorVideoRoom /></ProtectedRoute>} />
        <Route path="/doctor/profile" element={<ProtectedRoute role="doctor"><DoctorProfile /></ProtectedRoute>} />
        <Route path="/doctor/schedule" element={<ProtectedRoute role="doctor"><ManageSchedule /></ProtectedRoute>} />

        {/* Admin routes */}
        <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute role="admin"><ManageUsers /></ProtectedRoute>} />
        <Route path="/admin/doctors" element={<ProtectedRoute role="admin"><VerifyDoctors /></ProtectedRoute>} />
        <Route path="/admin/appointments" element={<ProtectedRoute role="admin"><ManageAppointments /></ProtectedRoute>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

// end of file
