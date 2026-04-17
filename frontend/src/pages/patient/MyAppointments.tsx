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
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', padding: '44px 24px 72px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', color: '#fff', fontSize: 28, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.5px' }}>My Appointments</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: 0 }}>Track your upcoming and past consultations</p>
        </div>
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 36 }}>
          <path d="M0,20 C360,55 1080,5 1440,25 L1440,60 L0,60 Z" fill="var(--bg)" />
        </svg>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map((n) => <Skeleton key={n} />)}
          </div>
        ) : appointments.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 24px', textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: 24, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <svg width="36" height="36" fill="none" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2" stroke="#94A3B8" strokeWidth="1.5"/>
                <path d="M16 2v4M8 2v4M3 10h18" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 10px' }}>No appointments yet</h3>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '0 0 28px', maxWidth: 320, lineHeight: 1.6 }}>
              You have no scheduled appointments. Browse our verified specialists and book your first consultation.
            </p>
            <button
              onClick={() => navigate('/patient/doctors')}
              style={{ padding: '11px 28px', borderRadius: 10, background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, boxShadow: '0 4px 12px rgba(20,184,166,0.25)' }}
            >
              Browse Doctors
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {appointments.map((appt) => {
              const cfg = STATUS_CONFIG[appt.status] ?? { bg: '#F1F5F9', color: '#64748B', label: appt.status };
              const canCancel = appt.status === 'PENDING' || appt.status === 'CONFIRMED';
              const canPay = appt.status === 'CONFIRMED';
              const canJoin = appt.status === 'PAID' || appt.status === 'IN_PROGRESS';
              return (
                <div key={appt.id} className="animate-fade-in" style={{
                  background: '#fff', borderRadius: 14, border: '1px solid var(--border)',
                  padding: '18px 20px', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
                  boxShadow: 'var(--shadow-sm)',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>
                      Doctor ID: <span style={{ color: 'var(--primary-dark)' }}>{appt.doctorId}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: appt.scheduled_at ? 4 : 0 }}>
                      {appt.reason}
                    </div>
                    {appt.scheduled_at && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>🕐</span>
                        {new Date(appt.scheduled_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                    <span style={{ background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 14 }}>
                      {cfg.label}
                    </span>
                    {canPay && (
                      <button
                        onClick={() => navigate(`/patient/payment/${appt.id}`)}
                        style={{ fontSize: 12, color: '#fff', background: '#7C3AED', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontWeight: 700 }}
                      >
                        💳 Pay Now
                      </button>
                    )}
                    {canJoin && (
                      <button
                        onClick={() => navigate(`/patient/video/${appt.id}`)}
                        style={{ fontSize: 12, color: '#fff', background: 'var(--primary)', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontWeight: 700 }}
                      >
                        🎥 Join Call
                      </button>
                    )}
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

        <button onClick={() => navigate('/patient/dashboard')} style={{ marginTop: 28, background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          ← Back to Dashboard
        </button>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

