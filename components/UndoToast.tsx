
import React, { useEffect, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';

interface Props {
  message: string;
  onUndo: () => void;
  onClose: () => void;
  duration?: number;
}

const UndoToast: React.FC<Props> = ({ message, onUndo, onClose, duration = 10000 }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onClose();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration, onClose]);

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-md animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-slate-900 text-white rounded-2xl shadow-2xl overflow-hidden border border-white/10">
        <div className="p-4 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{message}</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { onUndo(); onClose(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
            >
              <RotateCcw size={14} /> Desfazer
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="h-1 bg-white/10">
          <div 
            className="h-full bg-indigo-500 transition-all duration-75 linear" 
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default UndoToast;
