import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import Navbar from '../../components/Navbar';
import Toast from '../../components/Toast';

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
}

export default function IssuePrescription() {
  const navigate = useNavigate();
  const [patientId, setPatientId] = useState('');
  const [appointmentId, setAppointmentId] = useState('');
  const [notes, setNotes] = useState('');
  const [medications, setMedications] = useState<Medication[]>([
    { name: '', dosage: '', frequency: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  function updateMed(index: number, field: keyof Medication, value: string) {
    setMedications((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    );
  }

  function addMedication() {
    setMedications((prev) => [...prev, { name: '', dosage: '', frequency: '' }]);
  }

  function removeMedication(index: number) {
    setMedications((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/doctors/prescriptions', {
        patientId,
        appointmentId,
        medications,
        notes,
      });
      setToast({ message: 'Prescription issued successfully!', type: 'success' });
      setTimeout(() => navigate('/doctor/dashboard'), 1500);
    } catch {
      setToast({ message: 'Failed to issue prescription.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%', borderRadius: 8, border: '1.5px solid #E2E8F0',
    padding: '10px 12px', fontSize: 13, fontFamily: 'Inter, sans-serif',
    color: '#0F172A', background: '#FAFBFF', outline: 'none',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4F8' }}>
      <Navbar />

      <div style={{ background: 'linear-gradient(135deg,#065F46,#059669)', padding: '36px 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.3px' }}>Issue Prescription</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: 0 }}>Create and send a prescription to a patient</p>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 24px' }}>

        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#0F172A', marginBottom: 6 }}>Patient ID</label>
            <input required value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="Patient user ID" style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#0F172A', marginBottom: 6 }}>Appointment ID</label>
            <input required value={appointmentId} onChange={(e) => setAppointmentId(e.target.value)} placeholder="Appointment UUID" style={inputStyle} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={{ fontWeight: 600, fontSize: 13, color: '#0F172A' }}>Medications</label>
              <button type="button" onClick={addMedication} style={{ fontSize: 12, color: '#059669', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>+ Add Medication</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {medications.map((med, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input required value={med.name} onChange={(e) => updateMed(i, 'name', e.target.value)} placeholder="Drug name" style={{ ...inputStyle, flex: 1 }} />
                  <input required value={med.dosage} onChange={(e) => updateMed(i, 'dosage', e.target.value)} placeholder="Dosage" style={{ ...inputStyle, width: 100 }} />
                  <input required value={med.frequency} onChange={(e) => updateMed(i, 'frequency', e.target.value)} placeholder="Frequency" style={{ ...inputStyle, width: 110 }} />
                  {medications.length > 1 && (
                    <button type="button" onClick={() => removeMedication(i)} style={{ color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1, flexShrink: 0 }}>×</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#0F172A', marginBottom: 6 }}>Notes</label>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional instructions or clinical notes..." style={{ ...inputStyle, resize: 'none' }} />
          </div>

          <button type="submit" disabled={loading} style={{ padding: '13px 0', borderRadius: 10, background: loading ? '#86EFAC' : 'linear-gradient(135deg,#059669,#065F46)', color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14 }}>
            {loading ? 'Issuing Prescription…' : '✓ Issue Prescription'}
          </button>
        </form>

        <button onClick={() => navigate('/doctor/dashboard')} style={{ marginTop: 24, background: 'none', border: 'none', color: '#0047AB', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          ← Back to Dashboard
        </button>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
