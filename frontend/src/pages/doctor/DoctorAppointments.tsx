import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import Navbar from '../../components/Navbar';
import Toast from '../../components/Toast';

interface Appointment {
  id: string;
  patientId: string;
  reason: string;
  status: string;
  scheduledAt?: string;
  scheduled_at: string;
}

function getScheduledAt(appointment: Appointment): string | undefined {
  return appointment.scheduledAt || appointment.scheduled_at;
}

const STATUS_CFG: Record<string, { bg: string; color: string; label: string }> = {
  PENDING:     { bg: '#FEF3C7', color: '#92400E', label: 'Pending' },
  CONFIRMED:   { bg: '#DBEAFE', color: '#1E40AF', label: 'Confirmed' },
  PAID:        { bg: '#EDE9FE', color: '#4C1D95', label: 'Paid' },
  IN_PROGRESS: { bg: '#F0FDF4', color: '#14532D', label: 'In Progress' },
  COMPLETED:   { bg: '#ECFDF5', color: '#065F46', label: 'Completed' },
  CANCELLED:   { bg: '#F1F5F9', color: '#64748B', label: 'Cancelled' },
  REJECTED:    { bg: '#FEE2E2', color: '#991B1B', label: 'Rejected' },
};

export default function DoctorAppointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    api.get('/api/appointments')
      .then(({ data }) => setAppointments(Array.isArray(data) ? data : data.appointments ?? []))
      .catch(() => setToast({ message: 'Failed to load appointments.', type: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  async function updateStatus(id: string, action: 'accept' | 'reject' | 'complete') {
    try {
      const body = action === 'reject' ? { reason: 'Unable to accept at this time' } : {};
      await api.patch(`/api/appointments/${id}/${action}`, body);
      setAppointments((prev) => prev.map((a) =>
        a.id === id ? { ...a, status: action === 'accept' ? 'CONFIRMED' : action === 'reject' ? 'REJECTED' : 'COMPLETED' } : a
      ));
      setToast({ message: `Appointment ${action}ed.`, type: 'success' });
    } catch {
      setToast({ message: `Failed to ${action} appointment.`, type: 'error' });
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', padding: '44px 24px 72px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', color: '#fff', fontSize: 28, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.5px' }}>Patient Appointments</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: 0 }}>Review, confirm, or reject appointment requests</p>
        </div>
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 36 }}>
          <path d="M0,20 C360,55 1080,5 1440,25 L1440,60 L0,60 Z" fill="var(--bg)" />
        </svg>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: 14 }}>Loading…</div>
        ) : appointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
            <div style={{ width: 80, height: 80, borderRadius: 20, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="#94A3B8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="8" y1="9" x2="16" y2="9" stroke="#94A3B8" strokeWidth="1.6" strokeLinecap="round" />
                <line x1="8" y1="13" x2="16" y2="13" stroke="#94A3B8" strokeWidth="1.6" strokeLinecap="round" />
                <line x1="8" y1="17" x2="12" y2="17" stroke="#94A3B8" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </div>
            <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', margin: '0 0 6px' }}>No appointments found.</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Patient appointment requests will appear here once received.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {appointments.map((appt) => {
              const cfg = STATUS_CFG[appt.status] ?? { bg: '#F1F5F9', color: '#64748B', label: appt.status };
              return (
                <div key={appt.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Patient: <span style={{ color: 'var(--primary-dark)' }}>{appt.patientId}</span></div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>{appt.reason}</div>
                      {getScheduledAt(appt) && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                            <circle cx="12" cy="12" r="9" stroke="#94A3B8" strokeWidth="2" />
                            <path d="M12 7v5l3 3" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          {new Date(getScheduledAt(appt)!).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                        </div>
                      )}
                    </div>
                    <span style={{ background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 14, flexShrink: 0 }}>{cfg.label}</span>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {appt.status === 'PENDING' && (
                      <>
                        <button onClick={() => updateStatus(appt.id, 'accept')} style={{ padding: '7px 16px', borderRadius: 8, background: '#059669', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>✓ Accept</button>
                        <button onClick={() => updateStatus(appt.id, 'reject')} style={{ padding: '7px 16px', borderRadius: 8, background: '#DC2626', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>✗ Reject</button>
                      </>
                    )}
                    {appt.status === 'CONFIRMED' && (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '7px 0' }}>Waiting for patient payment…</span>
                    )}
                    {(appt.status === 'PAID' || appt.status === 'IN_PROGRESS') && (
                      <>
                        <button onClick={() => navigate(`/doctor/video/${appt.id}`)} style={{ padding: '7px 16px', borderRadius: 8, background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                            <polygon points="23 7 16 12 23 17 23 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="#fff" />
                            <rect x="1" y="5" width="15" height="14" rx="2" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Start Consultation
                        </button>
                        {appt.status === 'IN_PROGRESS' && (
                          <button onClick={() => updateStatus(appt.id, 'complete')} style={{ padding: '7px 16px', borderRadius: 8, background: '#059669', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
                            Mark Complete
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button onClick={() => navigate('/doctor/dashboard')} style={{ marginTop: 28, background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          ← Back to Dashboard
        </button>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}


