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
    <div style={{ minHeight: '100vh', background: '#F0F4F8' }}>
      <Navbar />

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #5B21B6 0%, #7C3AED 50%, #8B5CF6 100%)', padding: '40px 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '4px 12px', marginBottom: 12 }}>
            <span style={{ fontSize: 12 }}>✦</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', letterSpacing: '0.5px' }}>POWERED BY GOOGLE GEMINI AI</span>
          </div>
          <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.3px' }}>AI Symptom Checker</h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, margin: 0 }}>
            Describe your symptoms in plain text — our AI will recommend the right medical specialist.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px' }}>

        {/* Input card */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0', padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 20 }}>
          <form onSubmit={handleSubmit}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 14, color: '#0F172A', marginBottom: 10 }}>
              Describe your symptoms
            </label>
            <textarea
              rows={5}
              value={symptomText}
              onChange={(e) => setSymptomText(e.target.value)}
              placeholder="e.g. I have been having persistent chest pain, shortness of breath and dizziness for the past 3 days..."
              disabled={loading}
              style={{
                width: '100%', borderRadius: 10, border: '1.5px solid #E2E8F0',
                padding: '12px 14px', fontSize: 14, resize: 'none',
                fontFamily: 'Inter, sans-serif', color: '#0F172A',
                outline: 'none', background: '#FAFBFF',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#7C3AED')}
              onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
            />

            {/* Chip examples */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, marginBottom: 18 }}>
              <span style={{ fontSize: 11, color: '#94A3B8', alignSelf: 'center' }}>Try:</span>
              {EXAMPLES.map((ex) => (
                <button key={ex} type="button" onClick={() => setSymptomText(ex)} style={{
                  padding: '4px 10px', borderRadius: 20, border: '1px solid #DDD6FE',
                  background: '#F5F3FF', color: '#7C3AED', fontSize: 11, fontWeight: 500, cursor: 'pointer',
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
                background: loading || !symptomText.trim() ? '#C4B5FD' : 'linear-gradient(135deg,#7C3AED,#5B21B6)',
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
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #DDD6FE', padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }} className="animate-pulse">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EDE9FE' }} />
              <div>
                <div style={{ width: 160, height: 12, background: '#EDE9FE', borderRadius: 6, marginBottom: 6 }} />
                <div style={{ width: 100, height: 10, background: '#F3F0FF', borderRadius: 6 }} />
              </div>
            </div>
            <div style={{ height: 10, background: '#F3F0FF', borderRadius: 6, marginBottom: 8 }} />
            <div style={{ height: 10, background: '#F3F0FF', borderRadius: 6, width: '85%', marginBottom: 8 }} />
            <div style={{ height: 10, background: '#F3F0FF', borderRadius: 6, width: '70%' }} />
            <p style={{ textAlign: 'center', color: '#A78BFA', fontSize: 13, fontWeight: 600, marginTop: 20 }}>
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

              <p style={{ color: '#374151', fontSize: 14, lineHeight: 1.7, marginBottom: 18 }}>{result.note}</p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#ECFDF5', borderRadius: 10, padding: '12px 16px' }}>
                <span style={{ fontSize: 20 }}>🏥</span>
                <div>
                  <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase' }}>Recommended Specialist</div>
                  <div style={{ fontWeight: 800, fontSize: 17, color: '#065F46', marginTop: 1 }}>{result.specialty}</div>
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
                padding: '14px 0', borderRadius: 12, background: 'linear-gradient(135deg,#0047AB,#0891B2)',
                color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14,
              }}
            >
              Book Appointment with a {result.specialty} Specialist →
            </button>
          </div>
        )}

        <button onClick={() => navigate('/patient/dashboard')} style={{ marginTop: 28, background: 'none', border: 'none', color: '#7C3AED', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}

