import { useState } from 'react';
import type { ReactElement } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api, { clearSession, getCurrentUser } from '../api';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

/* Clean minimal SVG icons — replaces emoji icons */
const ICONS: Record<string, ReactElement> = {
  dashboard: <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/></svg>,
  doctors: <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  calendar: <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  ai: <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>,
  pill: <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M10.5 1.5l-8 8a4.95 4.95 0 007 7l8-8a4.95 4.95 0 00-7-7zM2.5 13.5l7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  clipboard: <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M9 2h6v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V2z" stroke="currentColor" strokeWidth="1.8"/><path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  edit: <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>,
  users: <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  verify: <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/></svg>,
  profile: <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M20 21a8 8 0 10-16 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  report: <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  schedule: <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

const NAV: Record<string, NavItem[]> = {
  patient: [
    { label: 'Dashboard', href: '/patient/dashboard', icon: 'dashboard' },
    { label: 'Find Doctors', href: '/patient/doctors', icon: 'doctors' },
    { label: 'Appointments', href: '/patient/appointments', icon: 'calendar' },
    { label: 'AI Checker', href: '/patient/symptom-checker', icon: 'ai' },
    { label: 'Prescriptions', href: '/patient/prescriptions', icon: 'pill' },
    { label: 'Reports', href: '/patient/reports', icon: 'report' },
  ],
  doctor: [
    { label: 'Dashboard', href: '/doctor/dashboard', icon: 'dashboard' },
    { label: 'Appointments', href: '/doctor/appointments', icon: 'clipboard' },
    { label: 'Schedule', href: '/doctor/schedule', icon: 'schedule' },
    { label: 'Prescriptions', href: '/doctor/prescriptions', icon: 'edit' },
    { label: 'Profile', href: '/doctor/profile', icon: 'profile' },
  ],
  admin: [
    { label: 'Dashboard', href: '/admin/dashboard', icon: 'dashboard' },
    { label: 'Users', href: '/admin/users', icon: 'users' },
    { label: 'Verify Doctors', href: '/admin/doctors', icon: 'verify' },
    { label: 'Appointments', href: '/admin/appointments', icon: 'calendar' },
    { label: 'Payments', href: '/admin/payments', icon: 'pill' },
  ],
};

function getNavGroups(role: string, links: NavItem[]): { primary: NavItem[]; utility: NavItem[] } {
  if (role === 'patient') {
    return {
      primary: links,
      utility: [],
    };
  }

  return { primary: links, utility: [] };
}

function getDropdownLinks(role: string): NavItem[] {
  if (role === 'patient') {
    return [
      { label: 'History', href: '/patient/history', icon: 'clipboard' },
      { label: 'Profile', href: '/patient/profile', icon: 'profile' },
    ];
  }

  return [];
}

const ROLE_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  patient: { bg: 'var(--primary-light)', color: 'var(--primary-dark)', label: 'Patient' },
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
  const navGroups = user ? getNavGroups(user.role, links) : { primary: [], utility: [] };
  const dropdownLinks = user ? getDropdownLinks(user.role) : [];
  const badge = user ? (ROLE_BADGE[user.role] ?? ROLE_BADGE.patient) : null;
  const initials = user?.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() ?? 'U';

  function renderNavLink(link: NavItem, compact = false) {
    const active = location.pathname === link.href;

    return (
      <Link key={link.href} to={link.href} style={{
        display: 'flex', alignItems: 'center', gap: compact ? 4 : 5,
        padding: compact ? '6px 10px' : '6px 11px', borderRadius: 8, textDecoration: 'none',
        fontSize: compact ? 12 : 12.5, fontWeight: active ? 600 : 500,
        color: active ? 'var(--primary-dark)' : 'var(--text-secondary)',
        background: active ? 'var(--primary-50)' : 'transparent',
        transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)', whiteSpace: 'nowrap',
        letterSpacing: '-0.1px', flexShrink: 0,
      }}>
        <span style={{ display: 'flex', color: active ? 'var(--primary)' : 'var(--text-muted)' }}>{ICONS[link.icon]}</span>
        {link.label}
      </Link>
    );
  }

  async function logout() {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // Local cleanup is still sufficient for UI sign-out.
    }

    clearSession();
    navigate('/login');
  }

  return (
    <>
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(226,232,240,0.6)',
      }}>
        <div style={{
          maxWidth: 1280, margin: '0 auto', padding: '0 24px',
          height: 60, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {/* Brand */}
          <Link to={user ? `/${user.role}/dashboard` : '/login'} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginRight: 16, flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" fill="#fff" opacity="0.9"/><path d="M2 17l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 12l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              Smart<span style={{ color: 'var(--primary)' }}>Care</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }} className="hidden-mobile">
            <nav style={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, justifyContent: 'flex-start', overflowX: 'auto', overflowY: 'hidden', minWidth: 0, scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {navGroups.primary.map((link) => renderNavLink(link))}
            </nav>

            {navGroups.utility.length > 0 && (
              <nav style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, paddingLeft: 10, borderLeft: '1px solid var(--border)' }}>
                {navGroups.utility.map((link) => renderNavLink(link, true))}
              </nav>
            )}
          </div>

          {/* Right side */}
          <div style={{ marginLeft: 8, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {user && badge && (
              <>
                {/* Role badge — pill style like Medico */}
                <span style={{
                  background: badge.bg, color: badge.color,
                  fontSize: 11, fontWeight: 700,
                  padding: '4px 12px', borderRadius: 20,
                  letterSpacing: '0.4px',
                }} className="hidden-mobile">
                  {badge.label.toUpperCase()}
                </span>

                {/* Avatar dropdown */}
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setOpen(!open)} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '5px 12px 5px 5px', borderRadius: 24,
                    border: '1.5px solid var(--border)', background: 'none', cursor: 'pointer',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'var(--primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 12, fontWeight: 700,
                    }}>
                      {initials}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} className="hidden-mobile">{user.name}</span>
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className="hidden-mobile"><path d="M1 1l4 4 4-4" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </button>

                  {open && (
                    <div style={{ position: 'absolute', right: 0, top: '115%', background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(20px)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: 'var(--shadow-lg)', minWidth: 220, padding: 8, zIndex: 200 }}>
                      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-light)', marginBottom: 4 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>{user.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{user.email}</div>
                        <span style={{ marginTop: 6, display: 'inline-block', background: badge.bg, color: badge.color, fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 10, letterSpacing: '0.3px' }}>{badge.label.toUpperCase()}</span>
                      </div>
                      {dropdownLinks.length > 0 && (
                        <div style={{ padding: '4px 0', marginBottom: 4 }}>
                          {dropdownLinks.map((link) => {
                            const active = location.pathname === link.href;

                            return (
                              <Link
                                key={link.href}
                                to={link.href}
                                onClick={() => setOpen(false)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 8,
                                  padding: '10px 14px', borderRadius: 8,
                                  textDecoration: 'none', fontSize: 13, fontWeight: active ? 600 : 500,
                                  color: active ? 'var(--primary-dark)' : 'var(--text-primary)',
                                  background: active ? 'var(--primary-50)' : 'transparent',
                                }}
                              >
                                <span style={{ display: 'flex', color: active ? 'var(--primary)' : 'var(--text-muted)' }}>{ICONS[link.icon]}</span>
                                {link.label}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                      <button onClick={logout} style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'var(--medical-red)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>⎋</span> Sign Out
                      </button>
                    </div>
                  )}
                </div>

                {/* Mobile hamburger */}
                <button onClick={() => setMobileOpen(!mobileOpen)} className="show-mobile" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--text-secondary)' }}>
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M3 6h18M3 12h18M3 18h18"/></svg>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="show-mobile" style={{ borderTop: '1px solid var(--border)', background: '#fff', padding: '8px 12px 12px' }}>
            {links.map((l) => (
              <Link key={l.href} to={l.href} onClick={() => setMobileOpen(false)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10,
                textDecoration: 'none', fontSize: 14, fontWeight: 500, marginBottom: 2,
                color: location.pathname === l.href ? 'var(--primary-dark)' : 'var(--text-primary)',
                background: location.pathname === l.href ? 'var(--primary-50)' : 'transparent',
              }}>
                <span style={{ display: 'flex', color: location.pathname === l.href ? 'var(--primary)' : 'var(--text-muted)' }}>{ICONS[l.icon]}</span>{l.label}
              </Link>
            ))}
            <div style={{ borderTop: '1px solid var(--bg-secondary)', marginTop: 8, paddingTop: 8 }}>
              <button onClick={logout} style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, color: 'var(--medical-red)', fontWeight: 500 }}>
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
