import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import Navbar from '../../components/Navbar';
import Toast from '../../components/Toast';

type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PAID'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED';

interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  slotId: string;
  reason: string | null;
  status: AppointmentStatus;
  scheduledAt: string | null;
  createdAt: string;
}

interface AdminAppointmentsResponse {
  appointments: Appointment[];
  total: number;
  page: number;
  limit: number;
}

const STATUS_OPTIONS: Array<{ label: string; value: '' | AppointmentStatus }> = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Paid', value: 'PAID' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'Rejected', value: 'REJECTED' },
];

const STATUS_BADGE: Record<AppointmentStatus, { bg: string; color: string }> = {
  PENDING: { bg: '#FEF3C7', color: '#92400E' },
  CONFIRMED: { bg: '#DBEAFE', color: '#1E40AF' },
  PAID: { bg: '#EDE9FE', color: '#4C1D95' },
  IN_PROGRESS: { bg: '#F0FDF4', color: '#14532D' },
  COMPLETED: { bg: '#ECFDF5', color: '#065F46' },
  CANCELLED: { bg: '#F1F5F9', color: '#64748B' },
  REJECTED: { bg: '#FEE2E2', color: '#991B1B' },
};

export default function ManageAppointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'' | AppointmentStatus>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(10);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    void fetchAppointments();
  }, [status, page]);

  async function fetchAppointments() {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit };
      if (status) params.status = status;

      const { data } = await api.get<AdminAppointmentsResponse>('/api/appointments/admin/all', { params });
      setAppointments(Array.isArray(data.appointments) ? data.appointments : []);
      setTotal(Number(data.total || 0));
    } catch {
      setToast({ message: 'Failed to load appointments.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', padding: '44px 24px 72px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', color: '#fff', fontSize: 28, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.5px' }}>Manage Appointments</h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, margin: 0 }}>Admin view of all appointments across the platform</p>
        </div>
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 36 }}>
          <path d="M0,20 C360,55 1080,5 1440,25 L1440,60 L0,60 Z" fill="var(--bg)" />
        </svg>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ padding: '14px 20px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>Total: {total}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Status</span>
              <select
                value={status}
                onChange={(e) => {
                  setPage(1);
                  setStatus(e.target.value as '' | AppointmentStatus);
                }}
                style={{ border: '1.5px solid var(--border)', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: 'var(--text-primary)', background: '#fff' }}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: 14 }}>Loading appointments…</div>
          ) : appointments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: 14 }}>No appointments found.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                    {['Appointment', 'Patient', 'Doctor', 'Reason', 'When', 'Status'].map((h) => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appt) => {
                    const badge = STATUS_BADGE[appt.status] ?? { bg: '#F1F5F9', color: '#64748B' };
                    return (
                      <tr key={appt.id} style={{ borderBottom: '1px solid var(--bg)' }}>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-primary)' }}>{appt.id.slice(0, 8)}…</td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>{appt.patientId.slice(0, 8)}…</td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>{appt.doctorId.slice(0, 8)}…</td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)', maxWidth: 250 }}>{appt.reason || '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>
                          {appt.scheduledAt ? new Date(appt.scheduledAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ background: badge.bg, color: badge.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12 }}>{appt.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: page <= 1 ? 'var(--bg)' : '#fff', color: 'var(--text-secondary)', cursor: page <= 1 ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600 }}
            >
              Previous
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: page >= totalPages ? 'var(--bg)' : '#fff', color: 'var(--text-secondary)', cursor: page >= totalPages ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600 }}
            >
              Next
            </button>
          </div>
        </div>

        <button onClick={() => navigate('/admin/dashboard')} style={{ marginTop: 24, background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          ← Back to Dashboard
        </button>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
