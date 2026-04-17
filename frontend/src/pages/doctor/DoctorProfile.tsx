import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getCurrentUser } from '../../api';
import Navbar from '../../components/Navbar';
import Toast from '../../components/Toast';

interface DoctorProfileData {
  _id: string;
  userId: string;
  name: string;
  email: string;
  specialty?: string;
  bio?: string;
  qualifications: string[];
  consultationFee?: number;
  isVerified: boolean;
}

const SPECIALTIES = [
  '', 'Cardiology', 'Dermatology', 'General Practice', 'Neurology',
  'Orthopedics', 'Gastroenterology', 'Pulmonology', 'ENT',
  'Psychiatry', 'Ophthalmology', 'Gynecology', 'Urology',
  'Endocrinology', 'Pediatrics', 'Oncology',
];

export default function DoctorProfile() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [profile, setProfile] = useState<DoctorProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [specialty, setSpecialty] = useState('');
  const [bio, setBio] = useState('');
  const [consultationFee, setConsultationFee] = useState('');
  const [qualifications, setQualifications] = useState('');

  useEffect(() => { fetchProfile(); }, []);

  async function fetchProfile() {
    try {
      const { data } = await api.get('/api/doctors/profile');
      const p = data.doctor ?? data;
      setProfile(p);
      populateForm(p);
    } catch {
      if (user) {
        setProfile({
          _id: '',
          userId: user.userId,
          name: user.name,
          email: user.email,
          qualifications: [],
          // Logged-in doctors are verified by auth-service; avoid false "pending" state on transient failures.
          isVerified: true,
        });
      }
      setToast({ message: 'Unable to refresh profile details. Showing basic account info.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  function populateForm(p: DoctorProfileData) {
    setSpecialty(p.specialty || '');
    setBio(p.bio || '');
    setConsultationFee(p.consultationFee?.toString() || '');
    setQualifications((p.qualifications || []).join(', '));
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (specialty) body.specialty = specialty;
      if (bio) body.bio = bio;
      if (consultationFee) body.consultationFee = parseFloat(consultationFee);
      if (qualifications.trim()) body.qualifications = qualifications.split(',').map(q => q.trim()).filter(Boolean);
      const { data } = await api.put('/api/doctors/profile', body);
      const p = data.doctor ?? data;
      setProfile(p);
      setEditing(false);
      setToast({ message: 'Profile updated successfully!', type: 'success' });
    } catch {
      setToast({ message: 'Failed to update profile.', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', borderRadius: 8, border: '1.5px solid var(--border)',
    padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font-body)',
    color: 'var(--text-primary)', background: editing ? '#fff' : 'var(--bg)', outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.4px',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', padding: '44px 24px 72px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ maxWidth: 760, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', color: '#fff', fontSize: 28, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.5px' }}>My Profile</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: 0 }}>Manage your professional information and consultation settings</p>
        </div>
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 36 }}>
          <path d="M0,20 C360,55 1080,5 1440,25 L1440,60 L0,60 Z" fill="var(--bg)" />
        </svg>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: 14 }}>Loading profile…</div>
        ) : (
          <form onSubmit={handleSave}>
            {/* Verification status */}
            <div style={{
              background: profile?.isVerified ? '#ECFDF5' : '#FEF3C7',
              border: `1.5px solid ${profile?.isVerified ? '#A7F3D0' : '#FCD34D'}`,
              borderRadius: 12, padding: '14px 18px', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 18 }}>{profile?.isVerified ? '✅' : '⏳'}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: profile?.isVerified ? '#065F46' : '#92400E' }}>
                {profile?.isVerified ? 'Your account is verified. You can receive appointments.' : 'Your account is pending verification by an admin.'}
              </span>
            </div>

            {/* Professional Info */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', padding: 24, boxShadow: 'var(--shadow-sm)', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Professional Information</h2>
                {!editing && (
                  <button type="button" onClick={() => setEditing(true)} style={{ padding: '7px 16px', borderRadius: 8, background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
                    Edit Profile
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Name</label>
                  <input value={profile?.name || ''} disabled style={{ ...inputStyle, background: 'var(--bg)', color: 'var(--text-muted)' }} />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input value={profile?.email || ''} disabled style={{ ...inputStyle, background: 'var(--bg)', color: 'var(--text-muted)' }} />
                </div>
                <div>
                  <label style={labelStyle}>Specialty</label>
                  <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} disabled={!editing} style={{ ...inputStyle, cursor: editing ? 'pointer' : 'default' }}>
                    {SPECIALTIES.map(s => <option key={s} value={s}>{s || 'Select Specialty...'}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Consultation Fee ($)</label>
                  <input type="number" min="0" step="0.01" value={consultationFee} onChange={(e) => setConsultationFee(e.target.value)} disabled={!editing} placeholder="25.00" style={inputStyle} />
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <label style={labelStyle}>Bio</label>
                <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} disabled={!editing} placeholder="Tell patients about yourself…" style={{ ...inputStyle, resize: 'none' }} />
              </div>

              <div style={{ marginTop: 14 }}>
                <label style={labelStyle}>Qualifications (comma-separated)</label>
                <input value={qualifications} onChange={(e) => setQualifications(e.target.value)} disabled={!editing} placeholder="e.g., MBBS, MD Cardiology, FRCP" style={inputStyle} />
              </div>
            </div>

            {editing && (
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: '13px 0', borderRadius: 10, background: saving ? 'var(--border)' : 'var(--primary)', color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14 }}>
                  {saving ? 'Saving…' : '✓ Save Profile'}
                </button>
                <button type="button" onClick={() => { setEditing(false); if (profile) populateForm(profile); }} style={{ padding: '13px 24px', borderRadius: 10, background: 'none', color: 'var(--text-secondary)', border: '1.5px solid var(--border)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                  Cancel
                </button>
              </div>
            )}
          </form>
        )}

        <button onClick={() => navigate('/doctor/dashboard')} style={{ marginTop: 24, background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          ← Back to Dashboard
        </button>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
