import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import Navbar from '../../components/Navbar';
import Toast from '../../components/Toast';

interface User {
  userId?: string;
  _id?: string;
  name: string;
  email: string;
  role: string;
  isActive?: boolean;
}

const ROLE_BADGE: Record<string, { bg: string; color: string }> = {
  patient: { bg: '#EFF6FF', color: '#1D4ED8' },
  doctor:  { bg: '#ECFDF5', color: '#065F46' },
  admin:   { bg: '#F5F3FF', color: '#4C1D95' },
};

export default function ManageUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    api.get('/api/patients', { params: { limit: 50 } })
      .then(({ data }) => setUsers(Array.isArray(data) ? data : data.patients ?? []))
      .catch(() => setToast({ message: 'Failed to load users.', type: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  function toggleActive(userId: string) {
    setUsers((prev) => prev.map((u) => {
      const id = u.userId ?? u._id;
      return id === userId ? { ...u, isActive: !u.isActive } : u;
    }));
    setToast({ message: 'User status updated.', type: 'success' });
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', padding: '44px 24px 72px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', color: '#fff', fontSize: 28, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.5px' }}>Manage Users</h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, margin: 0 }}>View and manage all registered users on the platform</p>
        </div>
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 36 }}>
          <path d="M0,20 C360,55 1080,5 1440,25 L1440,60 L0,60 Z" fill="var(--bg)" />
        </svg>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: 14 }}>Loading users…</div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '14px 20px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>{users.length} Users</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                    {['Name', 'Email', 'Role', 'Status', 'Action'].map((h) => (
                      <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>No users found.</td></tr>
                  ) : (
                    users.map((u) => {
                      const id = u.userId ?? u._id ?? '';
                      const rb = ROLE_BADGE[u.role] ?? { bg: '#F1F5F9', color: '#475569' };
                      const active = u.isActive !== false;
                      return (
                        <tr key={id} style={{ borderBottom: '1px solid var(--bg)' }}
                          onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--primary-50)'}
                          onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                        >
                          <td style={{ padding: '14px 20px', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{u.name}</td>
                          <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-secondary)' }}>{u.email}</td>
                          <td style={{ padding: '14px 20px' }}>
                            <span style={{ background: rb.bg, color: rb.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12, textTransform: 'capitalize' }}>{u.role}</span>
                          </td>
                          <td style={{ padding: '14px 20px' }}>
                            <span style={{ background: active ? '#ECFDF5' : '#FEE2E2', color: active ? '#065F46' : '#991B1B', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12 }}>
                              {active ? '● Active' : '○ Deactivated'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 20px' }}>
                            <button
                              onClick={() => toggleActive(id)}
                              style={{ padding: '6px 14px', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', background: active ? '#FEE2E2' : '#ECFDF5', color: active ? '#991B1B' : '#065F46' }}
                            >
                              {active ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <button onClick={() => navigate('/admin/dashboard')} style={{ marginTop: 24, background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          ← Back to Dashboard
        </button>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

