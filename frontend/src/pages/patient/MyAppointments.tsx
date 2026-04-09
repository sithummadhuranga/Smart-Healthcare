import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import Navbar from '../../components/Navbar';
import Toast from '../../components/Toast';

interface Appointment {
  id: string;
  doctorId: string;
  slotId: string;
  reason: string;
  status: string;
  scheduled_at: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  PENDING:     { bg: '#FEF3C7', color: '#92400E', label: 'Pending' },
  CONFIRMED:   { bg: '#DBEAFE', color: '#1E40AF', label: 'Confirmed' },
  PAID:        { bg: '#EDE9FE', color: '#4C1D95', label: 'Paid' },
  IN_PROGRESS: { bg: '#F0FDF4', color: '#14532D', label: 'In Progress' },
  COMPLETED:   { bg: '#ECFDF5', color: '#065F46', label: 'Completed' },
  CANCELLED:   { bg: '#F1F5F9', color: '#64748B', label: 'Cancelled' },
  REJECTED:    { bg: '#FEE2E2', color: '#991B1B', label: 'Rejected' },
};

export default function MyAppointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => { fetchAppointments(); }, []);

  async function fetchAppointments() {
    try {
      const { data } = await api.get('/api/appointments');
      setAppointments(Array.isArray(data) ? data : data.appointments ?? []);
    } catch {
      setToast({ message: 'Failed to load appointments.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function cancelAppointment(id: string) {
    try {
      await api.patch(`/api/appointments/${id}/cancel`);
      setToast({ message: 'Appointment cancelled.', type: 'success' });
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'CANCELLED' } : a)));
    } catch {
      setToast({ message: 'Failed to cancel appointment.', type: 'error' });
    }
  }

  const Skeleton = () => (
    <div className="animate-pulse" style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ width: 160, height: 12, background: '#F1F5F9', borderRadius: 6, marginBottom: 8 }} />
          <div style={{ width: 220, height: 10, background: '#F8FAFC', borderRadius: 6, marginBottom: 6 }} />
          <div style={{ width: 100, height: 10, background: '#F8FAFC', borderRadius: 6 }} />
        </div>
        <div style={{ width: 68, height: 24, background: '#F1F5F9', borderRadius: 12 }} />
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4F8' }}>
      <Navbar />

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0047AB 0%, #0891B2 100%)', padding: '36px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.3px' }}>My Appointments</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: 0 }}>Track your upcoming and past consultations</p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map((n) => <Skeleton key={n} />)}
          </div>
        ) : appointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: '#94A3B8' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
            <p style={{ fontWeight: 600, fontSize: 15 }}>No appointments yet.</p>
            <button
              onClick={() => navigate('/patient/doctors')}
              style={{ marginTop: 16, padding: '10px 24px', borderRadius: 9, background: 'linear-gradient(135deg,#0047AB,#0891B2)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
            >
              Browse Doctors
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {appointments.map((appt) => {
              const cfg = STATUS_CONFIG[appt.status] ?? { bg: '#F1F5F9', color: '#64748B', label: appt.status };
              const canCancel = appt.status === 'PENDING' || appt.status === 'CONFIRMED';
              return (
                <div key={appt.id} className="animate-fade-in" style={{
                  background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0',
                  padding: '18px 20px', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', marginBottom: 4 }}>
                      Doctor ID: <span style={{ color: '#0047AB' }}>{appt.doctorId}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#64748B', marginBottom: appt.scheduled_at ? 4 : 0 }}>
                      {appt.reason}
                    </div>
                    {appt.scheduled_at && (
                      <div style={{ fontSize: 11, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>🕐</span>
                        {new Date(appt.scheduled_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <span style={{ background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 14 }}>
                      {cfg.label}
                    </span>
                    {canCancel && (
                      <button
                        onClick={() => cancelAppointment(appt.id)}
                        style={{ fontSize: 12, color: '#DC2626', background: 'none', border: '1px solid #FECACA', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button onClick={() => navigate('/patient/dashboard')} style={{ marginTop: 28, background: 'none', border: 'none', color: '#0047AB', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          ← Back to Dashboard
        </button>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

