import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';
import Navbar from '../../components/Navbar';
import Toast from '../../components/Toast';

interface Slot {
  slotId: string;
  date: string;
  startTime: string;
  endTime?: string;
  consultationType?: 'ONLINE' | 'PHYSICAL';
  isBooked: boolean;
}

interface Doctor {
  _id: string;
  name: string;
  specialty: string;
  bio?: string;
  consultationFee?: number;
  qualifications?: string[];
  availableSlots?: Slot[];
}

export default function DoctorDetails() {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!doctorId) return;
    void fetchDoctor();
  }, [doctorId]);

  async function fetchDoctor() {
    try {
      const { data } = await api.get(`/api/doctors/${doctorId}`);
      setDoctor(data);
    } catch {
      setToast({ message: 'Failed to load doctor details.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function bookSlot(slot: Slot) {
    if (!doctor) return;

    setBooking(slot.slotId);
    try {
      const consultationLabel = slot.consultationType === 'PHYSICAL' ? 'physical' : 'online';
      await api.post('/api/appointments', {
        doctorId: doctor._id,
        slotId: slot.slotId,
        reason: `${consultationLabel} appointment booked with Dr. ${doctor.name}`,
      });
      setToast({ message: `Appointment booked with Dr. ${doctor.name}.`, type: 'success' });
      await fetchDoctor();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to book appointment.';
      setToast({ message, type: 'error' });
    } finally {
      setBooking(null);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', padding: '44px 24px 72px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ maxWidth: 960, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', color: '#fff', fontSize: 28, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.5px' }}>Doctor Profile</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: 0 }}>View the full doctor profile from the documented public detail endpoint</p>
        </div>
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 36 }}>
          <path d="M0,20 C360,55 1080,5 1440,25 L1440,60 L0,60 Z" fill="var(--bg)" />
        </svg>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: 14 }}>Loading doctor details…</div>
        ) : !doctor ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: 14 }}>Doctor not found.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontWeight: 800, fontSize: 22, color: 'var(--text-primary)', marginBottom: 6 }}>Dr. {doctor.name}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-dark)', marginBottom: 14 }}>{doctor.specialty}</div>
              {doctor.bio && <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-secondary)', marginTop: 0 }}>{doctor.bio}</p>}
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
                <span><strong style={{ color: 'var(--text-primary)' }}>Consultation Fee:</strong> ${doctor.consultationFee ?? 'N/A'}</span>
                <span><strong style={{ color: 'var(--text-primary)' }}>Open Slots:</strong> {doctor.availableSlots?.filter((slot) => !slot.isBooked).length ?? 0}</span>
              </div>
              {Array.isArray(doctor.qualifications) && doctor.qualifications.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>Qualifications</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {doctor.qualifications.map((qualification) => (
                      <span key={qualification} style={{ background: 'var(--primary-50)', color: 'var(--primary-dark)', fontSize: 12, fontWeight: 600, padding: '5px 10px', borderRadius: 12 }}>{qualification}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 12 }}>Available Slots</div>
              {doctor.availableSlots?.some((slot) => !slot.isBooked) ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {doctor.availableSlots.filter((slot) => !slot.isBooked).map((slot) => (
                    <div key={slot.slotId} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{new Date(slot.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{slot.startTime}{slot.endTime ? ` - ${slot.endTime}` : ''}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 10, background: slot.consultationType === 'PHYSICAL' ? '#FEF3C7' : '#DBEAFE', color: slot.consultationType === 'PHYSICAL' ? '#92400E' : '#1E40AF' }}>
                          {slot.consultationType === 'PHYSICAL' ? 'Physical' : 'Online'}
                        </span>
                      <button onClick={() => bookSlot(slot)} disabled={booking === slot.slotId} style={{ padding: '8px 14px', borderRadius: 8, background: booking === slot.slotId ? 'var(--border)' : 'var(--primary)', color: '#fff', border: 'none', cursor: booking === slot.slotId ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 12 }}>
                        {booking === slot.slotId ? 'Booking…' : 'Book'}
                      </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No open slots are currently available.</div>
              )}
            </div>
          </div>
        )}

        <button onClick={() => navigate('/patient/doctors')} style={{ marginTop: 24, background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          ← Back to Doctors
        </button>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}