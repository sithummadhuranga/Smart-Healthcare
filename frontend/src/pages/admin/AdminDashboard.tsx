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
    { label: 'Manage Users', desc: 'View and manage all registered users', path: '/admin/users', icon: '👥', color: '#1D4ED8', bg: '#EFF6FF' },
    { label: 'Verify Doctors', desc: 'Review and approve doctor applications', path: '/admin/doctors', icon: '✔️', color: '#92400E', bg: '#FFFBEB' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4F8' }}>
      <Navbar />

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #4C1D95 100%)', padding: '40px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '3px 12px', marginBottom: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', letterSpacing: '0.5px' }}>ADMIN PANEL</span>
          </div>
          <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.3px' }}>Admin Dashboard</h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, margin: 0 }}>Platform overview and management controls</p>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
        {/* Stats grid */}
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#475569', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 14 }}>Platform Overview</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12, marginBottom: 32 }}>
          {STAT_CARDS.map((s) => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 12, border: `1px solid ${s.border}`, padding: '20px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 22, marginBottom: 10 }}>{s.icon}</div>
              <div style={{ fontSize: 30, fontWeight: 900, color: s.color, lineHeight: 1 }}>{loading ? '—' : s.value}</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#475569', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 14 }}>Management</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
          {ACTIONS.map((a) => (
            <button key={a.path} onClick={() => navigate(a.path)} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '20px 18px',
              background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0',
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 16px rgba(0,0,0,0.09)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 12, background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{a.icon}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>{a.label}</div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>{a.desc}</div>
              </div>
              <div style={{ marginLeft: 'auto', color: '#CBD5E1', fontSize: 18 }}>›</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

