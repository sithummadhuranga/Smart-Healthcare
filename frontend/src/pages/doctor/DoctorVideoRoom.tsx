import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AgoraRTC, { type IAgoraRTCClient, type ICameraVideoTrack, type IMicrophoneAudioTrack, type IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';
import api, { getCurrentUser } from '../../api';
import Navbar from '../../components/Navbar';
import Toast from '../../components/Toast';

export default function DoctorVideoRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const user = getCurrentUser();

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const localTracksRef = useRef<{ audio: IMicrophoneAudioTrack | null; video: ICameraVideoTrack | null }>({ audio: null, video: null });

  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(true);
  const [remoteUser, setRemoteUser] = useState<IAgoraRTCRemoteUser | null>(null);
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [ending, setEnding] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [error, setError] = useState('');
  const [sessionInfo, setSessionInfo] = useState<{ status?: string } | null>(null);

  const cleanup = useCallback(async () => {
    const tracks = localTracksRef.current;
    if (tracks.audio) { tracks.audio.close(); localTracksRef.current.audio = null; }
    if (tracks.video) { tracks.video.close(); localTracksRef.current.video = null; }
    if (clientRef.current) {
      await clientRef.current.leave().catch(() => {});
      clientRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!roomId) return;
    startAndJoin();
    return () => { cleanup(); };
  }, [roomId]);

  function resolveJoinErrorMessage(err: unknown): string {
    const apiMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
    if (apiMsg) {
      return apiMsg;
    }

    const text = err instanceof Error ? err.message : String(err ?? '');
    if (/^Network Error$/i.test(text)) {
      return 'Cannot reach backend services. Ensure API Gateway is running on port 3000 and refresh the page.';
    }
    if (/NotAllowedError|Permission denied|permission/i.test(text)) {
      return 'Camera or microphone permission was denied. Allow access in your browser site settings and retry.';
    }
    if (/NotFoundError|DevicesNotFoundError|device not found|Requested device not found/i.test(text)) {
      return 'No camera or microphone device was found. Connect a device and try again.';
    }

    if (text && text.trim().length > 0) {
      return text;
    }

    return 'Failed to join video call. Please check your camera and microphone permissions.';
  }

  async function startAndJoin() {
    try {
      try {
        const { data: info } = await api.get(`/api/telemedicine/${roomId}`);
        setSessionInfo(info);
      } catch {
        setSessionInfo(null);
      }

      // Start the telemedicine session (marks appointment IN_PROGRESS)
      try {
        await api.post('/api/telemedicine/start', { appointmentId: roomId });
      } catch {
        // Session might already be started — continue
      }

      // Get Agora token
      const { data } = await api.post('/api/telemedicine/token', { appointmentId: roomId });
      const { token, channelName, uid, appId } = data;

      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      clientRef.current = client;

      client.on('user-published', async (rUser, mediaType) => {
        await client.subscribe(rUser, mediaType);
        if (mediaType === 'video') {
          setRemoteUser(rUser);
          setTimeout(() => {
            if (remoteVideoRef.current) {
              rUser.videoTrack?.play(remoteVideoRef.current);
            }
          }, 100);
        }
        if (mediaType === 'audio') {
          rUser.audioTrack?.play();
        }
      });

      client.on('user-unpublished', (rUser, mediaType) => {
        if (mediaType === 'video') {
          setRemoteUser((prev) => prev?.uid === rUser.uid ? null : prev);
        }
      });

      client.on('user-left', (rUser) => {
        if (remoteUser?.uid === rUser.uid) setRemoteUser(null);
      });

      await client.join(appId, channelName, token, uid);

      // Join channel first, then publish whichever local tracks are available.
      let audioTrack: IMicrophoneAudioTrack | null = null;
      let videoTrack: ICameraVideoTrack | null = null;

      try {
        [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
      } catch (mediaError) {
        try {
          audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        } catch {
          audioTrack = null;
        }

        try {
          videoTrack = await AgoraRTC.createCameraVideoTrack();
        } catch {
          videoTrack = null;
        }

        setToast({
          message: resolveJoinErrorMessage(mediaError),
          type: 'error',
        });
      }

      localTracksRef.current = { audio: audioTrack, video: videoTrack };

      if (videoTrack && localVideoRef.current) {
        videoTrack.play(localVideoRef.current);
      }

      const tracksToPublish = [audioTrack, videoTrack].filter((t): t is IMicrophoneAudioTrack | ICameraVideoTrack => Boolean(t));
      if (tracksToPublish.length > 0) {
        await client.publish(tracksToPublish);
      }

      setJoined(true);
    } catch (err: unknown) {
      console.error('Failed to join video call:', err);
      setError(resolveJoinErrorMessage(err));
    } finally {
      setJoining(false);
    }
  }

  async function toggleAudio() {
    const track = localTracksRef.current.audio;
    if (track) {
      await track.setEnabled(audioMuted);
      setAudioMuted(!audioMuted);
    }
  }

  async function toggleVideo() {
    const track = localTracksRef.current.video;
    if (track) {
      await track.setEnabled(videoMuted);
      setVideoMuted(!videoMuted);
    }
  }

  async function endSession() {
    setEnding(true);
    try {
      await api.post('/api/telemedicine/end', { appointmentId: roomId });
      setToast({ message: 'Consultation ended successfully.', type: 'success' });
      await cleanup();
      setTimeout(() => navigate('/doctor/appointments'), 1500);
    } catch {
      setToast({ message: 'Failed to end session. Please try again.', type: 'error' });
      setEnding(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0F172A', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {/* Top bar */}
      <div style={{ background: '#1E293B', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #334155' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: joined ? '#22C55E' : '#F59E0B' }} />
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>
            Doctor Consultation {joined ? '— Live' : joining ? '— Connecting…' : ''}
          </span>
        </div>
        <span style={{ color: '#64748B', fontSize: 12 }}>Dr. {user?.name} | Room: {roomId?.slice(0, 8)}…{sessionInfo?.status ? ` | Status: ${sessionInfo.status}` : ''}</span>
      </div>

      {/* Video area */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative' }}>
        {error ? (
          <div style={{ textAlign: 'center', color: '#fff' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📹</div>
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Could not start the consultation</p>
            <p style={{ fontSize: 13, color: '#94A3B8', maxWidth: 400 }}>{error}</p>
            <button onClick={() => navigate('/doctor/appointments')} style={{ marginTop: 20, padding: '10px 24px', borderRadius: 9, background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
              Back to Appointments
            </button>
          </div>
        ) : joining ? (
          <div style={{ textAlign: 'center', color: '#fff' }}>
            <div className="animate-pulse" style={{ width: 64, height: 64, borderRadius: 16, background: '#1E293B', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>📹</div>
            <p style={{ fontWeight: 600, fontSize: 15 }}>Starting consultation session…</p>
            <p style={{ color: '#64748B', fontSize: 12, marginTop: 4 }}>Setting up camera and microphone</p>
          </div>
        ) : (
          <>
            {/* Remote video (large) */}
            <div ref={remoteVideoRef} style={{
              width: '100%', maxWidth: 900, aspectRatio: '16/9', borderRadius: 16,
              background: '#1E293B', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {!remoteUser && (
                <div style={{ textAlign: 'center', color: '#64748B' }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>👤</div>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>Waiting for patient to join…</p>
                </div>
              )}
            </div>

            {/* Local video (PIP) */}
            <div ref={localVideoRef} style={{
              position: 'absolute', bottom: 24, right: 40, width: 200, height: 150,
              borderRadius: 12, overflow: 'hidden', border: '2px solid #334155',
              background: '#0F172A',
            }} />
          </>
        )}
      </div>

      {/* Controls */}
      {joined && (
        <div style={{ background: '#1E293B', padding: '14px 24px', display: 'flex', justifyContent: 'center', gap: 16, borderTop: '1px solid #334155' }}>
          <button onClick={toggleAudio} style={{
            width: 48, height: 48, borderRadius: '50%',
            background: audioMuted ? '#DC2626' : '#334155', color: '#fff',
            border: 'none', cursor: 'pointer', fontSize: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {audioMuted ? '🔇' : '🎤'}
          </button>
          <button onClick={toggleVideo} style={{
            width: 48, height: 48, borderRadius: '50%',
            background: videoMuted ? '#DC2626' : '#334155', color: '#fff',
            border: 'none', cursor: 'pointer', fontSize: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {videoMuted ? '📷' : '🎥'}
          </button>
          <button onClick={endSession} disabled={ending} style={{
            padding: '0 24px', height: 48, borderRadius: 24,
            background: '#DC2626', color: '#fff',
            border: 'none', cursor: ending ? 'not-allowed' : 'pointer',
            fontWeight: 700, fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 8,
            opacity: ending ? 0.6 : 1,
          }}>
            📞 {ending ? 'Ending…' : 'End Consultation'}
          </button>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
