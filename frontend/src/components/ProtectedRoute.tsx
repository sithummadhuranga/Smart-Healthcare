import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { getCurrentUser } from '../api';

interface Props {
  children: ReactNode;
  role: 'patient' | 'doctor' | 'admin';
}

export default function ProtectedRoute({ children, role }: Props) {
  const user = getCurrentUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== role) {
    const redirects: Record<string, string> = {
      patient: '/patient/dashboard',
      doctor: '/doctor/dashboard',
      admin: '/admin/dashboard',
    };
    return <Navigate to={redirects[user.role] ?? '/login'} replace />;
  }

  return <>{children}</>;
}
