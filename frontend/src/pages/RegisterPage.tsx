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
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* Left decorative panel */}
      <div
        className="hidden lg:flex flex-col justify-center w-[42%] p-12"
        style={{
          background: 'linear-gradient(145deg, #059669 0%, #047857 50%, #065F46 100%)',
          position: 'relative', overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', width: 350, height: 350, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', top: -80, right: -80 }} />
        <div style={{ position: 'absolute', width: 250, height: 250, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', bottom: 40, left: -60 }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="flex items-center gap-3 mb-10">
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🏥</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 20 }}>SmartCare</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Healthcare Platform</div>
            </div>
          </div>

          <h1 style={{ color: '#fff', fontSize: 36, fontWeight: 800, lineHeight: 1.2, marginBottom: 16 }}>
            Your health journey<br />
            <span style={{ color: '#6EE7B7' }}>starts here.</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15, lineHeight: 1.6, marginBottom: 40 }}>
            Join thousands of patients and doctors who trust SmartCare for quality healthcare.
          </p>

          <div className="flex flex-col gap-3">
            {[
              { num: '10k+', label: 'Active Patients' },
              { num: '500+', label: 'Verified Doctors' },
              { num: '99.9%', label: 'Uptime SLA' },
            ].map((s) => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '14px 18px', border: '1px solid rgba(255,255,255,0.12)' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{s.num}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div style={{ width: '100%', maxWidth: 440 }}>
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏥</div>
            <span style={{ fontWeight: 700, fontSize: 20, color: '#059669' }}>SmartCare</span>
          </div>

          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>Create your account</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Fill in your details below to get started</p>
          </div>

          {/* Role selector tabs */}
          <div style={{ backgroundColor: '#EEF2F8', borderRadius: 10, padding: 4, display: 'flex', gap: 4, marginBottom: 24 }}>
            {[
              { val: 'patient', icon: '👤', label: 'Patient' },
              { val: 'doctor', icon: '👨‍⚕️', label: 'Doctor' },
            ].map((r) => (
              <button
                key={r.val}
                type="button"
                onClick={() => update('role', r.val)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                  cursor: 'pointer', fontSize: 14, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: form.role === r.val ? '#fff' : 'transparent',
                  color: form.role === r.val ? 'var(--medical-blue)' : 'var(--text-secondary)',
                  boxShadow: form.role === r.val ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {r.icon} {r.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Full Name</label>
              <input
                type="text" required value={form.name} onChange={(e) => update('name', e.target.value)}
                placeholder="Dr. John Smith"
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, background: '#fff', color: 'var(--text-primary)', outline: 'none' }}
                onFocus={(e) => (e.target.style.borderColor = '#059669')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Email address</label>
              <input
                type="email" required value={form.email} onChange={(e) => update('email', e.target.value)}
                placeholder="you@example.com"
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, background: '#fff', color: 'var(--text-primary)', outline: 'none' }}
                onFocus={(e) => (e.target.style.borderColor = '#059669')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Password</label>
              <input
                type="password" required minLength={8} value={form.password} onChange={(e) => update('password', e.target.value)}
                placeholder="Min. 8 characters"
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, background: '#fff', color: 'var(--text-primary)', outline: 'none' }}
                onFocus={(e) => (e.target.style.borderColor = '#059669')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>

            {/* Password strength */}
            {form.password && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1, height: 4, borderRadius: 2,
                        background: i <= passwordStrength.score ? passwordStrength.color : 'var(--border)',
                        transition: 'background 0.3s',
                      }}
                    />
                  ))}
                </div>
                <div style={{ fontSize: 11, color: passwordStrength.color, fontWeight: 600 }}>
                  {passwordStrength.label}
                </div>
              </div>
            )}

            {error && (
              <div style={{ background: 'var(--medical-red-light)', border: '1px solid #FCA5A5', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 8 }}>
                <span style={{ flexShrink: 0 }}>⚠️</span>
                <p style={{ color: 'var(--medical-red)', fontSize: 13 }}>{error}</p>
              </div>
            )}

            {success && (
              <div style={{ background: 'var(--medical-green-light)', border: '1px solid #6EE7B7', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 8 }}>
                <span style={{ flexShrink: 0 }}>✅</span>
                <p style={{ color: 'var(--medical-green)', fontSize: 13, fontWeight: 500 }}>{success} Redirecting...</p>
              </div>
            )}

            {form.role === 'doctor' && (
              <div style={{ background: '#FFF8E1', border: '1px solid #FFD54F', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
                <p style={{ color: '#B45309', fontSize: 12 }}>ℹ️ Doctor accounts require admin verification before you can log in.</p>
              </div>
            )}

            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: '13px 24px',
                background: loading ? '#6EE7B7' : '#059669',
                color: '#fff', border: 'none', borderRadius: 10,
                fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: loading ? 'none' : '0 4px 14px rgba(5,150,105,0.35)',
              }}
            >
              {loading ? 'Creating account...' : 'Create Account →'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)', marginTop: 20 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--medical-blue)', fontWeight: 600, textDecoration: 'none' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}


