import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getCurrentUser } from '../../api';
import Navbar from '../../components/Navbar';

interface SymptomResult {
  specialty: string;
  note: string;
  disclaimer: string;
}

const EXAMPLES = ['Headache, fever, fatigue', 'Chest pain, shortness of breath', 'Joint swelling, knee pain'];

export default function SymptomChecker() {
  const navigate = useNavigate();
  const user = getCurrentUser();
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
      const { data } = await api.post<SymptomResult>('/api/ai/check', {
        symptoms,
        ...(user?.userId ? { patient_id: user.userId } : {}),
      });
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
            {/* Main result card */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #A7F3D0', padding: 28, boxShadow: '0 4px 16px rgba(5,150,105,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✅</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#065F46' }}>Preliminary Suggestion</div>
                  <div style={{ fontSize: 12, color: '#6EE7B7' }}>Powered by Gemini AI</div>
                </div>
              </div>

              <p style={{ color: 'var(--text-primary)', fontSize: 14, lineHeight: 1.7, marginBottom: 18 }}>{result.note}</p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--primary-light)', borderRadius: 10, padding: '12px 16px' }}>
                <span style={{ fontSize: 20 }}>🏥</span>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase' }}>Recommended Specialist</div>
                  <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--primary-dark)', marginTop: 1 }}>{result.specialty}</div>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div style={{ background: '#FFF7ED', border: '1.5px solid #FCD34D', borderRadius: 12, padding: '14px 18px', display: 'flex', gap: 10 }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
              <p style={{ color: '#92400E', fontSize: 12, lineHeight: 1.6, margin: 0 }}><strong>Disclaimer: </strong>{result.disclaimer}</p>
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

