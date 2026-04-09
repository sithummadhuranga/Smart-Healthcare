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
    <div style={{ minHeight: '100vh', background: '#F0F4F8' }}>
      <Navbar />

      <div style={{ background: 'linear-gradient(135deg,#1E1B4B,#4C1D95)', padding: '36px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.3px' }}>Manage Users</h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, margin: 0 }}>View and manage all registered users on the platform</p>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#94A3B8', fontSize: 14 }}>Loading users…</div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '14px 20px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>{users.length} Users</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    {['Name', 'Email', 'Role', 'Status', 'Action'].map((h) => (
                      <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>No users found.</td></tr>
                  ) : (
                    users.map((u) => {
                      const id = u.userId ?? u._id ?? '';
                      const rb = ROLE_BADGE[u.role] ?? { bg: '#F1F5F9', color: '#475569' };
                      const active = u.isActive !== false;
                      return (
                        <tr key={id} style={{ borderBottom: '1px solid #F1F5F9' }}
                          onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = '#FAFBFF'}
                          onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                        >
                          <td style={{ padding: '14px 20px', fontWeight: 600, fontSize: 13, color: '#0F172A' }}>{u.name}</td>
                          <td style={{ padding: '14px 20px', fontSize: 13, color: '#64748B' }}>{u.email}</td>
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

        <button onClick={() => navigate('/admin/dashboard')} style={{ marginTop: 24, background: 'none', border: 'none', color: '#0047AB', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          ← Back to Dashboard
        </button>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

