import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import Navbar from '../../components/Navbar';
import Toast from '../../components/Toast';

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
}

interface PrescriptionRecord {
  _id?: string;
  patientId: string;
  patientName?: string;
  appointmentId: string;
  medications: Medication[];
  notes?: string;
  issuedAt?: string;
}

interface DoctorAppointment {
  id: string;
  patientId: string;
  status: string;
  scheduledAt?: string;
  scheduled_at?: string;
}

interface AppointmentOption {
  appointmentId: string;
  patientId: string;
  patientName: string;
  displayName: string;
  status: string;
  scheduledAt?: string;
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
  const [historyLoading, setHistoryLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [appointmentOptions, setAppointmentOptions] = useState<AppointmentOption[]>([]);
  const [patientNameById, setPatientNameById] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    void fetchPrescriptions();
    void fetchAppointmentOptions();
  }, []);

  async function fetchPrescriptions() {
    setHistoryLoading(true);
    try {
      const { data } = await api.get('/api/doctors/prescriptions');
      setPrescriptions(Array.isArray(data) ? data : data.prescriptions ?? []);
    } catch {
      setToast({ message: 'Failed to load prescriptions.', type: 'error' });
    } finally {
      setHistoryLoading(false);
    }
  }

  async function fetchAppointmentOptions() {
    setOptionsLoading(true);
    try {
      const { data } = await api.get('/api/appointments');
      const allAppointments: DoctorAppointment[] = Array.isArray(data) ? data : data.appointments ?? [];

      const relevant = allAppointments.filter((appt) => ['PAID', 'IN_PROGRESS', 'COMPLETED'].includes(appt.status));
      const uniqueByAppointment = new Map<string, DoctorAppointment>();
      for (const appointment of relevant) {
        uniqueByAppointment.set(appointment.id, appointment);
      }

      const uniquePatientIds = Array.from(
        new Set(Array.from(uniqueByAppointment.values()).map((appt) => appt.patientId).filter(Boolean)),
      );

      const nameMap: Record<string, string> = {};
      await Promise.all(uniquePatientIds.map(async (patientId) => {
        try {
          const { data: patientData } = await api.get(`/api/patients/internal/${patientId}`);
          const patientName = patientData?.patient?.name;
          if (typeof patientName === 'string' && patientName.trim()) {
            nameMap[patientId] = patientName.trim();
          }
        } catch {
          // Fall back to patient ID if patient profile lookup fails.
        }
      }));

      setPatientNameById(nameMap);
      const fallbackLabelByPatientId: Record<string, string> = {};
      let fallbackIndex = 1;
      for (const patientId of uniquePatientIds) {
        if (!nameMap[patientId]) {
          fallbackLabelByPatientId[patientId] = `Patient ${fallbackIndex}`;
          fallbackIndex += 1;
        }
      }

      const statusLabel: Record<string, string> = {
        IN_PROGRESS: 'In Progress',
        COMPLETED: 'Completed',
        PAID: 'Paid',
      };

      setAppointmentOptions(
        Array.from(uniqueByAppointment.values())
          .sort((a, b) => new Date((b.scheduledAt || b.scheduled_at || '')).getTime() - new Date((a.scheduledAt || a.scheduled_at || '')).getTime())
          .map((appt) => {
            const patientName = nameMap[appt.patientId] || fallbackLabelByPatientId[appt.patientId] || 'Patient';
            const when = appt.scheduledAt || appt.scheduled_at;
            const whenLabel = when ? new Date(when).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'No schedule';
            return {
              appointmentId: appt.id,
              patientId: appt.patientId,
              patientName,
              displayName: `${patientName} · ${whenLabel} · ${statusLabel[appt.status] || appt.status}`,
              status: appt.status,
              scheduledAt: when,
            };
          }),
      );
    } catch {
      setToast({ message: 'Failed to load appointment list for prescription form.', type: 'error' });
    } finally {
      setOptionsLoading(false);
    }
  }

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
      await fetchPrescriptions();
      await fetchAppointmentOptions();
      setToast({ message: 'Prescription issued successfully!', type: 'success' });
      setTimeout(() => navigate('/doctor/dashboard'), 1500);
    } catch {
      setToast({ message: 'Failed to issue prescription.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%', borderRadius: 8, border: '1.5px solid var(--border)',
    padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font-body)',
    color: 'var(--text-primary)', background: 'var(--bg)', outline: 'none',
  };

  function handleAppointmentSelect(nextAppointmentId: string) {
    setAppointmentId(nextAppointmentId);
    const selected = appointmentOptions.find((option) => option.appointmentId === nextAppointmentId);
    setPatientId(selected?.patientId || '');
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', padding: '44px 24px 72px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ maxWidth: 760, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', color: '#fff', fontSize: 28, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.5px' }}>Issue Prescription</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: 0 }}>Create and send a prescription to a patient</p>
        </div>
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 36 }}>
          <path d="M0,20 C360,55 1080,5 1440,25 L1440,60 L0,60 Z" fill="var(--bg)" />
        </svg>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 24px' }}>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', padding: 24, boxShadow: 'var(--shadow-sm)', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Issued Prescriptions</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{prescriptions.length} records</span>
          </div>
          {historyLoading ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading prescriptions…</div>
          ) : prescriptions.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No prescriptions issued yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {prescriptions.slice(0, 5).map((prescription) => (
                <div key={prescription._id || `${prescription.appointmentId}-${prescription.patientId}`} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                      Patient: {prescription.patientName || patientNameById[prescription.patientId] || 'Patient'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{prescription.issuedAt ? new Date(prescription.issuedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Recently issued'}</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Consultation Ref: {prescription.appointmentId.slice(0, 8)}…
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {prescription.medications.map((medication) => (
                      <span key={`${medication.name}-${medication.dosage}-${medication.frequency}`} style={{ background: 'var(--primary-50)', color: 'var(--primary-dark)', fontSize: 11, fontWeight: 600, padding: '4px 8px', borderRadius: 10 }}>
                        {medication.name} · {medication.dosage} · {medication.frequency}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', padding: 28, boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 6 }}>Consultation</label>
            <select required value={appointmentId} onChange={(e) => handleAppointmentSelect(e.target.value)} style={inputStyle}>
              <option value="">Select a patient consultation</option>
              {appointmentOptions.map((option) => (
                <option key={option.appointmentId} value={option.appointmentId}>
                  {option.displayName}
                </option>
              ))}
            </select>
            {optionsLoading && <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>Loading eligible consultations…</div>}
            {!optionsLoading && appointmentOptions.length === 0 && (
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                No completed or active consultations found yet.
              </div>
            )}
            {patientId && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                Selected Patient: <strong style={{ color: 'var(--text-primary)' }}>{patientNameById[patientId] || patientId}</strong>
              </div>
            )}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>Medications</label>
              <button type="button" onClick={addMedication} style={{ fontSize: 12, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>+ Add Medication</button>
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
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 6 }}>Notes</label>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional instructions or clinical notes..." style={{ ...inputStyle, resize: 'none' }} />
          </div>

          <button type="submit" disabled={loading} style={{ padding: '13px 0', borderRadius: 10, background: loading ? 'var(--border)' : 'var(--primary)', color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14 }}>
            {loading ? 'Issuing Prescription…' : '✓ Issue Prescription'}
          </button>
        </form>

        <button onClick={() => navigate('/doctor/dashboard')} style={{ marginTop: 24, background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          ← Back to Dashboard
        </button>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
