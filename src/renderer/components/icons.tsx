// Ícones SVG inline (sem dependências externas). Herdam currentColor.
import React from "react";

type P = { className?: string };
const base = "h-5 w-5";

export const IconPainel = ({ className }: P) => (
  <svg className={className ?? base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" />
  </svg>
);
export const IconSolicitacoes = ({ className }: P) => (
  <svg className={className ?? base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16v12H5.2L4 17.5V4Z" /><path d="M8 8h8M8 12h5" />
  </svg>
);
export const IconProcessos = ({ className }: P) => (
  <svg className={className ?? base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="6" r="2.5" /><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="12" r="2.5" />
    <path d="M8.5 6H14M8.5 18H14M9 7.5 15.5 11M15.5 13 9 16.5" />
  </svg>
);
export const IconRevisao = ({ className }: P) => (
  <svg className={className ?? base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l2.5 2.5L16 8" /><rect x="3.5" y="3.5" width="17" height="17" rx="3" />
  </svg>
);
export const IconBase = ({ className }: P) => (
  <svg className={className ?? base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
  </svg>
);
export const IconRelatorios = ({ className }: P) => (
  <svg className={className ?? base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
);
export const IconConfig = ({ className }: P) => (
  <svg className={className ?? base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
  </svg>
);
export const IconMail = ({ className }: P) => (
  <svg className={className ?? base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" />
  </svg>
);
export const IconClock = ({ className }: P) => (
  <svg className={className ?? base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
  </svg>
);
export const IconRefresh = ({ className }: P) => (
  <svg className={className ?? base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v5h-5" />
  </svg>
);
export const IconCopy = ({ className }: P) => (
  <svg className={className ?? base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </svg>
);
export const IconCheck = ({ className }: P) => (
  <svg className={className ?? base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m20 6-11 11-5-5" />
  </svg>
);
export const IconArchive = ({ className }: P) => (
  <svg className={className ?? base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="4" rx="1" /><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4" />
  </svg>
);
