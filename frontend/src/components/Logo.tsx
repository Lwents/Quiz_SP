import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  className?: string;
  badgeText?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showSubtitle = false,
  className = '',
  badgeText = 'PRO'
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const badgeSizes = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-2.5 py-0.5',
  };

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Premium SVG Emblem Icon */}
      <div className={`${iconSizes[size]} shrink-0 drop-shadow-sm`}>
        <svg viewBox="0 0 128 128" fill="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="logoBgGrad" x1="16" y1="16" x2="112" y2="112" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="50%" stopColor="#1D4ED8" />
              <stop offset="100%" stopColor="#1E40AF" />
            </linearGradient>
            <linearGradient id="logoSparkGrad" x1="74" y1="74" x2="106" y2="106" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
            <linearGradient id="logoCapGrad" x1="30" y1="30" x2="98" y2="70" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#E0E7FF" />
            </linearGradient>
            <filter id="logoShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#0F172A" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Squircle base */}
          <rect x="8" y="8" width="112" height="112" rx="28" fill="url(#logoBgGrad)" />
          <rect x="9" y="9" width="110" height="110" rx="27" stroke="#93C5FD" strokeOpacity="0.4" strokeWidth="2" />

          {/* Academic Cap */}
          <polygon points="64,28 102,46 64,64 26,46" fill="url(#logoCapGrad)" filter="url(#logoShadow)" />
          <path d="M39 55.5 V69 C39 77 50 83 64 83 C78 83 89 77 89 69 V55.5 L64 67 Z" fill="#BFDBFE" />

          {/* Tassel */}
          <path d="M64 46 L95 62 V76" stroke="#FDE68A" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="95" cy="78" r="3.5" fill="#F59E0B" />

          {/* Exam Achievement Badge */}
          <circle cx="92" cy="92" r="19" fill="#FFFFFF" filter="url(#logoShadow)" />
          <circle cx="92" cy="92" r="15.5" fill="url(#logoSparkGrad)" />
          <path d="M85 92.5 L89.5 97 L99 86.5" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`font-black tracking-tight text-slate-900 ${textSizes[size]}`}>
            HNUE
          </span>
          <span className={`font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white rounded-md uppercase tracking-wider shadow-xs ${badgeSizes[size]}`}>
            {badgeText}
          </span>
        </div>
        {showSubtitle && (
          <span className="text-[11px] font-semibold text-slate-500 tracking-tight mt-0.5">
            Khảo thí & Luyện tập SP
          </span>
        )}
      </div>
    </div>
  );
};
