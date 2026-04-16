import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import Navbar from '../../components/Navbar';
import Toast from '../../components/Toast';

interface Slot {
  slotId: string;
  date: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
}

export default function ManageSchedule() {
  const navigate = useNavigate();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // New slot form
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => { fetchSchedule(); }, []);

  async function fetchSchedule() {
    try {
      const { data } = await api.get('/api/doctors/schedule');
      setSlots(Array.isArray(data) ? data : data.schedule ?? []);
    } catch {
      setToast({ message: 'Failed to load schedule.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function addSlot(e: FormEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      await api.post('/api/doctors/schedule', { date, startTime, endTime });
      setToast({ message: 'Slot added successfully!', type: 'success' });
      setDate('');
      setStartTime('');
      setEndTime('');
      fetchSchedule();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to add slot.';
      setToast({ message: msg, type: 'error' });
    } finally {
      setAdding(false);
    }
  }

  async function removeSlot(slotId: string) {
    try {
      await api.delete(`/api/doctors/schedule/${slotId}`);
      setSlots(prev => prev.filter(s => s.slotId !== slotId));
      setToast({ message: 'Slot removed.', type: 'success' });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to remove slot.';
      setToast({ message: msg, type: 'error' });
    }
  }

  // Group slots by date
  const grouped = slots.reduce<Record<string, Slot[]>>((acc, s) => {
    const d = s.date.slice(0, 10);
    if (!acc[d]) acc[d] = [];
    acc[d].push(s);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort();
  const today = new Date().toISOString().slice(0, 10);

  const inputStyle: React.CSSProperties = {
    borderRadius: 8, border: '1.5px solid var(--border)',
    padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font-body)',
    color: 'var(--text-primary)', background: 'var(--bg)', outline: 'none',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', padding: '44px 24px 72px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', color: '#fff', fontSize: 28, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.5px' }}>Manage Schedule</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: 0 }}>Add or remove available time slots for patient appointments</p>
        </div>
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 36 }}>
          <path d="M0,20 C360,55 1080,5 1440,25 L1440,60 L0,60 Z" fill="var(--bg)" />
        </svg>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px' }}>
        {/* Add slot form */}
        <form onSubmit={addSlot} style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', padding: 20, boxShadow: 'var(--shadow-sm)', marginBottom: 24, display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 160px' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>Date</label>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} min={today} style={inputStyle} />
          </div>
          <div style={{ flex: '1 1 120px' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>Start Time</label>
            <input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ flex: '1 1 120px' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>End Time</label>
            <input type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} style={inputStyle} />
          </div>
          <button type="submit" disabled={adding} style={{ padding: '10px 20px', borderRadius: 8, background: adding ? 'var(--border)' : 'var(--primary)', color: '#fff', border: 'none', cursor: adding ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
            {adding ? 'Adding…' : '+ Add Slot'}
          </button>
        </form>

        {/* Schedule list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: 14 }}>Loading schedule…</div>
        ) : sortedDates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
            <p style={{ fontWeight: 600, fontSize: 15 }}>No time slots added yet.</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Use the form above to add your available consultation times.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {sortedDates.map(dateStr => {
              const dateSlots = grouped[dateStr].sort((a, b) => a.startTime.localeCompare(b.startTime));
              const isPast = dateStr < today;
              return (
                <div key={dateStr}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: isPast ? 'var(--text-muted)' : 'var(--text-primary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>📅</span>
                    {new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>({dateSlots.length} slot{dateSlots.length !== 1 ? 's' : ''})</span>
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {dateSlots.map(slot => (
                      <div key={slot.slotId} style={{
                        background: slot.isBooked ? '#FEF3C7' : '#fff',
                        border: `1.5px solid ${slot.isBooked ? '#FCD34D' : 'var(--border)'}`,
                        borderRadius: 10, padding: '10px 14px',
                        display: 'flex', alignItems: 'center', gap: 10,
                        opacity: isPast ? 0.5 : 1,
                      }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                            {slot.startTime} – {slot.endTime}
                          </div>
                          <span style={{
                            fontSize: 10, fontWeight: 700,
                            color: slot.isBooked ? '#92400E' : '#065F46',
                          }}>
                            {slot.isBooked ? '● Booked' : '○ Available'}
                          </span>
                        </div>
                        {!slot.isBooked && !isPast && (
                          <button onClick={() => removeSlot(slot.slotId)} style={{
                            width: 24, height: 24, borderRadius: 6,
                            background: '#FEE2E2', color: '#DC2626',
                            border: 'none', cursor: 'pointer', fontSize: 14, lineHeight: '24px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button onClick={() => navigate('/doctor/dashboard')} style={{ marginTop: 28, background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          ← Back to Dashboard
        </button>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
