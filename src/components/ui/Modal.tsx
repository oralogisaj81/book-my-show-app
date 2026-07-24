import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className={cn(
              'relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-ink-600 bg-ink-850 p-6 shadow-card',
              className,
            )}
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.18 }}
          >
            <div className="mb-4 flex items-center justify-between">
              {title && <h2 className="text-lg font-semibold text-mist-100">{title}</h2>}
              <button
                onClick={onClose}
                className="ml-auto rounded-full p-1.5 text-mist-400 hover:bg-ink-700 hover:text-mist-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
