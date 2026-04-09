import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api';
import Navbar from '../../components/Navbar';
import Toast from '../../components/Toast';

const SPECIALTIES = [
  '', 'Cardiology', 'Dermatology', 'General Practice', 'Neurology',
  'Orthopedics', 'Gastroenterology', 'Pulmonology', 'ENT',
  'Psychiatry', 'Ophthalmology', 'Gynecology', 'Urology',
  'Endocrinology', 'Pediatrics', 'Oncology',
];

interface Doctor {
  _id: string;
  name: string;
  specialty: string;
  bio: string;
  consultationFee: number;
  isVerified: boolean;
  availableSlots: { slotId: string; date: string; startTime: string; isBooked: boolean }[];
}

const SPECIALTY_COLORS: Record<string, string> = {
  Cardiology: '#DC2626', Dermatology: '#D97706', 'General Practice': '#059669',
  Neurology: '#7C3AED', Orthopedics: '#0047AB', Gastroenterology: '#0891B2',
  Pulmonology: '#0369A1', ENT: '#B45309', Psychiatry: '#6D28D9',
  Ophthalmology: '#047857', Gynecology: '#BE185D', Urology: '#1D4ED8',
  Endocrinology: '#065F46', Pediatrics: '#D97706', Oncology: '#DC2626',
};

function SpecialtyBadge({ specialty }: { specialty: string }) {
  const color = SPECIALTY_COLORS[specialty] ?? '#475569';
  return (
    <span style={{
      background: `${color}18`, color, fontSize: 11,
      fontWeight: 700, padding: '3px 9px', borderRadius: 12,
      letterSpacing: '0.2px',
    }}>
      {specialty}
    </span>
  );
}

export default function BrowseDoctors() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialty, setSpecialty] = useState(searchParams.get('specialty') ?? '');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => { fetchDoctors(); }, [specialty]);

  async function fetchDoctors() {
    setLoading(true);
    try {
      const params = specialty ? { specialty } : {};
      const { data } = await api.get('/api/doctors', { params });
      setDoctors(Array.isArray(data) ? data : []);
    } catch {
      setToast({ message: 'Failed to load doctors.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function bookAppointment(doctor: Doctor) {
    const slot = doctor.availableSlots?.find((s) => !s.isBooked);
    if (!slot) {
      setToast({ message: `Dr. ${doctor.name} has no available slots right now.`, type: 'error' });
      return;
    }
    setBooking(doctor._id);
    try {
      await api.post('/api/appointments', {
        doctorId: doctor._id,
        slotId: slot.slotId,
        reason: 'Appointment booked via SmartCare platform',
      });
      setToast({ message: `Appointment booked with Dr. ${doctor.name}!`, type: 'success' });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Booking failed.';
      setToast({ message: msg, type: 'error' });
    } finally {
      setBooking(null);
    }
  }

  const Skeleton = () => (
    <div className="animate-pulse" style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: 20 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#F1F5F9' }} />
        <div>
          <div style={{ width: 120, height: 12, background: '#F1F5F9', borderRadius: 6, marginBottom: 6 }} />
          <div style={{ width: 80, height: 10, background: '#F8FAFC', borderRadius: 6 }} />
        </div>
      </div>
      <div style={{ height: 10, background: '#F8FAFC', borderRadius: 6, marginBottom: 6 }} />
      <div style={{ height: 10, background: '#F8FAFC', borderRadius: 6, width: '70%' }} />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4F8' }}>
      <Navbar />

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0047AB 0%, #0891B2 100%)', padding: '36px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.3px' }}>Find Doctors</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: 0 }}>Browse our verified specialists and book a consultation</p>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
        {/* Filter bar */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#475569', flexShrink: 0 }}>Filter by specialty:</span>
          <select
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            style={{
              border: '1.5px solid #E2E8F0', borderRadius: 8, padding: '7px 12px',
              fontSize: 13, color: '#0F172A', background: '#FAFBFF',
              outline: 'none', cursor: 'pointer', minWidth: 180,
            }}
          >
            {SPECIALTIES.map((s) => <option key={s} value={s}>{s || 'All Specialties'}</option>)}
          </select>
          {specialty && (
            <button onClick={() => setSpecialty('')} style={{ fontSize: 12, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              Clear ✕
            </button>
          )}
          {!loading && (
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94A3B8' }}>
              {doctors.length} doctor{doctors.length !== 1 ? 's' : ''} found
            </span>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
            {[1, 2, 3, 4, 5, 6].map((n) => <Skeleton key={n} />)}
          </div>
        ) : doctors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: '#94A3B8' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👨‍⚕️</div>
            <p style={{ fontWeight: 600, fontSize: 15 }}>No doctors found{specialty ? ` for ${specialty}` : ''}.</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Try selecting a different specialty.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
            {doctors.map((doc) => {
              const available = doc.availableSlots?.some((s) => !s.isBooked);
              const initials = doc.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
              const color = SPECIALTY_COLORS[doc.specialty] ?? '#0047AB';
              return (
                <div key={doc._id} style={{
                  background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0',
                  padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: 14,
                }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  }}
                >
                  {/* Doctor header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 46, height: 46, borderRadius: 12, background: `${color}18`, border: `1.5px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
                      {initials}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Dr. {doc.name}</div>
                      <SpecialtyBadge specialty={doc.specialty} />
                    </div>
                  </div>

                  {/* Bio */}
                  {doc.bio && (
                    <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.6, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {doc.bio}
                    </p>
                  )}

                  {/* Fee + availability */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 13, color: '#475569' }}>
                      Fee: <strong style={{ color: '#0F172A' }}>${doc.consultationFee ?? 'N/A'}</strong>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12,
                      background: available ? '#ECFDF5' : '#F1F5F9',
                      color: available ? '#065F46' : '#94A3B8',
                    }}>
                      {available ? '● Available' : '○ Fully Booked'}
                    </span>
                  </div>

                  {/* Book button */}
                  <button
                    onClick={() => bookAppointment(doc)}
                    disabled={!available || booking === doc._id}
                    style={{
                      width: '100%', padding: '10px 0', borderRadius: 9,
                      background: !available ? '#F1F5F9' : booking === doc._id ? '#CBD5E1' : 'linear-gradient(135deg,#0047AB,#0891B2)',
                      color: !available ? '#94A3B8' : '#fff',
                      border: 'none', cursor: !available ? 'not-allowed' : 'pointer',
                      fontWeight: 700, fontSize: 13,
                    }}
                  >
                    {booking === doc._id ? 'Booking...' : available ? 'Book Appointment' : 'Unavailable'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <button onClick={() => navigate('/patient/dashboard')} style={{ marginTop: 28, background: 'none', border: 'none', color: '#0047AB', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          ← Back to Dashboard
        </button>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

