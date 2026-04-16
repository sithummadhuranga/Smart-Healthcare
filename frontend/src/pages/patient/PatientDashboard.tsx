import { useNavigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import Navbar from '../../components/Navbar';

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

export default function PatientDashboard() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <Navbar />

      {/* ═══════ Hero — Full-width split layout with large doctor image ═══════ */}
      <section style={{
        position: 'relative', overflow: 'hidden',
        background: '#fff',
        minHeight: 560,
      }}>
        {/* Soft abstract shapes in background */}
        <div style={{ position: 'absolute', top: -100, right: -100, width: 600, height: 600, background: 'rgba(20, 184, 166, 0.05)', borderRadius: '50%', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: -50, left: -50, width: 400, height: 400, background: 'rgba(13, 148, 136, 0.05)', borderRadius: '50%', filter: 'blur(60px)' }} />
        {/* Subtle grid pattern */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.4, backgroundImage: 'radial-gradient(circle, var(--border) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', minHeight: 560 }}>
          {/* Left text — takes 55% */}
          <div style={{ flex: '1 1 55%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 20px 40px 40px', minWidth: 0, marginTop: 40 }}>
            <div style={{
              background: 'var(--primary-50)', color: 'var(--primary-dark)',
              display: 'inline-flex', padding: '6px 16px', borderRadius: 20, marginBottom: 20, alignItems: 'center', gap: 6, width: 'fit-content',
            }}>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><path d="M22 4L12 14.01l-3-3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.5px' }}>Top Healthcare Platform</span>
            </div>

            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 52, fontWeight: 800, color: 'var(--text-primary)',
              lineHeight: 1.1, letterSpacing: '-1.5px', marginBottom: 20,
            }}>
              Find the right doctor <span style={{ display: 'block', color: 'var(--primary)' }}>right at your fingertips</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 17, lineHeight: 1.7, maxWidth: 500, marginBottom: 32, fontWeight: 400 }}>
              Book appointments with top-rated specialists, chat with our AI symptom checker, and manage your health seamlessly.
            </p>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 40 }}>
              <button
                onClick={() => navigate('/patient/doctors')}
                style={{
                  padding: '16px 36px', borderRadius: 50,
                  background: 'var(--primary)', color: '#fff',
                  border: 'none', fontSize: 15, fontWeight: 700,
                  cursor: 'pointer', boxShadow: '0 8px 24px rgba(20, 184, 166, 0.25)',
                  display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
              >
                Find a Doctor
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <button
                onClick={() => navigate('/patient/symptom-checker')}
                style={{
                  padding: '16px 36px', borderRadius: 50,
                  background: '#fff',
                  color: 'var(--text-primary)', border: '1px solid var(--border)',
                  fontSize: 15, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
              >
                AI Symptom Check
              </button>
            </div>

            {/* User Avatars / Social Proof */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ display: 'flex', marginLeft: 10 }}>
                {['#cbd5e1', '#94a3b8', '#64748b', '#475569'].map((bg, i) => (
                  <div key={i} style={{
                    width: 38, height: 38, borderRadius: '50%', background: bg,
                    border: '2px solid #fff', marginLeft: -12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 12, fontWeight: 600,
                  }}>
                    {i === 3 ? '+2k' : ''}
                  </div>
                ))}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 2 }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <svg key={s} width="14" height="14" fill="#FBBF24" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                  ))}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
                  <strong style={{ color: 'var(--text-primary)' }}>4.9/5</strong> from 50,000+ patients
                </div>
              </div>
            </div>
          </div>

          {/* Right — Large hero doctors image */}
          <div className="hidden-mobile" style={{
            flex: '1 1 45%', position: 'relative', minWidth: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%'
          }}>
            {/* Decorative background shape for the image */}
            <div style={{ position: 'absolute', right: '5%', bottom: '5%', width: '80%', height: '80%', background: 'linear-gradient(180deg, var(--primary-100) 0%, rgba(255,255,255,0) 100%)', borderRadius: '40px 40px 0 0', zIndex: 1, borderTop: '1px solid var(--border)' }} />
            
            {/* Hero image */}
            <img
              src="/hero-doctors.svg"
              alt="Healthcare professionals"
              style={{
                width: '100%', maxWidth: 500, height: '100%', maxHeight: 600,
                objectFit: 'contain', objectPosition: 'bottom center',
                position: 'relative', zIndex: 2,
                marginTop: 40,
              }}
            />
            
            {/* Floating Elements / Cards like the screenshot */}
            <div className="animate-float" style={{ position: 'absolute', top: '15%', left: '0%', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', borderRadius: 16, padding: '12px 16px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 12, zIndex: 3, border: '1px solid rgba(255,255,255,0.5)' }}>
               <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
               </div>
               <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>15 mins</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Avg. wait time</div>
               </div>
            </div>

            <div className="animate-float" style={{ position: 'absolute', bottom: '20%', right: '-5%', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', borderRadius: 16, padding: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: 8, zIndex: 3, border: '1px solid rgba(255,255,255,0.5)', animationDelay: '1.5s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Verified Pros</div>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)' }}>200+</div>
            </div>
          </div>
        </div>

        {/* Removed Wave separator to match a clean modern layout */}
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

