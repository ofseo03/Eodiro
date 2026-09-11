import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({ className: "icon", viewBox: "0 0 24 24", "aria-hidden": true, ...p });

export const GearIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);
export const PinIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);
export const CheckIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="m5 12 5 5L20 7" />
  </svg>
);
export const ChevronDownIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
export const CloseIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const LockIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="11" width="18" height="10" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
export const CloudIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 16.6A5 5 0 0 0 18 7h-1.3A8 8 0 1 0 4 15" />
    <path d="M8 19l4 4 4-4" />
  </svg>
);
export const BusIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="4" y="3" width="16" height="14" rx="3" />
    <path d="M4 11h16M8 21l1-4M16 21l-1-4" />
  </svg>
);
export const SubwayIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="5" y="3" width="14" height="15" rx="4" />
    <path d="M5 11h14M9 22l-2-4M15 22l2-4" />
    <circle cx="9" cy="15" r="1" />
    <circle cx="15" cy="15" r="1" />
  </svg>
);
export const RefreshIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 12a8 8 0 1 1-2.3-5.7" />
    <path d="M20 4v5h-5" />
  </svg>
);
export const WalkIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M13 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM9 22l2-6 2 2v4M7 12l2-4 3 1 2 3 3 1" />
  </svg>
);
export const TaxiIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 17h14l-1-6H6zM9 11l1-4h4l1 4M4 17v3M20 17v3M8 6h8" />
  </svg>
);
export const CafeIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M17 8h1a4 4 0 0 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z" />
  </svg>
);
export const FoodIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 11h18M5 11l1 9h12l1-9M8 11V6a4 4 0 0 1 8 0v5" />
  </svg>
);
export const PlayIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="4" width="18" height="14" rx="2" />
    <path d="M3 10h18M8 22h8" />
  </svg>
);
export const LocateIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
  </svg>
);
export const SearchIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);
export const MapIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z" />
    <path d="M9 4v14M15 6v14" />
  </svg>
);
