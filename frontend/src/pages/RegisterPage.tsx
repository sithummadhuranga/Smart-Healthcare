import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'patient' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/register', form);
      setSuccess(data.message ?? 'Account created successfully!');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const passwordStrength = (() => {
    const p = form.password;
    if (!p) return { score: 0, label: '', color: '' };
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    const levels = [
      { score: 1, label: 'Weak', color: '#EF4444' },
      { score: 2, label: 'Fair', color: '#F59E0B' },
      { score: 3, label: 'Good', color: '#10B981' },
      { score: 4, label: 'Strong', color: '#059669' },
    ];
    return levels[score - 1] ?? levels[0];
  })();

  return (
    <div className="min-h-screen flex" style={{ background: '#fff' }}>
      {/* Left decorative panel — modern gradient */}
      <div
        className="hidden lg:flex flex-col w-[46%]"
        style={{
          position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(160deg, #0D9488 0%, #14B8A6 40%, #2DD4BF 100%)',
          padding: '40px 48px 0',
        }}
      >
        {/* Decorative elements */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', top: '40%', left: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', bottom: '15%', right: '15%', width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

        <div style={{ position: 'relative', zIndex: 2 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: '#fff', letterSpacing: '-0.5px' }}>
            Smart<span style={{ opacity: 0.8 }}>Care</span>
          </span>
        </div>

        <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 380 }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', display: 'inline-flex', padding: '6px 16px', borderRadius: 20, marginBottom: 24, width: 'fit-content' }}>
            <span style={{ color: '#fff', fontSize: 12, fontWeight: 600, letterSpacing: '0.5px' }}>START YOUR JOURNEY</span>
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 36, fontWeight: 800, color: '#fff',
            lineHeight: 1.15, marginBottom: 16, letterSpacing: '-0.5px',
          }}>
            By Your Side from Birth to Beyond
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 1.7, marginBottom: 32, fontWeight: 400 }}>
            Join thousands of patients and doctors who trust SmartCare for quality healthcare management.
          </p>

          {/* Feature pills */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round"/></svg>, title: 'AI Analysis' },
              { icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>, title: 'Video Calls' },
              { icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M10.5 1.5l-8 8a4.95 4.95 0 007 7l8-8a4.95 4.95 0 00-7-7z" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>, title: 'E-Prescriptions' },
            ].map((f) => (
              <div key={f.title} style={{
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(8px)',
                borderRadius: 12, padding: '10px 16px',
                display: 'flex', alignItems: 'center', gap: 8,
                border: '1px solid rgba(255,255,255,0.15)',
              }}>
                {f.icon}
                <span style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>{f.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hero image — bg decoration only */}
        <div style={{
          position: 'absolute', right: 0, bottom: 0, width: '50%', height: '50%',
          zIndex: 1, opacity: 0.15, pointerEvents: 'none',
        }}>
          <img src="/hero-doctors.svg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div style={{ width: '100%', maxWidth: 440 }}>
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" fill="#fff" opacity="0.9"/><path d="M2 17l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><path d="M2 12l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--text-primary)' }}>Smart<span style={{ color: 'var(--primary)' }}>Care</span></span>
          </div>

          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.5px' }}>Create your account</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 400 }}>Fill in your details below to get started</p>
          </div>

          {/* Role selector tabs */}
          <div style={{ backgroundColor: 'var(--bg)', borderRadius: 12, padding: 4, display: 'flex', gap: 4, marginBottom: 24 }}>
            {[
              { val: 'patient', label: 'Patient', icon: <svg width="15" height="15" fill="none" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/></svg> },
              { val: 'doctor', label: 'Doctor', icon: <svg width="15" height="15" fill="none" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
            ].map((r) => (
              <button key={r.val} type="button" onClick={() => update('role', r.val)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                  cursor: 'pointer', fontSize: 14, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  background: form.role === r.val ? '#fff' : 'transparent',
                  color: form.role === r.val ? 'var(--primary-dark)' : 'var(--text-secondary)',
                  boxShadow: form.role === r.val ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                }}>
                {r.icon} {r.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 7 }}>Full Name</label>
              <input type="text" required value={form.name} onChange={(e) => update('name', e.target.value)}
                placeholder="John Smith"
                style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--border)', borderRadius: 12, fontSize: 14, background: 'var(--bg)', color: 'var(--text-primary)', outline: 'none', transition: 'all 0.2s' }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(20,184,166,0.1)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'var(--bg)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 7 }}>Email address</label>
              <input type="email" required value={form.email} onChange={(e) => update('email', e.target.value)}
                placeholder="you@example.com"
                style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--border)', borderRadius: 12, fontSize: 14, background: 'var(--bg)', color: 'var(--text-primary)', outline: 'none', transition: 'all 0.2s' }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(20,184,166,0.1)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'var(--bg)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 7 }}>Password</label>
              <input type="password" required minLength={8} value={form.password} onChange={(e) => update('password', e.target.value)}
                placeholder="Min. 8 characters"
                style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--border)', borderRadius: 12, fontSize: 14, background: 'var(--bg)', color: 'var(--text-primary)', outline: 'none', transition: 'all 0.2s' }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(20,184,166,0.1)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'var(--bg)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Password strength */}
            {form.password && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= passwordStrength.score ? passwordStrength.color : 'var(--border)', transition: 'background 0.3s' }} />
                  ))}
                </div>
                <div style={{ fontSize: 11, color: passwordStrength.color, fontWeight: 600 }}>{passwordStrength.label}</div>
              </div>
            )}

            {error && (
              <div style={{ background: 'var(--medical-red-light)', border: '1px solid #FCA5A5', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" stroke="#EF4444" strokeWidth="1.8"/><path d="M12 8v4M12 16h.01" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round"/></svg>
                <p style={{ color: '#DC2626', fontSize: 13, fontWeight: 500 }}>{error}</p>
              </div>
            )}

            {success && (
              <div style={{ background: 'var(--medical-green-light)', border: '1px solid #6EE7B7', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="#059669" strokeWidth="1.8" strokeLinecap="round"/><path d="M22 4L12 14.01l-3-3" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <p style={{ color: 'var(--medical-green)', fontSize: 13, fontWeight: 500 }}>{success} Redirecting...</p>
              </div>
            )}

            {form.role === 'doctor' && (
              <div style={{ background: 'var(--medical-amber-light)', border: '1px solid #FDE68A', borderRadius: 12, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" stroke="#D97706" strokeWidth="1.8"/><path d="M12 8v4M12 16h.01" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round"/></svg>
                <p style={{ color: '#B45309', fontSize: 12, fontWeight: 500 }}>Doctor accounts require admin verification before you can log in.</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{
                width: '100%', padding: '14px 24px',
                background: loading ? 'var(--text-muted)' : 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
                color: '#fff', border: 'none', borderRadius: 12,
                fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: loading ? 'none' : 'var(--shadow-teal)',
                letterSpacing: '-0.1px',
              }}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)', marginTop: 20 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}


