import { useEffect } from 'react'

interface Props {
  title: string
  onClose: () => void
  children: React.ReactNode
}

export function Modal({ title, onClose, children }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-50 md:p-4">
      <div
        className="bg-gray-900 border border-gray-800 rounded-t-2xl md:rounded-2xl w-full md:max-w-md shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="font-semibold text-white text-base">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
