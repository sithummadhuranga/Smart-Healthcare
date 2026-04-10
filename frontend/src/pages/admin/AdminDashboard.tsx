import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import Navbar from '../../components/Navbar';

interface Stats {
  totalUsers: number;
  totalDoctors: number;
  pendingVerifications: number;
  totalTransactions: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalDoctors: 0, pendingVerifications: 0, totalTransactions: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/patients', { params: { limit: 1 } }).catch(() => ({ data: { total: 0 } })),
      api.get('/api/doctors', { params: { limit: 1 } }).catch(() => ({ data: [] })),
      api.get('/api/doctors/pending').catch(() => ({ data: [] })),
      api.get('/api/payments/admin/all', { params: { limit: 1 } }).catch(() => ({ data: { total: 0 } })),
    ]).then(([users, doctors, pending, payments]) => {
      setStats({
        totalUsers: (users.data as { total?: number }).total ?? 0,
        totalDoctors: Array.isArray(doctors.data) ? doctors.data.length : 0,
        pendingVerifications: Array.isArray(pending.data) ? pending.data.length : 0,
        totalTransactions: (payments.data as { total?: number }).total ?? 0,
      });
    }).finally(() => setLoading(false));
  }, []);

  const STAT_CARDS = [
    { label: 'Total Users', value: stats.totalUsers, icon: '👥', color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
    { label: 'Verified Doctors', value: stats.totalDoctors, icon: '👨‍⚕️', color: '#065F46', bg: '#ECFDF5', border: '#A7F3D0' },
    { label: 'Pending Verifications', value: stats.pendingVerifications, icon: '⏳', color: '#92400E', bg: '#FFFBEB', border: '#FCD34D' },
    { label: 'Total Transactions', value: stats.totalTransactions, icon: '💳', color: '#4C1D95', bg: '#F5F3FF', border: '#DDD6FE' },
  ];

  const ACTIONS = [
    { label: 'Manage Users', desc: 'View and manage all registered users', path: '/admin/users', icon: '👥', color: 'var(--primary-dark)', bg: 'var(--primary-light)' },
    { label: 'Verify Doctors', desc: 'Review and approve doctor applications', path: '/admin/doctors', icon: '✔️', color: '#92400E', bg: '#FFFBEB' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', padding: '44px 24px 72px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '3px 12px', marginBottom: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', letterSpacing: '0.5px' }}>ADMIN PANEL</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', color: '#fff', fontSize: 30, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.5px' }}>Admin Dashboard</h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, margin: 0 }}>Platform overview and management controls</p>
        </div>
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 36 }}>
          <path d="M0,20 C360,55 1080,5 1440,25 L1440,60 L0,60 Z" fill="var(--bg)" />
        </svg>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
        {/* Stats grid */}
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 14 }}>Platform Overview</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12, marginBottom: 32 }}>
          {STAT_CARDS.map((s) => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 14, border: `1px solid ${s.border}`, padding: '20px 18px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: 22, marginBottom: 10 }}>{s.icon}</div>
              <div style={{ fontSize: 30, fontWeight: 900, color: s.color, lineHeight: 1 }}>{loading ? '—' : s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 14 }}>Management</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
          {ACTIONS.map((a) => (
            <button key={a.path} onClick={() => navigate(a.path)} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '20px 18px',
              background: '#fff', borderRadius: 14, border: '1px solid var(--border)',
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
              boxShadow: 'var(--shadow-sm)',
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-lg)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'; }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 12, background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{a.icon}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{a.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{a.desc}</div>
              </div>
              <div style={{ marginLeft: 'auto', color: 'var(--border)', fontSize: 18 }}>›</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

