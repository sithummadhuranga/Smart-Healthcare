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
    <div style={{ minHeight: '100vh', background: '#F0F4F8' }}>
      <Navbar />

      <div style={{ background: 'linear-gradient(135deg,#0047AB,#0891B2)', padding: '36px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.3px' }}>My Prescriptions</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: 0 }}>Your prescription records from all consultations</p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#94A3B8', fontSize: 14 }}>Loading…</div>
        ) : error ? (
          <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 12, padding: '16px 20px', color: '#991B1B', fontSize: 13 }}>{error}</div>
        ) : prescriptions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: '#94A3B8' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💊</div>
            <p style={{ fontWeight: 600, fontSize: 15 }}>No prescriptions yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {prescriptions.map((rx, idx) => (
              <div key={rx.prescriptionId ?? rx._id ?? idx} style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: '22px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>Doctor ID: <span style={{ color: '#0047AB' }}>{rx.doctorId}</span></div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>📅 {new Date(rx.issuedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</div>
                  </div>
                  <button onClick={() => window.print()} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🖨️ Print</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                  {rx.medications.map((med, i) => (
                    <div key={i} style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 9, padding: '11px 14px', display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#1D4ED8' }}>💊 {med.name}</span>
                      <span style={{ fontSize: 12, color: '#475569' }}>Dose: <strong>{med.dosage}</strong></span>
                      <span style={{ fontSize: 12, color: '#475569' }}>Frequency: <strong>{med.frequency}</strong></span>
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

        <button onClick={() => navigate('/patient/dashboard')} style={{ marginTop: 28, background: 'none', border: 'none', color: '#0047AB', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}
