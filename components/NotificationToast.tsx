// components/NotificationToast.tsx
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BellRing, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NotificationToastProps {
  isVisible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  autoClose?: number;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  isVisible,
  title,
  message,
  onClose,
  autoClose = 5000
}) => {
  useEffect(() => {
    if (isVisible && autoClose > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoClose);
      return () => clearTimeout(timer);
    }
  }, [isVisible, autoClose, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: -50, x: '-50%' }}
          className="fixed top-4 left-1/2 z-50 w-[90%] max-w-md"
        >
          <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg shadow-lg overflow-hidden">
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <BellRing className="h-5 w-5 text-yellow-600 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-yellow-800">{title}</p>
                  <p className="text-xs text-yellow-700 mt-1">{message}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100"
                  onClick={onClose}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="h-1 bg-yellow-500 animate-progress" style={{ animationDuration: `${autoClose}ms` }} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};