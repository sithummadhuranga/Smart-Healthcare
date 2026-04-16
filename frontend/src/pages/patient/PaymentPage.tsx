import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import api from '../../api';
import Navbar from '../../components/Navbar';
import Toast from '../../components/Toast';

const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
const stripePromise = STRIPE_PK ? loadStripe(STRIPE_PK) : null;

interface PaymentData {
  clientSecret: string;
  amount: number;
  currency: string;
  paymentId: string;
}

function CheckoutForm({ appointmentId, paymentData, onSuccess, onError }: {
  appointmentId: string;
  paymentData: PaymentData;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    const card = elements.getElement(CardElement);
    if (!card) return;

    setProcessing(true);
    const { error, paymentIntent } = await stripe.confirmCardPayment(paymentData.clientSecret, {
      payment_method: { card },
    });

    if (error) {
      onError(error.message ?? 'Payment failed');
      setProcessing(false);
    } else if (paymentIntent?.status === 'succeeded') {
      onSuccess();
    } else {
      onError('Payment processing. Please wait...');
      setProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Appointment ID</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{appointmentId.slice(0, 8)}…</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, padding: '14px 18px', background: 'var(--primary-light)', borderRadius: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Consultation Fee</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-dark)' }}>
            ${(paymentData.amount / 100).toFixed(2)} <span style={{ fontSize: 12, fontWeight: 500 }}>{paymentData.currency.toUpperCase()}</span>
          </span>
        </div>
      </div>

      <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Card Details</label>
      <div style={{ border: '1.5px solid var(--border)', borderRadius: 10, padding: '14px 14px', background: '#fff', marginBottom: 20 }}>
        <CardElement options={{
          style: {
            base: {
              fontSize: '15px',
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              color: '#0F172A',
              '::placeholder': { color: '#94A3B8' },
            },
            invalid: { color: '#EF4444' },
          },
        }} />
      </div>

      <button type="submit" disabled={!stripe || processing} style={{
        width: '100%', padding: '14px 0', borderRadius: 10,
        background: processing ? 'var(--border)' : 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
        color: '#fff', border: 'none',
        cursor: processing ? 'not-allowed' : 'pointer',
        fontWeight: 700, fontSize: 15,
        boxShadow: processing ? 'none' : 'var(--shadow-teal)',
      }}>
        {processing ? 'Processing Payment…' : `Pay $${(paymentData.amount / 100).toFixed(2)}`}
      </button>

      <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 12 }}>
        🔒 Secured by Stripe. Your card details are encrypted end-to-end.
      </p>
    </form>
  );
}

export default function PaymentPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paid, setPaid] = useState(false);
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!appointmentId) return;
    createPaymentIntent();
  }, [appointmentId]);

  async function createPaymentIntent() {
    try {
      // First check if already paid
      try {
        const { data: existing } = await api.get(`/api/payments/${appointmentId}`);
        if (existing?.status === 'COMPLETED' || existing?.payment?.status === 'COMPLETED') {
          setAlreadyPaid(true);
          setLoading(false);
          return;
        }
      } catch {
        // No existing payment — proceed to create
      }

      const { data } = await api.post('/api/payments/intent', { appointmentId });
      setPaymentData({
        clientSecret: data.clientSecret,
        amount: data.amount,
        currency: data.currency || 'usd',
        paymentId: data.paymentId,
      });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to initialize payment.';
      setToast({ message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  if (!STRIPE_PK) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <Navbar />
        <div style={{ maxWidth: 560, margin: '80px auto', padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚙️</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Payment Not Configured</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Stripe publishable key is not set. Please configure <code>VITE_STRIPE_PUBLISHABLE_KEY</code> in the environment.</p>
          <button onClick={() => navigate('/patient/appointments')} style={{ marginTop: 20, padding: '10px 24px', borderRadius: 9, background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
            Back to Appointments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', padding: '44px 24px 72px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ maxWidth: 560, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', color: '#fff', fontSize: 28, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.5px' }}>Complete Payment</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: 0 }}>Secure checkout for your consultation appointment</p>
        </div>
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 36 }}>
          <path d="M0,20 C360,55 1080,5 1440,25 L1440,60 L0,60 Z" fill="var(--bg)" />
        </svg>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '28px 24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: 14 }}>Initializing payment…</div>
        ) : alreadyPaid ? (
          <div className="animate-fade-in" style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #A7F3D0', padding: 28, boxShadow: 'var(--shadow-sm)', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#065F46', marginBottom: 8 }}>Already Paid</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>This appointment has already been paid for. You can join the video consultation when the doctor starts the session.</p>
            <button onClick={() => navigate('/patient/appointments')} style={{ padding: '12px 28px', borderRadius: 10, background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
              Go to Appointments
            </button>
          </div>
        ) : paid ? (
          <div className="animate-fade-in" style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #A7F3D0', padding: 28, boxShadow: '0 4px 16px rgba(5,150,105,0.1)', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#065F46', marginBottom: 8 }}>Payment Successful!</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>Your consultation has been paid. The doctor will start the session at the scheduled time. You'll be able to join the video call from your appointments page.</p>
            <button onClick={() => navigate('/patient/appointments')} style={{ padding: '12px 28px', borderRadius: 10, background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
              Go to Appointments
            </button>
          </div>
        ) : paymentData ? (
          <div className="animate-fade-in" style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', padding: 28, boxShadow: 'var(--shadow-sm)' }}>
            <Elements stripe={stripePromise} options={{ clientSecret: paymentData.clientSecret }}>
              <CheckoutForm
                appointmentId={appointmentId!}
                paymentData={paymentData}
                onSuccess={() => setPaid(true)}
                onError={(msg) => setToast({ message: msg, type: 'error' })}
              />
            </Elements>
          </div>
        ) : (
          <div style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 12, padding: '20px', textAlign: 'center' }}>
            <p style={{ color: '#991B1B', fontSize: 13, margin: '0 0 12px' }}>Unable to initialize payment. The appointment may not be in CONFIRMED status.</p>
            <button onClick={() => navigate('/patient/appointments')} style={{ padding: '10px 24px', borderRadius: 9, background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
              Back to Appointments
            </button>
          </div>
        )}

        <button onClick={() => navigate('/patient/appointments')} style={{ marginTop: 24, background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          ← Back to Appointments
        </button>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
