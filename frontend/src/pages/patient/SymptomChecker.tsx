import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import Navbar from '../../components/Navbar';

interface SymptomResult {
  specialty: string;
  note: string;
  possibleConditions?: string[];
  urgency?: 'low' | 'medium' | 'high';
  urgencyReason?: string;
  recommendations?: string[];
  disclaimer: string;
}

const EXAMPLES = ['Headache, fever, fatigue', 'Chest pain, shortness of breath', 'Joint swelling, knee pain'];

export default function SymptomChecker() {
  const navigate = useNavigate();
  const [symptomText, setSymptomText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SymptomResult | null>(null);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!symptomText.trim()) return;
    setLoading(true);
    setResult(null);
    setError('');
    const symptoms = symptomText.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
    try {
      const { data } = await api.post<SymptomResult>('/api/ai/check', { symptoms });
      setResult(data);
    } catch {
      setError('Our AI service is temporarily unavailable. Please try again shortly.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', padding: '44px 24px 72px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ maxWidth: 760, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '4px 12px', marginBottom: 12 }}>
            <span style={{ fontSize: 12 }}>✦</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', letterSpacing: '0.5px' }}>POWERED BY GOOGLE GEMINI AI</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', color: '#fff', fontSize: 28, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.5px' }}>AI Symptom Checker</h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, margin: 0 }}>
            Describe your symptoms in plain text — our AI will recommend the right medical specialist.
          </p>
        </div>
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 36 }}>
          <path d="M0,20 C360,55 1080,5 1440,25 L1440,60 L0,60 Z" fill="var(--bg)" />
        </svg>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px' }}>

        {/* Input card */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', padding: 28, boxShadow: 'var(--shadow-sm)', marginBottom: 20 }}>
          <form onSubmit={handleSubmit}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 10 }}>
              Describe your symptoms
            </label>
            <textarea
              rows={5}
              value={symptomText}
              onChange={(e) => setSymptomText(e.target.value)}
              placeholder="e.g. I have been having persistent chest pain, shortness of breath and dizziness for the past 3 days..."
              disabled={loading}
              style={{
                width: '100%', borderRadius: 10, border: '1.5px solid var(--border)',
                padding: '12px 14px', fontSize: 14, resize: 'none',
                fontFamily: 'var(--font-body)', color: 'var(--text-primary)',
                outline: 'none', background: 'var(--bg)',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--primary)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />

            {/* Chip examples */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, marginBottom: 18 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>Try:</span>
              {EXAMPLES.map((ex) => (
                <button key={ex} type="button" onClick={() => setSymptomText(ex)} style={{
                  padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border)',
                  background: 'var(--primary-light)', color: 'var(--primary-dark)', fontSize: 11, fontWeight: 500, cursor: 'pointer',
                }}>
                  {ex}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || !symptomText.trim()}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 10,
                background: loading || !symptomText.trim() ? 'var(--border)' : 'var(--primary)',
                color: '#fff', border: 'none', cursor: loading || !symptomText.trim() ? 'not-allowed' : 'pointer',
                fontWeight: 700, fontSize: 14, letterSpacing: '0.2px',
              }}
            >
              {loading ? '✦ Analyzing your symptoms...' : '✦ Analyze Symptoms with AI'}
            </button>
          </form>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', padding: 28, boxShadow: 'var(--shadow-sm)' }} className="animate-pulse">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--primary-light)' }} />
              <div>
                <div style={{ width: 160, height: 12, background: 'var(--primary-light)', borderRadius: 6, marginBottom: 6 }} />
                <div style={{ width: 100, height: 10, background: 'var(--bg)', borderRadius: 6 }} />
              </div>
            </div>
            <div style={{ height: 10, background: 'var(--bg)', borderRadius: 6, marginBottom: 8 }} />
            <div style={{ height: 10, background: 'var(--bg)', borderRadius: 6, width: '85%', marginBottom: 8 }} />
            <div style={{ height: 10, background: 'var(--bg)', borderRadius: 6, width: '70%' }} />
            <p style={{ textAlign: 'center', color: 'var(--primary)', fontSize: 13, fontWeight: 600, marginTop: 20 }}>
              ✦ Gemini AI is analyzing your symptoms…
            </p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 12, padding: '16px 20px', color: '#991B1B', fontSize: 13 }}>
            <strong>⚠️ Error:</strong> {error}
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Main observation card */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #A7F3D0', padding: 28, boxShadow: '0 4px 16px rgba(5,150,105,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="#059669" strokeWidth="2" />
                    <path d="M9 12l2 2 4-4" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#065F46' }}>Preliminary Suggestion</div>
                  <div style={{ fontSize: 11, color: '#6EE7B7', fontWeight: 600 }}>Powered by Gemini AI</div>
                </div>
              </div>
              <p style={{ color: 'var(--text-primary)', fontSize: 14, lineHeight: 1.8, margin: 0 }}>{result.note}</p>
            </div>

            {/* Specialist + Urgency row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {/* Recommended Specialist */}
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <polyline points="9 22 9 12 15 12 15 22" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Recommended Specialist</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--primary-dark)' }}>{result.specialty}</div>
              </div>

              {/* Urgency */}
              {result.urgency && (() => {
                const urgencyConfig = {
                  low:    { bg: '#ECFDF5', border: '#A7F3D0', color: '#065F46', label: 'Low Priority', sublabel: 'Monitor at home' },
                  medium: { bg: '#FFF7ED', border: '#FCD34D', color: '#92400E', label: 'Moderate',     sublabel: 'Schedule a visit soon' },
                  high:   { bg: '#FEF2F2', border: '#FECACA', color: '#991B1B', label: 'High Priority', sublabel: 'Seek care promptly' },
                };
                const cfg = urgencyConfig[result.urgency] ?? urgencyConfig.medium;
                return (
                  <div style={{ background: cfg.bg, borderRadius: 14, border: `1.5px solid ${cfg.border}`, padding: '18px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="9" stroke={cfg.color} strokeWidth="2" />
                        <line x1="12" y1="8" x2="12" y2="12" stroke={cfg.color} strokeWidth="2" strokeLinecap="round" />
                        <circle cx="12" cy="16" r="1" fill={cfg.color} />
                      </svg>
                      <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Urgency Level</span>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: cfg.color }}>{cfg.label}</div>
                    <div style={{ fontSize: 12, color: cfg.color, opacity: 0.8, marginTop: 2 }}>{cfg.sublabel}</div>
                    {result.urgencyReason && <p style={{ fontSize: 12, color: cfg.color, margin: '8px 0 0', lineHeight: 1.5, opacity: 0.9 }}>{result.urgencyReason}</p>}
                  </div>
                );
              })()}
            </div>

            {/* Possible Conditions */}
            {result.possibleConditions?.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                      <path d="M9 11l3 3L22 4" stroke="#6D28D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="#6D28D9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Possible Conditions</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 2 }}>(Not a diagnosis)</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {result.possibleConditions.map((c, i) => (
                    <span key={i} style={{ background: '#F5F3FF', color: '#5B21B6', border: '1px solid #DDD6FE', borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 600 }}>{c}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {result.recommendations?.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2a10 10 0 100 20A10 10 0 0012 2z" stroke="#1D4ED8" strokeWidth="1.8" />
                      <path d="M12 8v4l3 3" stroke="#1D4ED8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Recommended Next Steps</span>
                </div>
                <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {result.recommendations.map((r, i) => (
                    <li key={i} style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}>{r}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* Disclaimer */}
            <div style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 12, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ flexShrink: 0, marginTop: 1 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="12" y1="9" x2="12" y2="13" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round" />
                  <circle cx="12" cy="17" r="1" fill="#D97706" />
                </svg>
              </div>
              <p style={{ color: '#92400E', fontSize: 12, lineHeight: 1.7, margin: 0 }}><strong>Disclaimer: </strong>{result.disclaimer}</p>
            </div>

            {/* CTA */}
            <button
              onClick={() => navigate(`/patient/doctors?specialty=${encodeURIComponent(result.specialty)}`)}
              style={{
                padding: '14px 0', borderRadius: 12, background: 'var(--primary)',
                color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14,
              }}
            >
              Book Appointment with a {result.specialty} Specialist →
            </button>
          </div>
        )}

        <button onClick={() => navigate('/patient/dashboard')} style={{ marginTop: 28, background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}

