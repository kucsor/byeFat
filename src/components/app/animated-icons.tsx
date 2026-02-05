'use client';

import { motion } from 'framer-motion';

// --- FUTURISTIC ICONS SET ---

export const CyberFlame = () => (
  <motion.svg
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="drop-shadow-[0_0_10px_rgba(255,165,0,0.5)]"
  >
    <defs>
      <linearGradient id="flameGradient" x1="12" y1="2" x2="12" y2="22">
        <stop offset="0%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#EF4444" />
      </linearGradient>
    </defs>
    <motion.path
      d="M12 2C12 2 8 7 8 12C8 16.5 10.5 19 12 22C13.5 19 16 16.5 16 12C16 7 12 2 12 2Z"
      stroke="url(#flameGradient)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="url(#flameGradient)"
      fillOpacity="0.2"
      animate={{
        d: [
            "M12 2C12 2 8 7 8 12C8 16.5 10.5 19 12 22C13.5 19 16 16.5 16 12C16 7 12 2 12 2Z",
            "M12 3C12 3 8.5 7.5 8.5 12C8.5 15.5 10.5 18 12 21C13.5 18 15.5 15.5 15.5 12C15.5 7.5 12 3 12 3Z",
            "M12 2C12 2 8 7 8 12C8 16.5 10.5 19 12 22C13.5 19 16 16.5 16 12C16 7 12 2 12 2Z"
        ],
        filter: ["brightness(1)", "brightness(1.3)", "brightness(1)"]
      }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.path
        d="M12 12L12 16"
        stroke="#FCD34D"
        strokeWidth="2"
        strokeLinecap="round"
        animate={{ height: [4, 6, 4], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1, repeat: Infinity }}
    />
  </motion.svg>
);

export const NeonPulse = () => (
  <motion.svg
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="drop-shadow-[0_0_8px_rgba(0,102,255,0.6)]"
  >
    <path
      d="M3 12H6L9 3L13 21L17 12H21"
      stroke="#0066FF"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeOpacity="0.2"
    />
    <motion.path
      d="M3 12H6L9 3L13 21L17 12H21"
      stroke="#0066FF"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
    />
  </motion.svg>
);

export const QuantumFood = () => (
  <motion.svg
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="appleGradient" x1="0" y1="0" x2="24" y2="24">
        <stop offset="0%" stopColor="#34D399" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
    </defs>
    <motion.circle
        cx="12" cy="13" r="8"
        stroke="url(#appleGradient)"
        strokeWidth="2"
        fill="url(#appleGradient)"
        fillOpacity="0.1"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
    />
    <path d="M12 5V2" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
    <path d="M12 5C14 4 16 4 17 3" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />

    {/* Digital Grid Overlay */}
    <rect x="8" y="9" width="2" height="2" fill="#10B981" fillOpacity="0.5" />
    <rect x="14" y="9" width="2" height="2" fill="#10B981" fillOpacity="0.5" />
    <rect x="8" y="15" width="2" height="2" fill="#10B981" fillOpacity="0.5" />
    <rect x="14" y="15" width="2" height="2" fill="#10B981" fillOpacity="0.5" />
  </motion.svg>
);

export const DataShield = () => (
  <motion.svg
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="drop-shadow-[0_0_10px_rgba(0,217,255,0.4)]"
  >
    <motion.path
      d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z"
      stroke="#00D9FF"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="#00D9FF"
      fillOpacity="0.05"
      animate={{ strokeOpacity: [0.5, 1, 0.5] }}
      transition={{ duration: 2, repeat: Infinity }}
    />
    <motion.path
      d="M9 12L11 14L15 10"
      stroke="#00D9FF"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
    />
  </motion.svg>
);

// --- COMPATIBILITY EXPORTS (Aliasing old names to new icons temporarily) ---
export const DancingApple = QuantumFood;
export const PlayfulFlame = CyberFlame;
export const BouncyActivity = NeonPulse;
export const HappyStar = DataShield; // Approximate mapping
export const PlateCutlery = QuantumFood;
