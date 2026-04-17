import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import Navbar from '../../components/Navbar';
import Toast from '../../components/Toast';

interface Doctor {
  _id: string;
  name: string;
  email: string;
  role: 'doctor';
  isActive: boolean;
  isVerified: boolean;
}

interface UsersResponse {
  users?: Doctor[];
}

export default function VerifyDoctors() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  async function fetchPendingDoctors() {
    setLoading(true);
    try {
      const { data } = await api.get<UsersResponse>('/api/auth/users', {
        params: { role: 'doctor', limit: 100 },
      });
      const allDoctors = Array.isArray(data?.users) ? data.users : [];
      setDoctors(allDoctors.filter((doc) => !doc.isVerified && doc.isActive));
    } catch {
      setToast({ message: 'Failed to load pending doctors.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchPendingDoctors();
  }, []);

  async function verifyDoctor(id: string, verified: boolean) {
    try {
      if (verified) {
        await api.patch(`/api/auth/users/${id}/verify`);
      } else {
        await api.patch(`/api/auth/users/${id}/deactivate`);
      }
      setDoctors((prev) => prev.filter((d) => d._id !== id));
      setToast({ message: `Doctor ${verified ? 'approved' : 'rejected'} successfully.`, type: 'success' });
    } catch {
      setToast({ message: 'Failed to update doctor status.', type: 'error' });
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', padding: '44px 24px 72px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', color: '#fff', fontSize: 28, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.5px' }}>Verify Doctors</h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, margin: 0 }}>Review and approve doctor registrations before they can see patients</p>
        </div>
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 36 }}>
          <path d="M0,20 C360,55 1080,5 1440,25 L1440,60 L0,60 Z" fill="var(--bg)" />
        </svg>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: 14 }}>Loading…</div>
        ) : doctors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
            <div style={{ width: 80, height: 80, borderRadius: 20, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="#059669" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 12l2 2 4-4" stroke="#059669" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', margin: '0 0 6px' }}>All caught up!</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>No pending doctor verifications at this time.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {doctors.map((doc) => {
              const initials = doc.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
              return (
                <div key={doc._id} style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', padding: '20px 22px', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                    <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--primary-light)', border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-dark)', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>{initials}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Dr. {doc.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{doc.email}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => verifyDoctor(doc._id, true)} style={{ padding: '8px 18px', borderRadius: 8, background: '#059669', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>✓ Approve</button>
                    <button onClick={() => verifyDoctor(doc._id, false)} style={{ padding: '8px 18px', borderRadius: 8, background: '#DC2626', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>✗ Reject</button>
                  </div>
                </div>
              );
            })}
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

