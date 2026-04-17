import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import Navbar from '../../components/Navbar';
import Toast from '../../components/Toast';

interface HistoryItem {
  appointmentId?: string;
  id?: string;
  doctorId?: string;
  reason?: string;
  status?: string;
  scheduledAt?: string;
  scheduled_at?: string;
  completedAt?: string;
  completed_at?: string;
  title?: string;
  description?: string;
  reportType?: string;
  uploadedAt?: string;
}

function getHistoryItems(data: unknown): HistoryItem[] {
  if (Array.isArray(data)) {
    return data as HistoryItem[];
  }

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;

    if (Array.isArray(record.history)) {
      return record.history as HistoryItem[];
    }

    if (Array.isArray(record.reports)) {
      return record.reports as HistoryItem[];
    }

    if (record.patient && typeof record.patient === 'object') {
      const patient = record.patient as Record<string, unknown>;
      if (Array.isArray(patient.medicalReports)) {
        return patient.medicalReports as HistoryItem[];
      }
    }
  }

  return [];
}

function getScheduledAt(item: HistoryItem): string | undefined {
  return item.scheduledAt || item.scheduled_at || item.uploadedAt;
}

function getCompletedAt(item: HistoryItem): string | undefined {
  return item.completedAt || item.completed_at;
}

const STATUS_CONFIG: Record<string, { bg: string; color: string }> = {
  COMPLETED: { bg: '#ECFDF5', color: '#065F46' },
  CANCELLED: { bg: '#F1F5F9', color: '#64748B' },
  REJECTED: { bg: '#FEE2E2', color: '#991B1B' },
  PAID: { bg: '#EDE9FE', color: '#4C1D95' },
  CONFIRMED: { bg: '#DBEAFE', color: '#1E40AF' },
  REPORT: { bg: '#EFF6FF', color: '#1D4ED8' },
};

export default function PatientHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    void fetchHistory();
  }, []);

  async function fetchHistory() {
    try {
      const { data } = await api.get('/api/patients/history');
      setHistory(getHistoryItems(data));
    } catch {
      setToast({ message: 'Failed to load patient history.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', padding: '44px 24px 72px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', color: '#fff', fontSize: 28, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.5px' }}>Patient History</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: 0 }}>Review completed consultations and related historical records</p>
        </div>
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 36 }}>
          <path d="M0,20 C360,55 1080,5 1440,25 L1440,60 L0,60 Z" fill="var(--bg)" />
        </svg>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: 14 }}>Loading history…</div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
            <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', margin: '0 0 6px' }}>No history available.</p>
            <p style={{ fontSize: 13, margin: 0 }}>Completed consultations and historical records will appear here.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {history.map((item, index) => {
              const status = item.status || (item.reportType ? 'REPORT' : 'RECORDED');
              const badge = STATUS_CONFIG[status] ?? { bg: '#F1F5F9', color: '#475569' };

              return (
                <div key={item.appointmentId || item.id || `${status}-${index}`} style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                        {item.title || item.description || item.reason || item.appointmentId || 'Patient history record'}
                      </div>
                      {item.doctorId && (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Doctor ID: {item.doctorId}</div>
                      )}
                    </div>
                    <span style={{ background: badge.bg, color: badge.color, fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 14 }}>{status}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-secondary)' }}>
                    {getScheduledAt(item) && <span>Scheduled: {new Date(getScheduledAt(item)!).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>}
                    {getCompletedAt(item) && <span>Completed: {new Date(getCompletedAt(item)!).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>}
                    {item.reportType && <span>Record Type: {item.reportType}</span>}
                  </div>
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