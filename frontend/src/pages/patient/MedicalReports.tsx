import { useEffect, useState, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import Navbar from '../../components/Navbar';
import Toast from '../../components/Toast';

interface Report {
  _id: string;
  title: string;
  description?: string;
  reportType: string;
  fileUrl: string;
  format: string;
  bytes: number;
  createdAt: string;
}

const REPORT_TYPES = ['lab', 'imaging', 'prescription', 'discharge', 'other'];

const TYPE_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  lab: { bg: '#EFF6FF', color: '#1D4ED8', label: 'Lab Report' },
  imaging: { bg: '#F5F3FF', color: '#6D28D9', label: 'Imaging' },
  prescription: { bg: '#ECFDF5', color: '#065F46', label: 'Prescription' },
  discharge: { bg: '#FEF3C7', color: '#92400E', label: 'Discharge' },
  other: { bg: '#F1F5F9', color: '#475569', label: 'Other' },
};

export default function MedicalReports() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Upload form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reportType, setReportType] = useState('lab');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => { fetchReports(); }, []);

  async function fetchReports() {
    try {
      const { data } = await api.get('/api/patients/reports');
      setReports(Array.isArray(data) ? data : data.reports ?? []);
    } catch {
      setToast({ message: 'Failed to load reports.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!file || !title.trim()) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('reportType', reportType);
      await api.post('/api/patients/reports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setToast({ message: 'Report uploaded successfully!', type: 'success' });
      setShowUpload(false);
      setTitle('');
      setDescription('');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      fetchReports();
    } catch {
      setToast({ message: 'Failed to upload report. Check file type (PDF, JPG, PNG) and size (max 10MB).', type: 'error' });
    } finally {
      setUploading(false);
    }
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', borderRadius: 8, border: '1.5px solid var(--border)',
    padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font-body)',
    color: 'var(--text-primary)', background: 'var(--bg)', outline: 'none',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', padding: '44px 24px 72px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', color: '#fff', fontSize: 28, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.5px' }}>Medical Reports</h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: 0 }}>Upload and manage your medical documents securely</p>
          </div>
          <button onClick={() => setShowUpload(!showUpload)} style={{ padding: '10px 20px', borderRadius: 10, background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', fontWeight: 700, fontSize: 13, backdropFilter: 'blur(8px)' }}>
            {showUpload ? '✕ Cancel' : '+ Upload Report'}
          </button>
        </div>
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 36 }}>
          <path d="M0,20 C360,55 1080,5 1440,25 L1440,60 L0,60 Z" fill="var(--bg)" />
        </svg>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px' }}>
        {/* Upload form */}
        {showUpload && (
          <form onSubmit={handleUpload} className="animate-fade-in" style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', padding: 24, boxShadow: 'var(--shadow-sm)', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Upload New Report</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>Title *</label>
                <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Blood Test Results" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>Report Type</label>
                <select value={reportType} onChange={(e) => setReportType(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {REPORT_TYPES.map(t => <option key={t} value={t}>{TYPE_CONFIG[t]?.label ?? t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>Description</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of the report" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>File (PDF, JPG, PNG — max 10MB) *</label>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ fontSize: 13, color: 'var(--text-secondary)' }} />
            </div>
            <button type="submit" disabled={uploading} style={{ padding: '12px 0', borderRadius: 10, background: uploading ? 'var(--border)' : 'var(--primary)', color: '#fff', border: 'none', cursor: uploading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14 }}>
              {uploading ? 'Uploading…' : '↑ Upload Report'}
            </button>
          </form>
        )}

        {/* Reports list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: 14 }}>Loading reports…</div>
        ) : reports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
            <p style={{ fontWeight: 600, fontSize: 15 }}>No medical reports uploaded yet.</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Click "Upload Report" to add your first medical document.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reports.map((r) => {
              const cfg = TYPE_CONFIG[r.reportType] ?? TYPE_CONFIG.other;
              return (
                <div key={r._id} className="animate-fade-in" style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 20 }}>{r.format === 'pdf' ? '📑' : '🖼️'}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 3 }}>{r.title}</div>
                    {r.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 3 }}>{r.description}</div>}
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
                      <span style={{ background: cfg.bg, color: cfg.color, padding: '2px 8px', borderRadius: 8, fontWeight: 700 }}>{cfg.label}</span>
                      <span>{formatSize(r.bytes)}</span>
                      <span>{new Date(r.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                    </div>
                  </div>
                  <a href={r.fileUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '7px 14px', borderRadius: 8, background: 'var(--primary-light)', color: 'var(--primary-dark)', fontWeight: 700, fontSize: 12, textDecoration: 'none', flexShrink: 0 }}>
                    View ↗
                  </a>
                </div>
              );
            })}
          </div>
        )}

        <button onClick={() => navigate('/patient/dashboard')} style={{ marginTop: 28, background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          ← Back to Dashboard
        </button>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
