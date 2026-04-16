import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getCurrentUser } from '../../api';
import Navbar from '../../components/Navbar';
import Toast from '../../components/Toast';

interface PatientProfile {
  userId: string;
  name: string;
  email: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  address?: { street?: string; city?: string; district?: string; country?: string };
  bloodGroup?: string;
  allergies?: string[];
  chronicConditions?: string[];
  emergencyContact?: { name?: string; phone?: string; relationship?: string };
}

const BLOOD_GROUPS = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = ['', 'male', 'female', 'other'];

export default function PatientProfilePage() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [editing, setEditing] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [allergies, setAllergies] = useState('');
  const [chronicConditions, setChronicConditions] = useState('');
  const [ecName, setEcName] = useState('');
  const [ecPhone, setEcPhone] = useState('');
  const [ecRelationship, setEcRelationship] = useState('');

  useEffect(() => { fetchProfile(); }, []);

  async function fetchProfile() {
    try {
      const { data } = await api.get('/api/patients/profile');
      const p = data.patient ?? data;
      setProfile(p);
      populateForm(p);
    } catch {
      // Profile might not exist yet — that's OK
      if (user) {
        setProfile({ userId: user.userId, name: user.name, email: user.email });
        setName(user.name);
      }
    } finally {
      setLoading(false);
    }
  }

  function populateForm(p: PatientProfile) {
    setName(p.name || '');
    setDateOfBirth(p.dateOfBirth ? p.dateOfBirth.slice(0, 10) : '');
    setGender(p.gender || '');
    setPhone(p.phone || '');
    setStreet(p.address?.street || '');
    setCity(p.address?.city || '');
    setDistrict(p.address?.district || '');
    setBloodGroup(p.bloodGroup || '');
    setAllergies((p.allergies || []).join(', '));
    setChronicConditions((p.chronicConditions || []).join(', '));
    setEcName(p.emergencyContact?.name || '');
    setEcPhone(p.emergencyContact?.phone || '');
    setEcRelationship(p.emergencyContact?.relationship || '');
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, unknown> = { name };
      if (dateOfBirth) body.dateOfBirth = dateOfBirth;
      if (gender) body.gender = gender;
      if (phone) body.phone = phone;
      if (bloodGroup) body.bloodGroup = bloodGroup;
      if (street || city || district) {
        body.address = { street, city, district, country: 'Sri Lanka' };
      }
      if (allergies.trim()) body.allergies = allergies.split(',').map(a => a.trim()).filter(Boolean);
      if (chronicConditions.trim()) body.chronicConditions = chronicConditions.split(',').map(c => c.trim()).filter(Boolean);
      if (ecName || ecPhone) {
        body.emergencyContact = { name: ecName, phone: ecPhone, relationship: ecRelationship };
      }
      const { data } = await api.put('/api/patients/profile', body);
      setProfile(data.patient ?? data);
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
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: 0 }}>Manage your personal and medical information</p>
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
            {/* Personal Info */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', padding: 24, boxShadow: 'var(--shadow-sm)', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Personal Information</h2>
                {!editing && (
                  <button type="button" onClick={() => setEditing(true)} style={{ padding: '7px 16px', borderRadius: 8, background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
                    Edit Profile
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Full Name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} disabled={!editing} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input value={profile?.email || ''} disabled style={{ ...inputStyle, background: 'var(--bg)', color: 'var(--text-muted)' }} />
                </div>
                <div>
                  <label style={labelStyle}>Date of Birth</label>
                  <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} disabled={!editing} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Gender</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value)} disabled={!editing} style={{ ...inputStyle, cursor: editing ? 'pointer' : 'default' }}>
                    {GENDERS.map(g => <option key={g} value={g}>{g ? g.charAt(0).toUpperCase() + g.slice(1) : 'Select...'}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!editing} placeholder="+94 77 123 4567" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Blood Group</label>
                  <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} disabled={!editing} style={{ ...inputStyle, cursor: editing ? 'pointer' : 'default' }}>
                    {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg || 'Select...'}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Address */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', padding: 24, boxShadow: 'var(--shadow-sm)', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>Address</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Street</label>
                  <input value={street} onChange={(e) => setStreet(e.target.value)} disabled={!editing} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>City</label>
                  <input value={city} onChange={(e) => setCity(e.target.value)} disabled={!editing} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>District</label>
                  <input value={district} onChange={(e) => setDistrict(e.target.value)} disabled={!editing} style={inputStyle} />
                </div>
              </div>
            </div>

            {/* Medical Info */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', padding: 24, boxShadow: 'var(--shadow-sm)', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>Medical Information</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Allergies (comma-separated)</label>
                  <input value={allergies} onChange={(e) => setAllergies(e.target.value)} disabled={!editing} placeholder="e.g., Penicillin, Peanuts" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Chronic Conditions (comma-separated)</label>
                  <input value={chronicConditions} onChange={(e) => setChronicConditions(e.target.value)} disabled={!editing} placeholder="e.g., Diabetes, Hypertension" style={inputStyle} />
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', padding: 24, boxShadow: 'var(--shadow-sm)', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>Emergency Contact</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Name</label>
                  <input value={ecName} onChange={(e) => setEcName(e.target.value)} disabled={!editing} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input value={ecPhone} onChange={(e) => setEcPhone(e.target.value)} disabled={!editing} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Relationship</label>
                  <input value={ecRelationship} onChange={(e) => setEcRelationship(e.target.value)} disabled={!editing} style={inputStyle} />
                </div>
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

        <button onClick={() => navigate('/patient/dashboard')} style={{ marginTop: 24, background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          ← Back to Dashboard
        </button>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
