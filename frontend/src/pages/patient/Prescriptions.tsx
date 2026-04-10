import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import Navbar from '../../components/Navbar';

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
}

interface Prescription {
  prescriptionId?: string;
  _id?: string;
  doctorId: string;
  medications: Medication[];
  notes: string;
  issuedAt: string;
}

export default function Prescriptions() {
  const navigate = useNavigate();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/api/patients/prescriptions')
      .then(({ data }) => setPrescriptions(Array.isArray(data) ? data : []))
      .catch(() => setError('Failed to load prescriptions.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', padding: '44px 24px 72px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', color: '#fff', fontSize: 28, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.5px' }}>My Prescriptions</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: 0 }}>Your prescription records from all consultations</p>
        </div>
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 36 }}>
          <path d="M0,20 C360,55 1080,5 1440,25 L1440,60 L0,60 Z" fill="var(--bg)" />
        </svg>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: 14 }}>Loading…</div>
        ) : error ? (
          <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 12, padding: '16px 20px', color: '#991B1B', fontSize: 13 }}>{error}</div>
        ) : prescriptions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💊</div>
            <p style={{ fontWeight: 600, fontSize: 15 }}>No prescriptions yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {prescriptions.map((rx, idx) => (
              <div key={rx.prescriptionId ?? rx._id ?? idx} style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', padding: '22px 24px', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Doctor ID: <span style={{ color: 'var(--primary-dark)' }}>{rx.doctorId}</span></div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>📅 {new Date(rx.issuedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</div>
                  </div>
                  <button onClick={() => window.print()} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🖨️ Print</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                  {rx.medications.map((med, i) => (
                    <div key={i} style={{ background: 'var(--primary-light)', border: '1px solid var(--border)', borderRadius: 9, padding: '11px 14px', display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary-dark)' }}>💊 {med.name}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Dose: <strong>{med.dosage}</strong></span>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Frequency: <strong>{med.frequency}</strong></span>
                    </div>
                  ))}
                </div>

                {rx.notes && (
                  <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 9, padding: '10px 14px', fontSize: 13, color: '#92400E' }}>
                    <strong>📝 Notes:</strong> {rx.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <button onClick={() => navigate('/patient/dashboard')} style={{ marginTop: 28, background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}
