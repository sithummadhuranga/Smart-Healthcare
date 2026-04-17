import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import Navbar from '../../components/Navbar';
import Toast from '../../components/Toast';

interface Payment {
  id?: string;
  paymentId?: string;
  appointmentId?: string;
  appointment_id?: string;
  patientId?: string;
  patient_id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  createdAt?: string;
  created_at?: string;
}

interface PaymentsResponse {
  transactions?: Payment[];
  total?: number;
}

export default function ManagePayments() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const limit = 10;

  useEffect(() => {
    void fetchPayments();
  }, [page]);

  async function fetchPayments() {
    setLoading(true);
    try {
      const { data } = await api.get<PaymentsResponse>('/api/payments/admin/all', { params: { page, limit } });
      setPayments(Array.isArray(data.transactions) ? data.transactions : []);
      setTotal(Number(data.total ?? 0));
    } catch {
      setToast({ message: 'Failed to load payments.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', padding: '44px 24px 72px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', color: '#fff', fontSize: 28, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.5px' }}>Manage Payments</h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, margin: 0 }}>Review payment transactions returned by the documented admin payment endpoint</p>
        </div>
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 36 }}>
          <path d="M0,20 C360,55 1080,5 1440,25 L1440,60 L0,60 Z" fill="var(--bg)" />
        </svg>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ padding: '14px 20px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>{total} Transactions</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: 14 }}>Loading payments…</div>
          ) : payments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: 14 }}>No payment records found.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                    {['Payment', 'Appointment', 'Patient', 'Amount', 'Status', 'Created'].map((heading) => (
                      <th key={heading} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment, index) => {
                    const paymentId = payment.id || payment.paymentId || '—';
                    const appointmentId = payment.appointmentId || payment.appointment_id || '—';
                    const patientId = payment.patientId || payment.patient_id || '—';

                    return (
                      <tr key={payment.id || payment.paymentId || `${appointmentId}-${index}`} style={{ borderBottom: '1px solid var(--bg)' }}>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-primary)' }}>{paymentId === '—' ? paymentId : `${paymentId.slice(0, 8)}…`}</td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>{appointmentId === '—' ? appointmentId : `${appointmentId.slice(0, 8)}…`}</td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>{patientId === '—' ? patientId : `${patientId.slice(0, 8)}…`}</td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>{typeof payment.amount === 'number' ? `$${(payment.amount / 100).toFixed(2)} ${(payment.currency || 'usd').toUpperCase()}` : '—'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ background: '#ECFDF5', color: '#065F46', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 12 }}>{payment.status || 'UNKNOWN'}</span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>{payment.createdAt || payment.created_at ? new Date(payment.createdAt || payment.created_at || '').toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: page === 1 ? 'var(--bg)' : '#fff', color: 'var(--text-secondary)', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600 }}>
              Previous
            </button>
            <button onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: page >= totalPages ? 'var(--bg)' : '#fff', color: 'var(--text-secondary)', cursor: page >= totalPages ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600 }}>
              Next
            </button>
          </div>
        </div>

        <button onClick={() => navigate('/admin/dashboard')} style={{ marginTop: 24, background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          ← Back to Dashboard
        </button>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}