import { Modal } from './Modal'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  isDangerous?: boolean
  isConfirming?: boolean
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
  isDangerous = true,
  isConfirming,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} className="max-w-sm">
      <p className="text-sm text-mist-300">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant={isDangerous ? 'danger' : 'primary'} onClick={onConfirm} disabled={isConfirming}>
          {isConfirming ? 'Working…' : confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
