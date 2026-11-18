import React from 'react';

export const BrandLogo: React.FC<{ type: string; className?: string }> = ({
  type,
  className = 'w-10 h-10',
}) => {
  switch (type) {
    case 'digicert':
      return (
        <div className={`${className} rounded-2xl bg-[#0066CC] flex items-center justify-center p-2 shadow-xs text-white`}>
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v10M7 12h10" strokeLinecap="round" />
          </svg>
        </div>
      );

    case 'sectigo':
      return (
        <div className={`${className} rounded-2xl bg-[#26B573] flex items-center justify-center p-2 shadow-xs text-white`}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
            <path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4zm-1 14l-3-3 1.41-1.41L11 13.17l5.59-5.59L18 9l-7 7z" />
          </svg>
        </div>
      );

    case 'globalsign':
      return (
        <div className={`${className} rounded-2xl bg-[#0F172A] flex items-center justify-center p-2 shadow-xs text-[#00A3E0]`}>
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="4" fill="#00A3E0" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </div>
      );

    case 'godaddy':
      return (
        <div className={`${className} rounded-2xl bg-[#00A6A6] flex items-center justify-center p-2 shadow-xs text-white`}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>
      );

    case 'sslstore':
      return (
        <div className={`${className} rounded-2xl bg-[#2B3890] flex items-center justify-center p-2 shadow-xs text-[#39B54A]`}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
          </svg>
        </div>
      );

    case 'emsign':
      return (
        <div className={`${className} rounded-2xl bg-[#6A1B9A] flex items-center justify-center p-2 shadow-xs text-white`}>
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
      );

    case 'letsencrypt':
      return (
        <div className={`${className} rounded-2xl bg-[#E77E23] flex items-center justify-center p-2 shadow-xs text-white`}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-9-4zm0 6c1.66 0 3 1.34 3 3v2h1v4H8v-4h1v-2c0-1.66 1.34-3 3-3zm0 2c-.55 0-1 .45-1 1v2h2v-2c0-.55-.45-1-1-1z" />
          </svg>
        </div>
      );

    case 'zerossl':
      return (
        <div className={`${className} rounded-2xl bg-[#0084FF] flex items-center justify-center p-2 shadow-xs text-white`}>
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth="3">
            <path d="M12 4v16M4 12h16" strokeLinecap="round" />
          </svg>
        </div>
      );

    case 'buypass':
      return (
        <div className={`${className} rounded-2xl bg-[#0072CE] flex items-center justify-center p-2 shadow-xs text-white`}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6a6 6 0 0 0-6 6h3a3 3 0 0 1 3-3V6z" fill="#FFF" />
          </svg>
        </div>
      );

    case 'telia':
      return (
        <div className={`${className} rounded-2xl bg-[#990099] flex items-center justify-center p-2 shadow-xs text-white`}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
          </svg>
        </div>
      );

    case 'custom_acme':
      return (
        <div className={`${className} rounded-2xl bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center p-2 shadow-xs text-slate-500`}>
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
        </div>
      );

    case 'msca':
      return (
        <div className={`${className} rounded-2xl bg-[#0078D4] flex items-center justify-center p-2 shadow-xs text-white`}>
          <div className="grid grid-cols-2 gap-1 w-5 h-5">
            <div className="bg-[#F25022] rounded-xs" />
            <div className="bg-[#7FBA00] rounded-xs" />
            <div className="bg-[#00A4EF] rounded-xs" />
            <div className="bg-[#FFB900] rounded-xs" />
          </div>
        </div>
      );

    case 'aws':
      return (
        <div className={`${className} rounded-2xl bg-[#FF9900] flex items-center justify-center p-2 shadow-xs text-white`}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
          </svg>
        </div>
      );

    case 'azure':
      return (
        <div className={`${className} rounded-2xl bg-[#0089D6] flex items-center justify-center p-2 shadow-xs text-white`}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
            <path d="M13.05 3.38l-4.14 7.6 5.12 7.74-6.84 1.9-4.89-8.47 5.9-9.14 4.85.37zm7.04 15.75l-7.39-12.02 3.65-.24 5.75 9.77-2.01 2.49z" />
          </svg>
        </div>
      );

    case 'vault':
      return (
        <div className={`${className} rounded-2xl bg-[#18181B] flex items-center justify-center p-2 shadow-xs text-amber-400`}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-9-4zm0 4a3 3 0 0 1 3 3v2h1v4H8v-4h1V8a3 3 0 0 1 3-3z" />
          </svg>
        </div>
      );

    case 'kubernetes':
      return (
        <div className={`${className} rounded-2xl bg-[#326CE5] flex items-center justify-center p-2 shadow-xs text-white`}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
            <path d="M12 2l8.66 5v10L12 22l-8.66-5V7L12 2zm0 3.3L5.34 8.7v6.6L12 18.7l6.66-3.4V8.7L12 5.3zm0 4.2a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z" />
          </svg>
        </div>
      );

    default:
      return (
        <div className={`${className} rounded-2xl bg-blue-500 text-white flex items-center justify-center p-2 shadow-xs`}>
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
      );
  }
};
