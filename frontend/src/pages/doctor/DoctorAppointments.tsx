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
  scheduled_at: string;
}

const STATUS_CFG: Record<string, { bg: string; color: string; label: string }> = {
  PENDING:   { bg: '#FEF3C7', color: '#92400E', label: 'Pending' },
  CONFIRMED: { bg: '#DBEAFE', color: '#1E40AF', label: 'Confirmed' },
  COMPLETED: { bg: '#ECFDF5', color: '#065F46', label: 'Completed' },
  CANCELLED: { bg: '#F1F5F9', color: '#64748B', label: 'Cancelled' },
  REJECTED:  { bg: '#FEE2E2', color: '#991B1B', label: 'Rejected' },
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
    <div style={{ minHeight: '100vh', background: '#F0F4F8' }}>
      <Navbar />

      <div style={{ background: 'linear-gradient(135deg,#065F46,#059669)', padding: '36px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.3px' }}>Patient Appointments</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: 0 }}>Review, confirm, or reject appointment requests</p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#94A3B8', fontSize: 14 }}>Loading…</div>
        ) : appointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: '#94A3B8' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <p style={{ fontWeight: 600, fontSize: 15 }}>No appointments found.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {appointments.map((appt) => {
              const cfg = STATUS_CFG[appt.status] ?? { bg: '#F1F5F9', color: '#64748B', label: appt.status };
              return (
                <div key={appt.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>Patient: <span style={{ color: '#0047AB' }}>{appt.patientId}</span></div>
                      <div style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>{appt.reason}</div>
                      {appt.scheduled_at && (
                        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>
                          🕐 {new Date(appt.scheduled_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
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
                      <>
                        <button onClick={() => navigate(`/doctor/video/${appt.id}`)} style={{ padding: '7px 16px', borderRadius: 8, background: 'linear-gradient(135deg,#0047AB,#0891B2)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>🎥 Start Consultation</button>
                        <button onClick={() => updateStatus(appt.id, 'complete')} style={{ padding: '7px 16px', borderRadius: 8, background: '#059669', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>✓ Mark Complete</button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button onClick={() => navigate('/doctor/dashboard')} style={{ marginTop: 28, background: 'none', border: 'none', color: '#0047AB', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          ← Back to Dashboard
        </button>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}


