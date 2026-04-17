import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import Navbar from '../../components/Navbar';
import Toast from '../../components/Toast';

interface Patient {
  _id?: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string | PatientAddress;
}

interface PatientAddress {
  street?: string;
  city?: string;
  district?: string;
  country?: string;
}

interface PatientsResponse {
  patients?: Patient[];
  total?: number;
  pagination?: { total?: number };
}

function formatAddress(address?: string | PatientAddress): string {
  if (!address) {
    return '—';
  }

  if (typeof address === 'string') {
    return address.trim() || '—';
  }

  const parts = [address.street, address.city, address.district, address.country]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

  return parts.length > 0 ? parts.join(', ') : '—';
}

export default function ManageUsers() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const limit = 20;

  useEffect(() => {
    void fetchPatients();
  }, [page]);

  async function fetchPatients() {
    setLoading(true);
    try {
      const { data } = await api.get<PatientsResponse>('/api/patients', {
        params: { page, limit },
      });

      setPatients(Array.isArray(data.patients) ? data.patients : []);
      setTotal(Number(data.total ?? data.pagination?.total ?? 0));
    } catch {
      setToast({ message: 'Failed to load patients.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  async function openPatientDetail(patient: Patient) {
    setSelectedPatient(patient);

    const patientId = patient._id || patient.userId;
    if (!patientId) {
      return;
    }

    setDetailLoading(true);
    try {
      const { data } = await api.get(`/api/patients/${patientId}`);
      setSelectedPatient(data.patient || data);
    } catch {
      setToast({ message: 'Failed to load patient details.', type: 'error' });
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', padding: '44px 24px 72px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', color: '#fff', fontSize: 28, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.5px' }}>Manage Patients</h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, margin: 0 }}>Review patient profiles exposed through the documented admin API</p>
        </div>
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 36 }}>
          <path d="M0,20 C360,55 1080,5 1440,25 L1440,60 L0,60 Z" fill="var(--bg)" />
        </svg>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: 14 }}>Loading patients…</div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '14px 20px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>{total} Patients</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                    {['Name', 'Email', 'Phone', 'Date of Birth', 'Address'].map((heading) => (
                      <th key={heading} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {patients.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>No patients found.</td></tr>
                  ) : (
                    patients.map((patient) => (
                      <tr key={patient.userId} style={{ borderBottom: '1px solid var(--bg)', cursor: 'pointer' }} onClick={() => void openPatientDetail(patient)} onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--primary-50)'} onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                        <td style={{ padding: '14px 20px', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{patient.name}</td>
                        <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-secondary)' }}>{patient.email}</td>
                        <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-secondary)' }}>{patient.phone || '—'}</td>
                        <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-secondary)' }}>{patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : '—'}</td>
                        <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-secondary)' }}>{formatAddress(patient.address)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: page === 1 ? 'var(--bg)' : '#fff', color: 'var(--text-secondary)', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600 }}>
                Previous
              </button>
              <button onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: page >= totalPages ? 'var(--bg)' : '#fff', color: 'var(--text-secondary)', cursor: page >= totalPages ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600 }}>
                Next
              </button>
            </div>
          </div>
        )}

        <button onClick={() => navigate('/admin/dashboard')} style={{ marginTop: 24, background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          ← Back to Dashboard
        </button>

        {selectedPatient && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 60 }} onClick={() => setSelectedPatient(null)}>
            <div style={{ width: '100%', maxWidth: 520, background: '#fff', borderRadius: 16, border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', padding: 24 }} onClick={(event) => event.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-primary)' }}>{selectedPatient.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Patient details from the admin patient detail endpoint</div>
                </div>
                <button onClick={() => setSelectedPatient(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18 }}>✕</button>
              </div>
              {detailLoading ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading patient details…</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div><div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>Email</div><div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{selectedPatient.email || '—'}</div></div>
                  <div><div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>Phone</div><div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{selectedPatient.phone || '—'}</div></div>
                  <div><div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>Date of Birth</div><div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{selectedPatient.dateOfBirth ? new Date(selectedPatient.dateOfBirth).toLocaleDateString() : '—'}</div></div>
                  <div><div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>User ID</div><div style={{ fontSize: 13, color: 'var(--text-primary)', wordBreak: 'break-all' }}>{selectedPatient.userId}</div></div>
                  <div style={{ gridColumn: '1 / -1' }}><div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>Address</div><div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{formatAddress(selectedPatient.address)}</div></div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

