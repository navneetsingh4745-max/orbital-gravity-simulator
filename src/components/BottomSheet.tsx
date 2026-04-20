import React, { ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({ isOpen, onClose, title, children }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            className="fixed bottom-0 left-0 right-0 glass text-slate-100 rounded-t-3xl shadow-2xl shadow-black z-50 overflow-hidden flex flex-col max-h-[80vh] border-t border-white/10"
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, { offset, velocity }) => {
              if (offset.y > 100 || velocity.y > 500) {
                onClose();
              }
            }}
          >
            <div className="flex justify-center p-3 cursor-grab active:cursor-grabbing">
              <div className="w-12 h-1 bg-slate-600 rounded-full" />
            </div>
            <div className="px-6 flex justify-between items-center mb-4 min-h-[32px]">
              {title && <h2 className="text-xs font-bold uppercase tracking-widest text-teal-400">{title}</h2>}
              {!title && <div></div>}
              <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-800/50 text-slate-400 transition ml-auto">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 pb-6 overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
