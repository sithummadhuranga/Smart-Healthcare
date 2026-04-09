import { useEffect } from 'react';

interface Props {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: Props) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-lg shadow-lg text-white text-sm
        ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}
    >
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 font-bold text-lg leading-none">
        ×
      </button>
    </div>
  );
}
