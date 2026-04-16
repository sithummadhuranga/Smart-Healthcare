import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { parseToken } from '../api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      const token: string = data.accessToken;
      localStorage.setItem('token', token);
      const claims = parseToken(token);
      if (!claims) throw new Error('Invalid token received');
      const redirects: Record<string, string> = {
        patient: '/patient/dashboard',
        doctor: '/doctor/dashboard',
        admin: '/admin/dashboard',
      };
      navigate(redirects[claims.role] ?? '/login');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Login failed. Please check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#fff' }}>
      {/* Left panel — modern gradient hero */}
      <div
        className="hidden lg:flex flex-col w-[48%]"
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(160deg, #0D9488 0%, #14B8A6 40%, #2DD4BF 100%)',
          padding: '40px 48px',
        }}
      >
        {/* Decorative elements */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', top: '30%', left: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', bottom: '20%', right: '10%', width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

        {/* Brand */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: '#fff', letterSpacing: '-0.5px' }}>
            Smart<span style={{ opacity: 0.8 }}>Care</span>
          </span>
        </div>

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 420 }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', display: 'inline-flex', padding: '6px 16px', borderRadius: 20, marginBottom: 24, width: 'fit-content' }}>
            <span style={{ color: '#fff', fontSize: 12, fontWeight: 600, letterSpacing: '0.5px' }}>TRUSTED HEALTHCARE PLATFORM</span>
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 38, fontWeight: 800, color: '#fff',
            lineHeight: 1.15, marginBottom: 16, letterSpacing: '-0.5px',
          }}>
            Your Health,{'\n'}Our Priority
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 1.7, marginBottom: 36, fontWeight: 400 }}>
            Access world-class healthcare services, connect with expert doctors, and manage your wellness journey — all from one platform.
          </p>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 32 }}>
            {[
              { value: '50K+', label: 'Active Users' },
              { value: '200+', label: 'Doctors' },
              { value: '4.9', label: 'Rating' },
            ].map((s) => (
              <div key={s.label}>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 500, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Hero doctors image — subtle behind the text */}
        <div style={{
          position: 'absolute', right: 0, bottom: 0,
          width: '100%', height: '65%',
          zIndex: 1, opacity: 0.12, pointerEvents: 'none',
        }}>
          <img
            src="/hero-doctors.svg"
            alt=""
            style={{
              width: '100%', height: '100%',
              objectFit: 'contain', objectPosition: 'bottom right',
            }}
          />
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" fill="#fff" opacity="0.9"/><path d="M2 17l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><path d="M2 12l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--text-primary)' }}>Smart<span style={{ color: 'var(--primary)' }}>Care</span></span>
          </div>

          <div style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.5px' }}>
              Welcome back
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15, fontWeight: 400 }}>
              Sign in to access your healthcare dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 7 }}>
                Email address
              </label>
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} width="16" height="16" fill="none" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M22 7l-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7" stroke="currentColor" strokeWidth="1.8"/></svg>
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={{
                    width: '100%', paddingLeft: 42, paddingRight: 16, paddingTop: 13, paddingBottom: 13,
                    border: `1.5px solid ${error ? '#FCA5A5' : 'var(--border)'}`,
                    borderRadius: 12, fontSize: 14, background: 'var(--bg)', color: 'var(--text-primary)',
                    outline: 'none', transition: 'all 0.2s',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(20,184,166,0.1)'; }}
                  onBlur={(e) => { e.target.style.borderColor = error ? '#FCA5A5' : 'var(--border)'; e.target.style.background = 'var(--bg)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 7 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} width="16" height="16" fill="none" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                <input
                  type={showPassword ? 'text' : 'password'} required value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  style={{
                    width: '100%', paddingLeft: 42, paddingRight: 44, paddingTop: 13, paddingBottom: 13,
                    border: `1.5px solid ${error ? '#FCA5A5' : 'var(--border)'}`,
                    borderRadius: 12, fontSize: 14, background: 'var(--bg)', color: 'var(--text-primary)',
                    outline: 'none', transition: 'all 0.2s',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(20,184,166,0.1)'; }}
                  onBlur={(e) => { e.target.style.borderColor = error ? '#FCA5A5' : 'var(--border)'; e.target.style.background = 'var(--bg)'; e.target.style.boxShadow = 'none'; }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }}>
                  {showPassword ? (
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M1 1l22 22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  ) : (
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/></svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: 'var(--medical-red-light)', border: '1px solid #FCA5A5', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" stroke="#EF4444" strokeWidth="1.8"/><path d="M12 8v4M12 16h.01" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round"/></svg>
                <p style={{ color: '#DC2626', fontSize: 13, lineHeight: 1.5, fontWeight: 500 }}>{error}</p>
              </div>
            )}

            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: '14px 24px',
                background: loading ? 'var(--text-muted)' : 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
                color: '#fff', border: 'none', borderRadius: 12,
                fontSize: 15, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginBottom: 28,
                boxShadow: loading ? 'none' : 'var(--shadow-teal)',
                letterSpacing: '-0.1px',
              }}
            >
              {loading ? (
                <>
                  <span style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.textDecoration = 'underline')}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.textDecoration = 'none')}>
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}


