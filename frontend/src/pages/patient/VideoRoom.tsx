import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { getCurrentUser } from '../../api';

export default function VideoRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const user = getCurrentUser();

  const jitsiUrl = `https://meet.jit.si/${roomId}#userInfo.displayName="${encodeURIComponent(user?.name ?? 'Patient')}"`;

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <Navbar />
      <div className="bg-gray-800 px-6 py-3 flex items-center justify-between border-b border-gray-700">
        <div className="text-white font-semibold">
          Video Consultation — Room: <span className="text-blue-400">{roomId}</span>
        </div>
        <button
          onClick={() => navigate('/patient/appointments')}
          className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-1.5 rounded-lg transition-colors"
        >
          End Session
        </button>
      </div>
      <div className="flex-1">
        <iframe
          src={jitsiUrl}
          allow="camera; microphone; fullscreen; display-capture"
          className="w-full h-full min-h-[80vh]"
          title="Video consultation"
        />
      </div>
    </div>
  );
}
