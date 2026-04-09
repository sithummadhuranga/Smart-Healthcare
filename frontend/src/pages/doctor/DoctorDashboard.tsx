import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getCurrentUser } from '../../api';
import Navbar from '../../components/Navbar';

interface Appointment {
  id: string;
  patientId: string;
  status: string;
  scheduled_at: string;
  reason: string;
}

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/appointments', { params: { status: 'CONFIRMED' } })
      .then(({ data }) => setAppointments(Array.isArray(data) ? data : data.appointments ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const today = appointments.filter((a) => {
    if (!a.scheduled_at) return false;
    return new Date(a.scheduled_at).toDateString() === new Date().toDateString();
  });

  const QUICK_ACTIONS = [
    { icon: '📋', label: 'Manage Appointments', desc: 'View, confirm or reject requests', path: '/doctor/appointments', color: '#0047AB', bg: '#EFF6FF' },
    { icon: '✏️', label: 'Issue Prescription', desc: 'Write and send prescriptions', path: '/doctor/prescriptions', color: '#059669', bg: '#ECFDF5' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4F8' }}>
      <Navbar />

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #065F46 0%, #059669 100%)', padding: '40px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 6 }}>Welcome back,</p>
          <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.3px' }}>Dr. {user?.name ?? 'Doctor'} 👨‍⚕️</h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, margin: 0 }}>Here's your overview for today.</p>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14, marginBottom: 28 }}>
          {[
            { value: today.length, label: "Today's Consultations", icon: '🗓️', bg: '#EFF6FF', color: '#1D4ED8' },
            { value: appointments.length, label: 'Confirmed Appointments', icon: '✔️', bg: '#ECFDF5', color: '#065F46' },
          ].map((stat) => (
            <div key={stat.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{stat.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: stat.color, lineHeight: 1 }}>{loading ? '—' : stat.value}</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14, marginBottom: 32 }}>
          {QUICK_ACTIONS.map((qa) => (
            <button key={qa.path} onClick={() => navigate(qa.path)} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px',
              background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0',
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 16px rgba(0,0,0,0.09)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}
            >
              <div style={{ width: 42, height: 42, borderRadius: 10, background: qa.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{qa.icon}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>{qa.label}</div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{qa.desc}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Today's schedule */}
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 14 }}>Today's Schedule</h2>
          {loading ? (
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '32px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
              Loading…
            </div>
          ) : today.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🗓️</div>
              <p style={{ fontSize: 14, fontWeight: 600 }}>No consultations scheduled for today.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {today.map((a) => (
                <div key={a.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#0F172A' }}>Patient: <span style={{ color: '#0047AB' }}>{a.patientId}</span></div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>{a.reason}</div>
                    {a.scheduled_at && (
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>
                        🕐 {new Date(a.scheduled_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => navigate(`/doctor/video/${a.id}`)}
                    style={{ padding: '8px 16px', borderRadius: 8, background: 'linear-gradient(135deg,#0047AB,#0891B2)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, flexShrink: 0 }}
                  >
                    Start Consultation
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

