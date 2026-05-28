import { Modal } from './Modal'

interface Props {
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger = true, onConfirm, onCancel }: Props) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="flex flex-col gap-4">
        <p className="text-gray-300 text-sm">{message}</p>
        <div className="flex gap-3 justify-end pt-1">
          <button onClick={onCancel} className="text-sm text-gray-400 hover:text-white px-3 py-2">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
