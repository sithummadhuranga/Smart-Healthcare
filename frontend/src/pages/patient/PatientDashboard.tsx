import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { getCurrentUser } from '../../api';

const CARDS = [
  {
    icon: '👨‍⚕️',
    label: 'Find Doctors',
    desc: 'Browse verified specialists and book consultations',
    path: '/patient/doctors',
    accent: '#0047AB',
    bg: '#EFF6FF',
    border: '#BFDBFE',
  },
  {
    icon: '📅',
    label: 'My Appointments',
    desc: 'Track upcoming and past appointment history',
    path: '/patient/appointments',
    accent: '#059669',
    bg: '#ECFDF5',
    border: '#A7F3D0',
  },
  {
    icon: '✦',
    label: 'AI Symptom Checker',
    desc: 'Describe symptoms and get an instant specialist recommendation',
    path: '/patient/symptom-checker',
    accent: '#7C3AED',
    bg: '#F5F3FF',
    border: '#DDD6FE',
  },
  {
    icon: '💊',
    label: 'Prescriptions',
    desc: 'View and download your prescription records',
    path: '/patient/prescriptions',
    accent: '#D97706',
    bg: '#FFFBEB',
    border: '#FCD34D',
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
    <div style={{ minHeight: '100vh', background: '#F0F4F8' }}>
      <Navbar />

      {/* Hero header */}
      <div style={{ background: 'linear-gradient(135deg, #0047AB 0%, #0891B2 100%)', padding: '40px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, marginBottom: 6 }}>
            {getTimeOfDay()},
          </p>
          <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.4px' }}>
            {user?.name ?? 'Patient'} 👋
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 6 }}>
            Your health dashboard — everything in one place.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 20, letterSpacing: '-0.2px' }}>
          What would you like to do today?
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {CARDS.map((card) => (
            <button
              key={card.path}
              onClick={() => navigate(card.path)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                gap: 12, padding: '24px 22px', borderRadius: 14,
                background: card.bg, border: `1.5px solid ${card.border}`,
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                boxShadow: 'none',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: card.accent, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 22,
                boxShadow: `0 4px 12px ${card.accent}33`,
              }}>
                {card.icon}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', marginBottom: 4 }}>{card.label}</div>
                <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>{card.desc}</div>
              </div>
              <div style={{ fontSize: 12, color: card.accent, fontWeight: 600, marginTop: 4 }}>
                Open →
              </div>
            </button>
          ))}
        </div>

        {/* Quick info banner */}
        <div style={{
          marginTop: 32, background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0',
          padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 14,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <div style={{ fontSize: 24 }}>💡</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#0F172A' }}>Try the AI Symptom Checker</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              Describe your symptoms in plain English — our AI will recommend the right specialist for you.
            </div>
          </div>
          <button
            onClick={() => navigate('/patient/symptom-checker')}
            style={{
              marginLeft: 'auto', padding: '8px 16px', borderRadius: 8, flexShrink: 0,
              background: '#7C3AED', color: '#fff', border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: 12,
            }}
          >
            Try Now
          </button>
        </div>
      </div>
    </div>
  );
}

