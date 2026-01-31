'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Bot, ScanLine, Flame, Soup } from 'lucide-react';
import { Button } from '@/components/ui/button';

type FabMenuProps = {
  onAddFood: () => void;
  onLogActivity: () => void;
  onScanBarcode: () => void;
  onAiCalculator: () => void;
};

const menuVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      when: "beforeChildren",
      staggerChildren: 0.05,
    }
  },
};

export function FabMenu({ onAddFood, onLogActivity, onScanBarcode, onAiCalculator }: FabMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleActionClick = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  const actions = [
    { 
      label: "AI Calculator", 
      icon: Bot, 
      action: onAiCalculator,
      color: "bg-secondary hover:bg-secondary/90 text-white",
      shadowColor: "shadow-secondary/30"
    },
    { 
      label: "Log Activity", 
      icon: Flame, 
      action: onLogActivity,
      color: "bg-accent hover:bg-accent/90 text-white",
      shadowColor: "shadow-accent/30"
    },
    { 
      label: "Add Food", 
      icon: Soup, 
      action: onAddFood,
      color: "bg-primary hover:bg-primary/90 text-white",
      shadowColor: "shadow-primary/30"
    },
    { 
      label: "Scan Barcode", 
      icon: ScanLine, 
      action: onScanBarcode,
      color: "bg-foreground/80 hover:bg-foreground text-white",
      shadowColor: "shadow-foreground/30"
    },
  ];

  return (
    <div className="fixed bottom-24 right-6 z-50 md:bottom-6">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="mb-4 flex flex-col items-end gap-4"
          >
            {actions.map((item, index) => (
               <motion.div 
                  key={index} 
                  className="flex items-center gap-3"
                  custom={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
               >
                <span className="bg-card text-card-foreground rounded-md px-2 py-1 text-sm shadow-md">{item.label}</span>
                <Button 
                  size="icon" 
                  className={`h-12 w-12 rounded-full shadow-lg ${item.color} ${item.shadowColor} border-0`} 
                  onClick={() => handleActionClick(item.action)}
                >
                  <item.icon className="h-5 w-5" />
                </Button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <Button
        size="icon"
        className="h-16 w-16 rounded-full shadow-2xl border-4 border-background"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={isOpen ? 'x' : 'plus'}
            initial={{ rotate: -45, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 45, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2 }}
          >
            {isOpen ? <X className="h-8 w-8" /> : <Plus className="h-8 w-8" />}
          </motion.div>
        </AnimatePresence>
      </Button>
    </div>
  );
}
