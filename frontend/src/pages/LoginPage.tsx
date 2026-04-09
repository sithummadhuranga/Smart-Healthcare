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
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex flex-col justify-between w-[45%] p-12"
        style={{
          background: 'linear-gradient(145deg, #0047AB 0%, #003380 50%, #001F5C 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background circles */}
        <div
          style={{
            position: 'absolute', width: 400, height: 400,
            borderRadius: '50%', background: 'rgba(255,255,255,0.04)',
            top: -100, right: -100,
          }}
        />
        <div
          style={{
            position: 'absolute', width: 300, height: 300,
            borderRadius: '50%', background: 'rgba(255,255,255,0.04)',
            bottom: 50, left: -80,
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="flex items-center gap-3 mb-4">
            <div
              style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24,
              }}
            >
              🏥
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 20, lineHeight: 1.2 }}>
                SmartCare
              </div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Healthcare Platform</div>
            </div>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ color: '#fff', fontSize: 38, fontWeight: 800, lineHeight: 1.2, marginBottom: 16 }}>
            Modern Healthcare,<br />
            <span style={{ color: '#7DD3FC' }}>Intelligent Care.</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 16, lineHeight: 1.6, marginBottom: 48 }}>
            Connect with certified doctors, book appointments, and receive AI-powered health insights — all in one secure platform.
          </p>
          <div className="flex flex-col gap-4">
            {[
              { icon: '🤖', title: 'AI Symptom Analysis', desc: 'Powered by Google Gemini' },
              { icon: '🎥', title: 'Video Consultations', desc: 'Secure telemedicine sessions' },
              { icon: '📋', title: 'Digital Prescriptions', desc: 'Instant, secure, paperless' },
            ].map((f) => (
              <div key={f.title} className="flex items-center gap-3">
                <div
                  style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: 'rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, flexShrink: 0,
                  }}
                >
                  {f.icon}
                </div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{f.title}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '16px 20px',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontStyle: 'italic', marginBottom: 8 }}>
              "SmartCare has transformed how I manage my patients. The AI triage assistant is incredibly accurate."
            </div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 600 }}>
              Dr. Sarah Chen, Cardiology
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div style={{ width: '100%', maxWidth: 420 }}>
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div
              style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'var(--medical-blue)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20,
              }}
            >
              🏥
            </div>
            <span style={{ fontWeight: 700, fontSize: 20, color: 'var(--medical-blue)' }}>SmartCare</span>
          </div>

          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
              Welcome back
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
              Sign in to access your healthcare dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: 'block', fontSize: 13, fontWeight: 600,
                  color: 'var(--text-primary)', marginBottom: 6,
                }}
              >
                Email address
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute', left: 14, top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 16,
                  }}
                >
                  ✉
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@hospital.com"
                  style={{
                    width: '100%', paddingLeft: 42, paddingRight: 16,
                    paddingTop: 12, paddingBottom: 12,
                    border: `1.5px solid ${error ? '#FCA5A5' : 'var(--border)'}`,
                    borderRadius: 10, fontSize: 14,
                    background: '#fff', color: 'var(--text-primary)',
                    outline: 'none', transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--medical-blue)')}
                  onBlur={(e) => (e.target.style.borderColor = error ? '#FCA5A5' : 'var(--border)')}
                />
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  display: 'block', fontSize: 13, fontWeight: 600,
                  color: 'var(--text-primary)', marginBottom: 6,
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute', left: 14, top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 16,
                  }}
                >
                  🔒
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%', paddingLeft: 42, paddingRight: 44,
                    paddingTop: 12, paddingBottom: 12,
                    border: `1.5px solid ${error ? '#FCA5A5' : 'var(--border)'}`,
                    borderRadius: 10, fontSize: 14,
                    background: '#fff', color: 'var(--text-primary)',
                    outline: 'none', transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--medical-blue)')}
                  onBlur={(e) => (e.target.style.borderColor = error ? '#FCA5A5' : 'var(--border)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 14, top: '50%',
                    transform: 'translateY(-50%)', background: 'none',
                    border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                    fontSize: 14, padding: 0,
                  }}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {error && (
              <div
                style={{
                  background: 'var(--medical-red-light)',
                  border: '1px solid #FCA5A5',
                  borderRadius: 10, padding: '12px 16px',
                  marginBottom: 20,
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}
              >
                <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>⚠️</span>
                <p style={{ color: 'var(--medical-red)', fontSize: 13, lineHeight: 1.5 }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px 24px',
                background: loading ? '#93B8E8' : 'var(--medical-blue)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginBottom: 24,
                boxShadow: loading ? 'none' : '0 4px 14px rgba(0,71,171,0.35)',
              }}
            >
              {loading ? (
                <>
                  <span
                    style={{
                      width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff', borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite', display: 'inline-block',
                    }}
                  />
                  Signing in...
                </>
              ) : (
                'Sign In →'
              )}
            </button>
          </form>

          {/* Test credentials hint */}
          <div
            style={{
              background: 'var(--medical-blue-light)',
              borderRadius: 10,
              padding: '14px 16px',
              marginBottom: 24,
              border: '1px solid #C7D8F8',
            }}
          >
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--medical-blue)', marginBottom: 6 }}>
              🧪 Test Credentials (register first if new)
            </p>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              <div>Patient: <code style={{ fontFamily: 'monospace', background: '#fff', padding: '1px 6px', borderRadius: 4 }}>patient@test.com / Patient@123</code></div>
              <div>Doctor: <code style={{ fontFamily: 'monospace', background: '#fff', padding: '1px 6px', borderRadius: 4 }}>doctor@test.com / Doctor@123</code></div>
            </div>
          </div>

          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)' }}>
            Don't have an account?{' '}
            <Link
              to="/register"
              style={{ color: 'var(--medical-blue)', fontWeight: 600, textDecoration: 'none' }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.textDecoration = 'underline')}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.textDecoration = 'none')}
            >
              Create account
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}


