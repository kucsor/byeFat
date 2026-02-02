'use client';

import { motion } from 'framer-motion';

export const DancingApple = () => (
  <motion.svg
    width="40"
    height="40"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    animate={{
      y: [0, -4, 0],
      rotate: [0, -5, 5, 0],
      scaleY: [1, 0.9, 1.1, 1],
    }}
    transition={{
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  >
    <path
      d="M12 5C10 3 6 3 4 5C2 7 2 11 4 15C6 19 10 21 12 21C14 21 18 19 20 15C22 11 22 7 20 5C18 3 14 3 12 5Z"
      fill="#FFB6C1"
      stroke="#FF69B4"
      strokeWidth="2"
    />
    <path
      d="M12 5V3"
      stroke="#4ade80"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M12 5C13 4 15 4 16 3"
      stroke="#4ade80"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </motion.svg>
);

export const PlayfulFlame = () => (
  <motion.svg
    width="40"
    height="40"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    animate={{
      scale: [1, 1.1, 0.9, 1.05, 1],
      y: [0, -2, 0],
    }}
    transition={{
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  >
    <motion.path
      d="M12 2C12 2 7 6 7 11C7 15.5 10.5 19 12 22C13.5 19 17 15.5 17 11C17 6 12 2 12 2Z"
      fill="#FFE082"
      stroke="#F59E0B"
      strokeWidth="2"
      animate={{
        d: [
            "M12 2C12 2 7 6 7 11C7 15.5 10.5 19 12 22C13.5 19 17 15.5 17 11C17 6 12 2 12 2Z",
            "M12 3C12 3 8 7 8 11.5C8 15 10.5 18 12 21C13.5 18 16 15 16 11.5C16 7 12 3 12 3Z",
            "M12 2C12 2 7 6 7 11C7 15.5 10.5 19 12 22C13.5 19 17 15.5 17 11C17 6 12 2 12 2Z"
        ]
      }}
      transition={{ duration: 1, repeat: Infinity }}
    />
    <path
      d="M12 11C12 11 10 13 10 15C10 17 11 18 12 19C13 18 14 17 14 15C14 13 12 11 12 11Z"
      fill="#F59E0B"
    />
  </motion.svg>
);

export const BouncyActivity = () => (
  <motion.svg
    width="40"
    height="40"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    animate={{
      scale: [1, 1.1, 1],
    }}
    transition={{
      duration: 1,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  >
    <path
      d="M13 15C13 15 11.5 13 10 13C8.5 13 7.5 14.5 7.5 16C7.5 17.5 9 19 11 19H17C19 19 21 17.5 21 15.5C21 13.5 19.5 12 17.5 12C16.5 12 15.5 12.5 15 13.5"
      stroke="#0d9488"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="#99f6e4"
    />
    <motion.path
      d="M15 13.5C15 13.5 15 10 13 8C11 6 8 6 8 6"
      stroke="#0d9488"
      strokeWidth="2"
      strokeLinecap="round"
      animate={{
        d: [
          "M15 13.5C15 13.5 15 10 13 8C11 6 8 6 8 6",
          "M15 13.5C15 13.5 17 10 16 8C15 6 13 6 13 6",
          "M15 13.5C15 13.5 15 10 13 8C11 6 8 6 8 6"
        ]
      }}
      transition={{ duration: 1, repeat: Infinity }}
    />
  </motion.svg>
);

export const HappyStar = () => (
  <motion.svg
    width="40"
    height="40"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    animate={{
      scale: [1, 1.2, 1],
      rotate: [0, 10, -10, 0],
    }}
    transition={{
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  >
    <path
      d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
      fill="#FEF08A"
      stroke="#EAB308"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <circle cx="9" cy="11" r="1" fill="#854d0e" />
    <circle cx="15" cy="11" r="1" fill="#854d0e" />
    <path d="M10 14C10 14 11 15 12 15C13 15 14 14 14 14" stroke="#854d0e" strokeWidth="1.5" strokeLinecap="round" />
  </motion.svg>
);

export const PlateCutlery = () => (
  <motion.svg
    width="40"
    height="40"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    animate={{
      scale: [1, 1.05, 1],
      rotate: [0, 2, -2, 0],
    }}
    transition={{
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  >
    {/* Plate */}
    <circle cx="12" cy="12" r="9" fill="#f0f9ff" stroke="#bae6fd" strokeWidth="2" />
    <circle cx="12" cy="12" r="6" stroke="#bae6fd" strokeWidth="1" strokeDasharray="2 2" />

    {/* Knife */}
    <motion.path
      d="M17 8V16"
      stroke="#94a3b8"
      strokeWidth="2"
      strokeLinecap="round"
      animate={{ y: [0, -1, 0] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    />
    <motion.path
      d="M17 16V18"
      stroke="#64748b"
      strokeWidth="2"
      strokeLinecap="round"
      animate={{ y: [0, -1, 0] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    />

    {/* Fork */}
    <motion.path
      d="M7 8V12M7 12V18M5 8V11M9 8V11"
      stroke="#94a3b8"
      strokeWidth="2"
      strokeLinecap="round"
      animate={{ y: [0, 1, 0] }}
      transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
    />
  </motion.svg>
);
