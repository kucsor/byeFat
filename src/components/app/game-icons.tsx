import { motion } from 'framer-motion';

export const LevelBadge = ({ level, className }: { level: number, className?: string }) => (
  <div className={`relative flex items-center justify-center ${className}`}>
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Shield Shape */}
      <path d="M50 5 L90 20 V50 C90 75 50 95 50 95 C50 95 10 75 10 50 V20 L50 5 Z"
            fill="url(#shieldGradient)" stroke="#B45309" strokeWidth="3"/>
      {/* Inner Detail */}
      <path d="M50 15 L80 26 V48 C80 65 50 82 50 82 C50 82 20 65 20 48 V26 L50 15 Z"
            fill="rgba(0,0,0,0.2)" />
      <defs>
        <linearGradient id="shieldGradient" x1="10" y1="5" x2="90" y2="95" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
    </svg>
    <div className="absolute inset-0 flex items-center justify-center pt-2">
      <span className="text-xl font-black text-amber-900 drop-shadow-sm font-serif">{level}</span>
    </div>
  </div>
);

export const XPCrystal = ({ className }: { className?: string }) => (
    <motion.svg
        viewBox="0 0 24 24"
        className={className}
        initial={{ y: 0 }}
        animate={{ y: [-2, 2, -2] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
    >
        <path d="M12 2L4 10L12 22L20 10L12 2Z" fill="url(#crystalGradient)" stroke="#7C3AED" strokeWidth="1" strokeLinejoin="round" />
        <path d="M12 2L12 22M4 10L20 10" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
        <defs>
            <linearGradient id="crystalGradient" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#C4B5FD" />
                <stop offset="50%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#6D28D9" />
            </linearGradient>
        </defs>
    </motion.svg>
);

export const QuestScroll = ({ className }: { className?: string }) => (
     <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z" fill="#FEF3C7" stroke="#92400E" />
        <path d="M7 8H17" stroke="#92400E" strokeLinecap="round" />
        <path d="M7 12H17" stroke="#92400E" strokeLinecap="round" />
        <path d="M7 16H13" stroke="#92400E" strokeLinecap="round" />
        <path d="M15 2L15 4" stroke="#92400E" strokeLinecap="round" />
        <path d="M9 2L9 4" stroke="#92400E" strokeLinecap="round" />
     </svg>
);

export const InventoryIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none">
        <path d="M20 7L12 3L4 7M20 7L12 11M20 7V17L12 21M12 11L4 7M12 11V21M4 7V17L12 21" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
);

export const ManaPotion = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none">
         <path d="M12 2L12 6" stroke="currentColor" strokeWidth="2" />
         <path d="M10 6H14L18 10V18C18 20.2091 16.2091 22 14 22H10C7.79086 22 6 20.2091 6 18V10L10 6Z" fill="#60A5FA" stroke="currentColor" strokeWidth="2" />
         <circle cx="10" cy="14" r="1" fill="white" fillOpacity="0.5" />
         <circle cx="14" cy="16" r="1.5" fill="white" fillOpacity="0.5" />
         <circle cx="11" cy="18" r="0.5" fill="white" fillOpacity="0.5" />
    </svg>
);
