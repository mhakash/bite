import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import IconButton from './IconButton'
import './Sheet.css'

export default function Sheet({ open, onClose, title, children, footer }) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="sheet-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="sheet"
            onClick={(e) => e.stopPropagation()}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 300 }}
          >
            <div className="sheet__grip" />
            <div className="sheet__header">
              <h3>{title}</h3>
              <IconButton icon="close" variant="plain" onClick={onClose} aria-label="Close" />
            </div>
            <div className="sheet__body">{children}</div>
            {footer && <div className="sheet__footer">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
