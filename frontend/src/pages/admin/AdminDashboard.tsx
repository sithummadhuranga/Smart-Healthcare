import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import Navbar from '../../components/Navbar';

interface Stats {
  totalUsers: number;
  totalDoctors: number;
  pendingVerifications: number;
  totalAppointments: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalDoctors: 0, pendingVerifications: 0, totalAppointments: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/auth/users').catch(() => ({ data: { users: [] } })),
      api.get('/api/doctors').catch(() => ({ data: [] })),
      api.get('/api/doctors/pending').catch(() => ({ data: [] })),
      api.get('/api/appointments').catch(() => ({ data: [] })),
    ]).then(([users, doctors, pending, appointments]) => {
      const userList = (users.data as { users?: unknown[] }).users ?? [];
      setStats({
        totalUsers: Array.isArray(userList) ? userList.length : 0,
        totalDoctors: Array.isArray(doctors.data) ? doctors.data.length : 0,
        pendingVerifications: Array.isArray(pending.data) ? pending.data.length : 0,
        totalAppointments: Array.isArray(appointments.data) ? appointments.data.length : 0,
      });
    }).finally(() => setLoading(false));
  }, []);

  const STAT_CARDS = [
    {
      label: 'Total Users',
      value: stats.totalUsers,
      icon: <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="#2563EB" strokeWidth="1.8"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round"/></svg>,
      bg: '#EFF6FF', border: '#BFDBFE', color: '#2563EB',
    },
    {
      label: 'Verified Doctors',
      value: stats.totalDoctors,
      icon: <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="#059669" strokeWidth="1.8" strokeLinecap="round"/><path d="M22 4L12 14.01l-3-3" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
      bg: '#ECFDF5', border: '#A7F3D0', color: '#059669',
    },
    {
      label: 'Pending Verifications',
      value: stats.pendingVerifications,
      icon: <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="#D97706" strokeWidth="1.8"/><path d="M12 7v5l3 3" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
      bg: '#FFFBEB', border: '#FDE68A', color: '#D97706',
    },
    {
      label: 'Total Appointments',
      value: stats.totalAppointments,
      icon: <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" stroke="#7C3AED" strokeWidth="1.8"/><path d="M16 2v4M8 2v4M3 10h18" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round"/></svg>,
      bg: '#F5F3FF', border: '#DDD6FE', color: '#7C3AED',
    },
  ];

  const ACTIONS = [
    {
      label: 'Manage Users',
      desc: 'View, filter, and deactivate user accounts across all roles',
      path: '/admin/users',
      icon: <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
      bg: 'linear-gradient(135deg, #0D9488 0%, #14B8A6 100%)', color: '#fff', iconBg: 'rgba(255,255,255,0.2)',
    },
    {
      label: 'Verify Doctors',
      desc: 'Review credentials and approve or reject doctor applications',
      path: '/admin/doctors',
      icon: <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/></svg>,
      bg: '#fff', color: 'var(--text-primary)', iconBg: '#FFFBEB',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)', padding: '48px 24px 80px', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative elements */}
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(20,184,166,0.08)' }} />
        <div style={{ position: 'absolute', bottom: -30, left: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(20,184,166,0.06)' }} />
        <div style={{ position: 'absolute', top: '50%', right: 80, transform: 'translateY(-50%)', opacity: 0.04, pointerEvents: 'none' }}>
          <svg viewBox="0 0 100 100" width="180" height="180" fill="#fff"><rect x="35" y="10" width="30" height="80" rx="6"/><rect x="10" y="35" width="80" height="30" rx="6"/></svg>
        </div>

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(20,184,166,0.2)', borderRadius: 20, padding: '5px 14px', marginBottom: 14 }}>
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#14B8A6" strokeWidth="2" strokeLinejoin="round"/></svg>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#14B8A6', letterSpacing: '0.5px' }}>ADMIN PANEL</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', color: '#fff', fontSize: 32, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
            System Administration
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, margin: 0, maxWidth: 500 }}>
            Monitor platform health, manage users, and oversee healthcare operations.
          </p>
        </div>
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ position: 'absolute', bottom: -1, left: 0, width: '100%', height: 36 }}>
          <path d="M0,20 C360,55 1080,5 1440,25 L1440,60 L0,60 Z" fill="var(--bg)" />
        </svg>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 48px' }}>
        {/* Stats grid — pulled up */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16, marginTop: -44, marginBottom: 36, position: 'relative', zIndex: 3 }}>
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

        {/* Management Actions */}
        <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 14 }}>Management</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 16 }}>
          {ACTIONS.map((a) => (
            <button key={a.path} onClick={() => navigate(a.path)} style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: '24px 22px',
              background: a.bg, borderRadius: 16, border: a.bg === '#fff' ? '1px solid var(--border)' : 'none',
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
              boxShadow: a.bg === '#fff' ? 'var(--shadow-sm)' : '0 4px 20px rgba(13,148,136,0.25)',
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = a.bg === '#fff' ? 'var(--shadow-lg)' : '0 8px 30px rgba(13,148,136,0.35)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = a.bg === '#fff' ? 'var(--shadow-sm)' : '0 4px 20px rgba(13,148,136,0.25)'; }}
            >
              <div style={{ width: 52, height: 52, borderRadius: 14, background: a.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: a.color, flexShrink: 0 }}>
                {a.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: a.color, marginBottom: 4 }}>{a.label}</div>
                <div style={{ fontSize: 13, color: a.bg === '#fff' ? 'var(--text-secondary)' : 'rgba(255,255,255,0.75)', lineHeight: 1.4 }}>{a.desc}</div>
              </div>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" style={{ color: a.bg === '#fff' ? 'var(--text-muted)' : 'rgba(255,255,255,0.5)', flexShrink: 0 }}><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          ))}
        </div>

        {/* System health */}
        <div style={{ marginTop: 32, background: '#fff', borderRadius: 16, border: '1px solid var(--border)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 16 }}>System Status</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
            {[
              { name: 'Auth Service', status: true },
              { name: 'Patient Service', status: true },
              { name: 'Doctor Service', status: true },
              { name: 'Appointment Service', status: true },
              { name: 'Payment Service', status: true },
              { name: 'AI Symptom Service', status: true },
            ].map((svc) => (
              <div key={svc.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'var(--bg)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: svc.status ? '#10B981' : '#EF4444', flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{svc.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

