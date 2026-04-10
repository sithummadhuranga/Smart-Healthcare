import { useNavigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import Navbar from '../../components/Navbar';
import { getCurrentUser } from '../../api';

/* ─── Service card icons (clean SVGs) ───────────────────────── */
const CARD_ICONS: Record<string, ReactElement> = {
  appointment: <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M20 21a8 8 0 10-16 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M16 1v3M8 1v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  calendar: <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="16" r="1" fill="currentColor"/></svg>,
  ai: <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>,
  rx: <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path d="M10.5 1.5l-8 8a4.95 4.95 0 007 7l8-8a4.95 4.95 0 00-7-7zM2.5 13.5l7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
};

const CARDS = [
  {
    icon: 'appointment',
    label: 'Make an Appointment',
    desc: 'Browse verified specialists and book consultations instantly',
    path: '/patient/doctors',
    accent: true,
  },
  {
    icon: 'calendar',
    label: 'My Appointments',
    desc: 'Track upcoming and past appointment history in one place',
    path: '/patient/appointments',
    accent: false,
  },
  {
    icon: 'ai',
    label: 'AI Symptom Checker',
    desc: 'Describe symptoms and get an instant specialist recommendation',
    path: '/patient/symptom-checker',
    accent: false,
  },
  {
    icon: 'rx',
    label: 'Prescriptions',
    desc: 'View and download your prescription records securely',
    path: '/patient/prescriptions',
    accent: false,
  },
];

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function PatientDashboard() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <Navbar />

      {/* ═══════ Hero — Modern 2026 white-bg spread layout ═══════ */}
      <section style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(180deg, #fff 0%, var(--primary-50) 100%)',
        padding: '48px 24px 0',
      }}>
        {/* Subtle grid pattern */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.3, backgroundImage: 'radial-gradient(circle, var(--border) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          {/* Top pill badge */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <span style={{
              background: 'var(--primary-light)', color: 'var(--primary-dark)',
              padding: '8px 20px', borderRadius: 24,
              fontSize: 13, fontWeight: 600, letterSpacing: '0.3px',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M22 4L12 14.01l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Trusted by 50,000+ patients worldwide
            </span>
          </div>

          {/* Main heading — centered, large, modern */}
          <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto', marginBottom: 32 }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 12, fontWeight: 500 }}>
              {getTimeOfDay()}, {user?.name ?? 'Patient'}
            </p>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 48, fontWeight: 800, color: 'var(--text-primary)',
              lineHeight: 1.12, letterSpacing: '-1px', marginBottom: 20,
            }}>
              Discover the{' '}
              <span style={{ color: 'var(--primary)' }}>Comprehensive Care</span>
              {' '}You Deserve
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1.7, maxWidth: 540, margin: '0 auto 32px', fontWeight: 400 }}>
              Book appointments, get AI-powered health recommendations, manage prescriptions — your complete healthcare platform.
            </p>

            {/* CTA buttons — pill style */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/patient/doctors')}
                style={{
                  padding: '14px 32px', borderRadius: 50,
                  background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
                  color: '#fff', border: 'none',
                  fontSize: 15, fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-teal)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                Find a Doctor
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <button
                onClick={() => navigate('/patient/symptom-checker')}
                style={{
                  padding: '14px 32px', borderRadius: 50,
                  background: 'transparent',
                  color: 'var(--text-primary)', border: '2px solid var(--border)',
                  fontSize: 15, fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                AI Symptom Check
              </button>
            </div>
          </div>

          {/* Hero image with floating badges */}
          <div style={{ position: 'relative', maxWidth: 800, margin: '0 auto', marginTop: 16 }}>
            {/* Floating badge — top left */}
            <div className="hidden-mobile animate-float" style={{
              position: 'absolute', top: 20, left: -20,
              background: '#fff', borderRadius: 16, padding: '12px 18px',
              boxShadow: 'var(--shadow-lg)', zIndex: 3,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="var(--primary)" strokeWidth="2"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>50K+</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Active Users</div>
              </div>
            </div>

            {/* Floating badge — top right */}
            <div className="hidden-mobile animate-float" style={{
              position: 'absolute', top: 30, right: -10,
              background: '#fff', borderRadius: 16, padding: '12px 18px',
              boxShadow: 'var(--shadow-lg)', zIndex: 3,
              display: 'flex', alignItems: 'center', gap: 8,
              animationDelay: '1s',
            }}>
              <div style={{ display: 'flex', gap: 2 }}>
                {[1,2,3,4,5].map(i => (
                  <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg>
                ))}
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>4.9</span>
            </div>

            {/* Floating badge — bottom left */}
            <div className="hidden-mobile animate-float" style={{
              position: 'absolute', bottom: 60, left: -30,
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
              borderRadius: 14, padding: '14px 20px',
              boxShadow: 'var(--shadow-teal)', zIndex: 3,
              animationDelay: '0.5s',
            }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 500, marginBottom: 2 }}>Specialist Available</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>Book Now</div>
            </div>

            {/* Hero image */}
            <div style={{
              borderRadius: '24px 24px 0 0', overflow: 'hidden',
              background: 'linear-gradient(180deg, transparent 0%, var(--primary-50) 100%)',
              position: 'relative',
            }}>
              <img
                src="/hero-doctors.svg"
                alt="Healthcare professionals"
                style={{
                  width: '100%', height: 'auto', maxHeight: 420,
                  objectFit: 'cover', objectPosition: 'center top',
                  display: 'block',
                }}
              />
              {/* Fade at bottom */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(transparent, var(--bg))' }} />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ Services Section — Modern Cards ═══════ */}
      <section style={{ background: 'var(--bg)', padding: '48px 24px 56px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <span style={{
                display: 'inline-block', background: 'var(--primary-light)', color: 'var(--primary-dark)',
                padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                letterSpacing: '0.5px', marginBottom: 12,
              }}>
                SERVICES
              </span>
              <h2 style={{ fontSize: 30, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                What We Offer
              </h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, maxWidth: 320, lineHeight: 1.6 }}>
              Complete healthcare enrollment and management services at your fingertips.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 18 }}>
            {CARDS.map((card) => (
              <button
                key={card.path}
                onClick={() => navigate(card.path)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                  gap: 16, padding: '28px 24px', borderRadius: 20,
                  background: card.accent ? 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)' : '#fff',
                  border: card.accent ? 'none' : '1px solid var(--border)',
                  cursor: 'pointer', textAlign: 'left',
                  boxShadow: card.accent ? 'var(--shadow-teal)' : 'var(--shadow-xs)',
                  position: 'relative', overflow: 'hidden',
                  minHeight: 210, transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = card.accent ? '0 16px 40px rgba(20,184,166,0.3)' : 'var(--shadow-md)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.boxShadow = card.accent ? 'var(--shadow-teal)' : 'var(--shadow-xs)';
                }}
              >
                {/* Decorative bg for accent card */}
                {card.accent && (
                  <>
                    <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
                    <div style={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                  </>
                )}
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: card.accent ? 'rgba(255,255,255,0.15)' : 'var(--primary-50)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: card.accent ? '#fff' : 'var(--primary)',
                  position: 'relative', zIndex: 1,
                }}>
                  {CARD_ICONS[card.icon]}
                </div>
                <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: card.accent ? '#fff' : 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.2px' }}>{card.label}</div>
                  <div style={{ fontSize: 13.5, color: card.accent ? 'rgba(255,255,255,0.75)' : 'var(--text-secondary)', lineHeight: 1.55 }}>{card.desc}</div>
                </div>
                {/* Arrow indicator */}
                <div style={{
                  position: 'absolute', right: 16, bottom: 16,
                  width: 32, height: 32, borderRadius: 10,
                  background: card.accent ? 'rgba(255,255,255,0.15)' : 'var(--primary-50)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: card.accent ? '#fff' : 'var(--primary)',
                }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M7 17L17 7M17 7H7M17 7v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              </button>
            ))}
          </div>

          {/* Quick info banner */}
          <div style={{
            marginTop: 32, background: '#fff', borderRadius: 20,
            border: '1px solid var(--border)',
            padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 18,
            boxShadow: 'var(--shadow-xs)',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l.146.353a3.486 3.486 0 01-7.363 0l.145-.353z" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>Try the AI Symptom Checker</div>
              <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>
                Describe your symptoms in plain English — our AI will recommend the right specialist for you.
              </div>
            </div>
            <button
              onClick={() => navigate('/patient/symptom-checker')}
              style={{
                marginLeft: 'auto', padding: '11px 24px', borderRadius: 12, flexShrink: 0,
                background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: 14, boxShadow: 'var(--shadow-teal)',
              }}
            >
              Try Now
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

