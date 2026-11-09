type Props = {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmer', danger, onConfirm, onCancel }: Props) {
  if (!open) return null
  return (
    <div className="modal-overlay fade-in" onClick={onCancel}>
      <div className="modal pop-in" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: 22 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 17 }}>{title}</h3>
          <p style={{ margin: '0 0 18px', color: 'var(--muted)', fontSize: 14, lineHeight: 1.5 }}>{message}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn-ghost" onClick={onCancel}>Annuler</button>
            <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>{confirmLabel}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
