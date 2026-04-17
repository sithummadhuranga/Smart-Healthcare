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
  availableSlots: { slotId: string; date: string; startTime: string; endTime?: string; consultationType?: 'ONLINE' | 'PHYSICAL'; isBooked: boolean }[];
}

const SPECIALTY_COLORS: Record<string, string> = {
  Cardiology: '#DC2626', Dermatology: '#D97706', 'General Practice': '#059669',
  Neurology: '#7C3AED', Orthopedics: '#0047AB', Gastroenterology: '#0891B2',
  Pulmonology: '#0369A1', ENT: '#B45309', Psychiatry: '#6D28D9',
  Ophthalmology: '#047857', Gynecology: '#BE185D', Urology: '#1D4ED8',
  Endocrinology: '#065F46', Pediatrics: '#D97706', Oncology: '#DC2626',
};

const AVATAR_BG: string[] = ['#E8F1F2', '#ECFDF5', '#EFF6FF', '#F5F3FF', '#FFF7ED', '#FEF3C7'];

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
    const slot = doctor.availableSlots?.find((s) => !s.isBooked && (s.consultationType || 'ONLINE') === 'ONLINE');
    if (!slot) {
      setToast({ message: `Dr. ${doctor.name} has no online slots right now.`, type: 'error' });
      return;
    }
    setBooking(doctor._id);
    try {
      await api.post('/api/appointments', {
        doctorId: doctor._id,
        slotId: slot.slotId,
        reason: 'online appointment booked via SmartCare platform',
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
    <div className="animate-pulse" style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--border)', padding: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--bg-secondary)' }} />
        <div style={{ width: 120, height: 14, background: 'var(--bg-secondary)', borderRadius: 6 }} />
        <div style={{ width: 80, height: 10, background: 'var(--bg)', borderRadius: 6 }} />
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      {/* Section heading — Medico "All the top doctors in one place" */}
      <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', padding: '48px 24px 80px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            color: '#fff', fontSize: 32, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.5px',
          }}>
            All the top doctors in one place
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, margin: 0 }}>Browse our verified specialists and book a consultation</p>
        </div>

        {/* Wave */}
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 40 }}>
          <path d="M0,20 C360,55 1080,5 1440,25 L1440,60 L0,60 Z" fill="var(--bg)" />
        </svg>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
        {/* Filter bar */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', padding: '14px 20px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', flexShrink: 0 }}>Filter by specialty:</span>
          <select value={specialty} onChange={(e) => setSpecialty(e.target.value)}
            style={{ border: '1.5px solid var(--border)', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: 'var(--text-primary)', background: 'var(--bg)', outline: 'none', cursor: 'pointer', minWidth: 180 }}>
            {SPECIALTIES.map((s) => <option key={s} value={s}>{s || 'All Specialties'}</option>)}
          </select>
          {specialty && (
            <button onClick={() => setSpecialty('')} style={{ fontSize: 12, color: 'var(--medical-red)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Clear ✕</button>
          )}
          {!loading && (
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
              {doctors.length} doctor{doctors.length !== 1 ? 's' : ''} found
            </span>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 20 }}>
            {[1, 2, 3, 4, 5, 6].map((n) => <Skeleton key={n} />)}
          </div>
        ) : doctors.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 24px', textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: 24, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <svg width="36" height="36" fill="none" viewBox="0 0 24 24">
                <path d="M5 6.5a3.5 3.5 0 017 0v4a3.5 3.5 0 01-7 0v-4z" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8.5 14A6.5 6.5 0 0115 20.5" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="17" cy="20.5" r="2" stroke="#94A3B8" strokeWidth="1.5"/>
                <path d="M7 3v1.5M10 3v1.5" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 10px' }}>
              No doctors found{specialty ? ` for ${specialty}` : ''}
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '0 0 28px', maxWidth: 340, lineHeight: 1.6 }}>
              {specialty
                ? `There are no verified specialists in ${specialty} at the moment. Try a different specialty or browse all available doctors.`
                : 'No doctors are currently available. Please check back shortly.'}
            </p>
            {specialty && (
              <button
                onClick={() => setSpecialty('')}
                style={{ padding: '11px 28px', borderRadius: 10, background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, boxShadow: '0 4px 12px rgba(20,184,166,0.25)' }}
              >
                Browse All Doctors
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 20 }}>
            {doctors.map((doc, idx) => {
              const available = doc.availableSlots?.some((s) => !s.isBooked);
              const initials = doc.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
              const ringBg = AVATAR_BG[idx % AVATAR_BG.length];
              const specColor = SPECIALTY_COLORS[doc.specialty] ?? 'var(--primary)';
              return (
                <div
                  key={doc._id}
                  style={{
                    background: '#fff', borderRadius: 18, overflow: 'hidden',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'all 0.25s',
                    display: 'flex', flexDirection: 'column',
                    padding: '28px 22px',
                    textAlign: 'center',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-lg)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  }}
                >
                  {/* Circular avatar with ring — Medico style */}
                  <div style={{
                    width: 76, height: 76, borderRadius: '50%',
                    background: ringBg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 14px',
                    border: `3px solid ${specColor}30`,
                  }}>
                    <div style={{
                      width: 60, height: 60, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${specColor}88, ${specColor}CC)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 800, fontSize: 20,
                    }}>
                      {initials}
                    </div>
                  </div>

                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 4 }}>
                    Dr. {doc.name}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <SpecialtyBadge specialty={doc.specialty} />
                  </div>

                  {doc.bio && (
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textAlign: 'left' }}>
                      {doc.bio}
                    </p>
                  )}

                  {/* Fee */}
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
                    Consultation Fee
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>
                    ${doc.consultationFee ?? 'N/A'}
                  </div>

                  {/* Buttons — quick online booking + availability */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                    <button
                      onClick={() => navigate(`/patient/doctors/${doc._id}`)}
                      style={{
                        flex: 1, padding: '10px 0', borderRadius: 8,
                        background: '#fff',
                        color: 'var(--text-primary)',
                        border: '1.5px solid var(--border)',
                        cursor: 'pointer',
                        fontWeight: 700, fontSize: 12,
                        transition: 'all 0.2s',
                      }}
                    >
                      View Profile
                    </button>
                    <button
                      onClick={() => bookAppointment(doc)}
                      disabled={!doc.availableSlots?.some((s) => !s.isBooked && (s.consultationType || 'ONLINE') === 'ONLINE') || booking === doc._id}
                      style={{
                        flex: 1, padding: '10px 0', borderRadius: 8,
                        background: !doc.availableSlots?.some((s) => !s.isBooked && (s.consultationType || 'ONLINE') === 'ONLINE') ? 'var(--bg-secondary)' : booking === doc._id ? 'var(--border)' : 'var(--primary)',
                        color: !doc.availableSlots?.some((s) => !s.isBooked && (s.consultationType || 'ONLINE') === 'ONLINE') ? 'var(--text-muted)' : '#fff',
                        border: 'none', cursor: !doc.availableSlots?.some((s) => !s.isBooked && (s.consultationType || 'ONLINE') === 'ONLINE') ? 'not-allowed' : 'pointer',
                        fontWeight: 700, fontSize: 12,
                        transition: 'all 0.2s',
                      }}
                    >
                      {booking === doc._id ? 'Booking...' : 'Book Online'}
                    </button>
                  </div>
                  <div style={{ marginTop: 10, fontSize: 12, color: available ? 'var(--primary-dark)' : 'var(--text-muted)', fontWeight: 600 }}>
                    {available ? '● Slots available' : '○ No open slots right now'}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button onClick={() => navigate('/patient/dashboard')} style={{ marginTop: 28, background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          ← Back to Dashboard
        </button>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

