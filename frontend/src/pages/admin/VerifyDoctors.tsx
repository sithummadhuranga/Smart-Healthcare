import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import Navbar from '../../components/Navbar';
import Toast from '../../components/Toast';

interface Doctor {
  _id: string;
  name: string;
  email: string;
  specialty: string;
  qualifications: string[];
  isVerified: boolean;
}

export default function VerifyDoctors() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    api.get('/api/doctors/pending')
      .then(({ data }) => setDoctors(Array.isArray(data) ? data : []))
      .catch(() => setToast({ message: 'Failed to load pending doctors.', type: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  async function verifyDoctor(id: string, verified: boolean) {
    try {
      await api.patch(`/api/doctors/${id}/verify`, { verified, reason: verified ? 'Credentials verified by admin' : 'Verification rejected' });
      setDoctors((prev) => prev.filter((d) => d._id !== id));
      setToast({ message: `Doctor ${verified ? 'approved' : 'rejected'} successfully.`, type: 'success' });
    } catch {
      setToast({ message: 'Failed to update doctor status.', type: 'error' });
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4F8' }}>
      <Navbar />

      <div style={{ background: 'linear-gradient(135deg,#1E1B4B,#4C1D95)', padding: '36px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.3px' }}>Verify Doctors</h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, margin: 0 }}>Review and approve doctor registrations before they can see patients</p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#94A3B8', fontSize: 14 }}>Loading…</div>
        ) : doctors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: '#94A3B8' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <p style={{ fontWeight: 600, fontSize: 15 }}>All caught up! No pending verifications.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {doctors.map((doc) => {
              const initials = doc.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
              return (
                <div key={doc._id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '20px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                    <div style={{ width: 46, height: 46, borderRadius: 12, background: '#EFF6FF', border: '1.5px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1D4ED8', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>{initials}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>Dr. {doc.name}</div>
                      <div style={{ fontSize: 12, color: '#0047AB', fontWeight: 600, marginTop: 2 }}>{doc.specialty}</div>
                      <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{doc.email}</div>
                      {doc.qualifications?.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                          {doc.qualifications.map((q, i) => (
                            <span key={i} style={{ background: '#F8FAFC', color: '#475569', fontSize: 11, padding: '2px 8px', borderRadius: 8, border: '1px solid #E2E8F0' }}>{q}</span>
                          ))}
                        </div>
                      )}
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

        <button onClick={() => navigate('/admin/dashboard')} style={{ marginTop: 24, background: 'none', border: 'none', color: '#0047AB', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          ← Back to Dashboard
        </button>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

