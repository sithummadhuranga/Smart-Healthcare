import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getCurrentUser } from '../../api';
import Navbar from '../../components/Navbar';

interface Appointment {
  id: string;
  patientId: string;
  status: string;
  scheduledAt?: string;
  scheduled_at: string;
  reason: string;
  slotId?: string;
  consultationType?: 'ONLINE' | 'PHYSICAL';
}

interface Slot {
  slotId: string;
  consultationType?: 'ONLINE' | 'PHYSICAL';
}

function getScheduledAt(appointment: Appointment): string | undefined {
  return appointment.scheduledAt || appointment.scheduled_at;
}

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/api/appointments'), api.get('/api/doctors/profile')])
      .then(([appointmentsRes, profileRes]) => {
        const rawAppointments: Appointment[] = Array.isArray(appointmentsRes.data)
          ? appointmentsRes.data
          : appointmentsRes.data.appointments ?? [];
        const slots: Slot[] = Array.isArray(profileRes.data?.availableSlots)
          ? profileRes.data.availableSlots
          : [];
        const slotTypeById = new Map(slots.map((slot) => [slot.slotId, slot.consultationType]));

        setAppointments(
          rawAppointments.map((appt) => ({
            ...appt,
            consultationType: appt.slotId ? slotTypeById.get(appt.slotId) : undefined,
          })),
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const confirmed = appointments.filter((a) => a.status === 'CONFIRMED' || a.status === 'PAID' || a.status === 'IN_PROGRESS');
  const today = confirmed.filter((a) => {
    const scheduledAt = getScheduledAt(a);
    if (!scheduledAt) return false;
    return new Date(scheduledAt).toDateString() === new Date().toDateString();
  });
  const pending = appointments.filter((a) => a.status === 'PENDING');

  const STAT_CARDS = [
    {
      label: "Today's Consultations",
      value: today.length,
      icon: <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" stroke="#0D9488" strokeWidth="1.8"/><path d="M16 2v4M8 2v4M3 10h18" stroke="#0D9488" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="16" r="1.5" fill="#0D9488"/></svg>,
      bg: '#F0FDFA', border: '#99F6E4', color: '#0D9488',
    },
    {
      label: 'Active Appointments',
      value: confirmed.length,
      icon: <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="#059669" strokeWidth="1.8" strokeLinecap="round"/><path d="M22 4L12 14.01l-3-3" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
      bg: '#ECFDF5', border: '#A7F3D0', color: '#059669',
    },
    {
      label: 'Pending Requests',
      value: pending.length,
      icon: <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="#D97706" strokeWidth="1.8"/><path d="M12 7v5l3 3" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
      bg: '#FFFBEB', border: '#FDE68A', color: '#D97706',
    },
    {
      label: 'Total Patients',
      value: new Set(appointments.map(a => a.patientId)).size,
      icon: <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="#2563EB" strokeWidth="1.8"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round"/></svg>,
      bg: '#EFF6FF', border: '#BFDBFE', color: '#2563EB',
    },
  ];

  const QUICK_ACTIONS = [
    {
      label: 'Manage Appointments',
      desc: 'View, confirm or reject patient requests',
      path: '/doctor/appointments',
      icon: <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M9 2h6v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V2z" stroke="currentColor" strokeWidth="1.8"/><path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
      bg: 'linear-gradient(135deg, #0D9488 0%, #14B8A6 100%)', color: '#fff', iconBg: 'rgba(255,255,255,0.2)',
    },
    {
      label: 'Manage Schedule',
      desc: 'Set your availability for consultations',
      path: '/doctor/schedule',
      icon: <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
      bg: '#fff', color: 'var(--text-primary)', iconBg: '#F0FDFA',
    },
    {
      label: 'Issue Prescription',
      desc: 'Write and send prescriptions to patients',
      path: '/doctor/prescriptions',
      icon: <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>,
      bg: '#fff', color: 'var(--text-primary)', iconBg: '#ECFDF5',
    },
    {
      label: 'My Profile',
      desc: 'Update your specialty, bio and qualifications',
      path: '/doctor/profile',
      icon: <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M20 21a8 8 0 10-16 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
      bg: '#fff', color: 'var(--text-primary)', iconBg: '#EFF6FF',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #0D9488 0%, #14B8A6 50%, #2DD4BF 100%)', padding: '48px 24px 80px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: -30, left: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        {/* Medical cross watermark */}
        <div style={{ position: 'absolute', right: 60, top: '50%', transform: 'translateY(-50%)', opacity: 0.06, pointerEvents: 'none' }}>
          <svg viewBox="0 0 100 100" width="200" height="200" fill="#fff"><rect x="35" y="10" width="30" height="80" rx="6"/><rect x="10" y="35" width="80" height="30" rx="6"/></svg>
        </div>
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '5px 14px', marginBottom: 14 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34D399' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', letterSpacing: '0.5px' }}>DOCTOR PORTAL</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', color: '#fff', fontSize: 32, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
            Welcome back, Dr. {user?.name ?? 'Doctor'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, margin: 0, maxWidth: 500 }}>
            Manage your patients, consultations, and schedule all in one place.
          </p>
        </div>
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ position: 'absolute', bottom: -1, left: 0, width: '100%', height: 36 }}>
          <path d="M0,20 C360,55 1080,5 1440,25 L1440,60 L0,60 Z" fill="var(--bg)" />
        </svg>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 48px' }}>
        {/* Stats — pull up over hero */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16, marginTop: -44, marginBottom: 32, position: 'relative', zIndex: 3 }}>
          {STAT_CARDS.map((s) => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 16, border: `1px solid ${s.border}`, padding: '22px 20px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{loading ? '—' : s.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 14 }}>Quick Actions</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14 }}>
            {QUICK_ACTIONS.map((qa) => (
              <button key={qa.path} onClick={() => navigate(qa.path)} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '20px 18px',
                background: qa.bg, borderRadius: 16, border: qa.bg === '#fff' ? '1px solid var(--border)' : 'none',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                boxShadow: qa.bg === '#fff' ? 'var(--shadow-sm)' : '0 4px 20px rgba(13,148,136,0.25)',
              }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = qa.bg === '#fff' ? 'var(--shadow-lg)' : '0 8px 30px rgba(13,148,136,0.35)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = qa.bg === '#fff' ? 'var(--shadow-sm)' : '0 4px 20px rgba(13,148,136,0.25)'; }}
              >
                <div style={{ width: 46, height: 46, borderRadius: 12, background: qa.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: qa.color, flexShrink: 0 }}>
                  {qa.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: qa.color }}>{qa.label}</div>
                  <div style={{ fontSize: 12, color: qa.bg === '#fff' ? 'var(--text-secondary)' : 'rgba(255,255,255,0.75)', marginTop: 2 }}>{qa.desc}</div>
                </div>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" style={{ color: qa.bg === '#fff' ? 'var(--text-muted)' : 'rgba(255,255,255,0.6)', flexShrink: 0 }}><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            ))}
          </div>
        </div>

        {/* Today's schedule */}
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 14 }}>Today's Schedule</h2>
          {loading ? (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--border)', padding: '36px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Loading…
            </div>
          ) : today.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--border)', padding: '48px', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: '#F0FDFA', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <svg width="26" height="26" fill="none" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" stroke="#0D9488" strokeWidth="1.8"/><path d="M16 2v4M8 2v4M3 10h18" stroke="#0D9488" strokeWidth="1.8" strokeLinecap="round"/></svg>
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>No consultations today</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Your schedule is clear. New appointments will appear here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {today.map((a) => (
                <div key={a.id} style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--border)', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: '#F0FDFA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" stroke="#0D9488" strokeWidth="1.8"/><path d="M20 21a8 8 0 10-16 0" stroke="#0D9488" strokeWidth="1.8" strokeLinecap="round"/></svg>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{a.reason || 'Consultation'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                        Patient ID: {a.patientId.slice(0, 8)}…
                        {getScheduledAt(a) && (
                          <span style={{ marginLeft: 10, color: 'var(--primary-dark)', fontWeight: 600 }}>
                            {new Date(getScheduledAt(a)!).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {a.consultationType === 'ONLINE' && (a.status === 'PAID' || a.status === 'IN_PROGRESS') ? (
                    <button
                      onClick={() => navigate(`/doctor/video/${a.id}`)}
                      style={{ padding: '9px 20px', borderRadius: 10, background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, flexShrink: 0, boxShadow: 'var(--shadow-teal)' }}
                    >
                      Start Session
                    </button>
                  ) : a.consultationType === 'PHYSICAL' ? (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, flexShrink: 0 }}>
                      In-person Visit
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

