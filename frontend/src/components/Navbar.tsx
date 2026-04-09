import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../api';

const NAV: Record<string, { label: string; href: string; emoji: string }[]> = {
  patient: [
    { label: 'Dashboard', href: '/patient/dashboard', emoji: '◉' },
    { label: 'Find Doctors', href: '/patient/doctors', emoji: '👨‍⚕️' },
    { label: 'Appointments', href: '/patient/appointments', emoji: '📅' },
    { label: 'AI Checker', href: '/patient/symptom-checker', emoji: '✦' },
    { label: 'Prescriptions', href: '/patient/prescriptions', emoji: '💊' },
  ],
  doctor: [
    { label: 'Dashboard', href: '/doctor/dashboard', emoji: '◉' },
    { label: 'Appointments', href: '/doctor/appointments', emoji: '📋' },
    { label: 'Prescriptions', href: '/doctor/prescriptions', emoji: '✏️' },
  ],
  admin: [
    { label: 'Dashboard', href: '/admin/dashboard', emoji: '◉' },
    { label: 'Users', href: '/admin/users', emoji: '👥' },
    { label: 'Verify Doctors', href: '/admin/doctors', emoji: '✔️' },
  ],
};

const ROLE_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  patient: { bg: '#EFF6FF', color: '#1D4ED8', label: 'Patient' },
  doctor: { bg: '#ECFDF5', color: '#065F46', label: 'Doctor' },
  admin: { bg: '#F5F3FF', color: '#4C1D95', label: 'Admin' },
};

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = user ? (NAV[user.role] ?? []) : [];
  const badge = user ? (ROLE_BADGE[user.role] ?? ROLE_BADGE.patient) : null;
  const initials = user?.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() ?? 'U';

  function logout() {
    localStorage.clear();
    navigate('/login');
  }

  return (
    <>
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: '#fff',
        borderBottom: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        <div style={{
          maxWidth: 1280, margin: '0 auto', padding: '0 20px',
          height: 60, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {/* Logo */}
          <Link to={user ? `/${user.role}/dashboard` : '/login'} style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', marginRight: 24, flexShrink: 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'linear-gradient(135deg,#0047AB,#0891B2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>🏥</div>
            <span style={{ fontWeight: 800, fontSize: 17, color: '#0047AB', letterSpacing: '-0.4px' }}>
              Smart<span style={{ color: '#0891B2' }}>Care</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, overflow: 'hidden' }} className="hidden-mobile">
            {links.map((l) => {
              const active = location.pathname === l.href;
              return (
                <Link key={l.href} to={l.href} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 7, textDecoration: 'none',
                  fontSize: 13, fontWeight: active ? 600 : 500,
                  color: active ? '#0047AB' : '#64748B',
                  background: active ? '#EFF6FF' : 'transparent',
                  transition: 'all 0.15s', whiteSpace: 'nowrap',
                }}>
                  <span style={{ fontSize: 12 }}>{l.emoji}</span>
                  {l.label}
                </Link>
              );
            })}
          </nav>

          {/* Right */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            {user && badge && (
              <>
                {/* Role badge */}
                <span style={{ background: badge.bg, color: badge.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, letterSpacing: '0.4px' }} className="hidden-mobile">
                  {badge.label.toUpperCase()}
                </span>

                {/* Avatar dropdown */}
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setOpen(!open)} style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '5px 10px 5px 6px', borderRadius: 9,
                    border: '1.5px solid #E2E8F0', background: 'none', cursor: 'pointer',
                  }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg,#0047AB,#0891B2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>
                      {initials}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} className="hidden-mobile">{user.name}</span>
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className="hidden-mobile"><path d="M1 1l4 4 4-4" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </button>

                  {open && (
                    <div style={{ position: 'absolute', right: 0, top: '115%', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 210, padding: 8, zIndex: 200 }}>
                      <div style={{ padding: '10px 12px 10px', borderBottom: '1px solid #F1F5F9', marginBottom: 4 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#0F172A' }}>{user.name}</div>
                        <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{user.email}</div>
                        <span style={{ marginTop: 6, display: 'inline-block', background: badge.bg, color: badge.color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>{badge.label.toUpperCase()}</span>
                      </div>
                      <button onClick={logout} style={{ width: '100%', textAlign: 'left', padding: '9px 12px', background: 'none', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span>⎋</span> Sign Out
                      </button>
                    </div>
                  )}
                </div>

                {/* Mobile hamburger */}
                <button onClick={() => setMobileOpen(!mobileOpen)} className="show-mobile" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#475569' }}>
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M3 6h18M3 12h18M3 18h18"/></svg>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="show-mobile" style={{ borderTop: '1px solid #E2E8F0', background: '#fff', padding: '8px 12px 12px' }}>
            {links.map((l) => (
              <Link key={l.href} to={l.href} onClick={() => setMobileOpen(false)} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8,
                textDecoration: 'none', fontSize: 14, fontWeight: 500, marginBottom: 2,
                color: location.pathname === l.href ? '#0047AB' : '#334155',
                background: location.pathname === l.href ? '#EFF6FF' : 'transparent',
              }}>
                <span>{l.emoji}</span>{l.label}
              </Link>
            ))}
            <div style={{ borderTop: '1px solid #F1F5F9', marginTop: 8, paddingTop: 8 }}>
              <button onClick={logout} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, color: '#DC2626', fontWeight: 500 }}>
                ⎋ Sign Out
              </button>
            </div>
          </div>
        )}
      </header>
      {open && <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setOpen(false)} />}
    </>
  );
}
