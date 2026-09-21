import React, { useEffect, useState, useRef } from 'react';
import { useToastStore, ToastItem as ToastItemType } from '../stores/toastStore';
import {
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  Info,
  X,
  Sparkles,
} from 'lucide-react';

const ToastCard: React.FC<{
  item: ToastItemType;
  onClose: () => void;
}> = ({ item, onClose }) => {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const remainingRef = useRef<number>(item.duration || 4000);
  const totalDuration = item.duration || 4000;

  useEffect(() => {
    if (totalDuration <= 0) return;

    let animFrame: number;
    let lastTime = Date.now();

    const updateProgress = () => {
      if (!isPaused) {
        const now = Date.now();
        const elapsed = now - lastTime;
        lastTime = now;
        remainingRef.current = Math.max(0, remainingRef.current - elapsed);
        const pct = (remainingRef.current / totalDuration) * 100;
        setProgress(pct);

        if (remainingRef.current <= 0) {
          onClose();
          return;
        }
      } else {
        lastTime = Date.now();
      }
      animFrame = requestAnimationFrame(updateProgress);
    };

    animFrame = requestAnimationFrame(updateProgress);

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [isPaused, totalDuration, onClose]);

  const config = {
    success: {
      border: 'border-emerald-200/90',
      bg: 'bg-white/95',
      iconBg: 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white',
      titleColor: 'text-emerald-950',
      barColor: 'bg-emerald-500',
      icon: CheckCircle2,
    },
    error: {
      border: 'border-rose-200/90',
      bg: 'bg-white/95',
      iconBg: 'bg-gradient-to-tr from-rose-600 to-red-600 text-white',
      titleColor: 'text-rose-950',
      barColor: 'bg-rose-500',
      icon: AlertOctagon,
    },
    warning: {
      border: 'border-amber-200/90',
      bg: 'bg-white/95',
      iconBg: 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white',
      titleColor: 'text-amber-950',
      barColor: 'bg-amber-500',
      icon: AlertTriangle,
    },
    info: {
      border: 'border-blue-200/90',
      bg: 'bg-white/95',
      iconBg: 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white',
      titleColor: 'text-blue-950',
      barColor: 'bg-blue-600',
      icon: Info,
    },
  }[item.type];

  const Icon = config.icon;

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`pointer-events-auto w-full ${config.bg} backdrop-blur-md border ${config.border} rounded-2xl shadow-xl p-4 overflow-hidden relative group transition-all duration-200 animate-in slide-in-from-top-3 fade-in`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-xl ${config.iconBg} flex items-center justify-center shrink-0 shadow-2xs mt-0.5`}>
          <Icon className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0 pr-2">
          {item.title && (
            <h4 className={`text-xs font-black uppercase tracking-wider ${config.titleColor} mb-0.5`}>
              {item.title}
            </h4>
          )}
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed break-words font-medium">
            {item.message}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer shrink-0"
          title="Đóng thông báo"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress countdown bar */}
      {totalDuration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100">
          <div
            className={`h-full ${config.barColor} transition-all duration-75`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 sm:top-5 sm:right-5 z-[99999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none inset-x-4 sm:left-auto"
    >
      {toasts.map((item) => (
        <ToastCard
          key={item.id}
          item={item}
          onClose={() => removeToast(item.id)}
        />
      ))}
    </div>
  );
};
