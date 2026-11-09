import { useEffect, useState } from 'react'
import { XIcon } from './icons'
import Select from './Select'

type Member = { user: { id: string; name: string; email: string } }
type CardData = {
  id: string
  title: string
  description?: string | null
  dueDate?: string | null
  assigneeId?: string | null
  assignee?: { id: string; name: string } | null
}

type Props = {
  card: CardData | null
  members: Member[]
  onClose: () => void
  onSave: (patch: { title: string; description: string; dueDate: string | null; assigneeId: string | null }) => void
  onDelete: () => void
}

function colorFor(id: string) {
  const COLORS = ['#8b5cf6', '#22d3ee', '#f472b6', '#f59e0b', '#34d399']
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % COLORS.length
  return COLORS[h]
}

export default function CardModal({ card, members, onClose, onSave, onDelete }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [assigneeId, setAssigneeId] = useState('')

  useEffect(() => {
    if (!card) return
    setTitle(card.title)
    setDescription(card.description || '')
    setDueDate(card.dueDate ? card.dueDate.slice(0, 10) : '')
    setAssigneeId(card.assigneeId || '')
  }, [card])

  if (!card) return null

  function save() {
    onSave({
      title: title.trim() || card!.title,
      description,
      dueDate: dueDate || null,
      assigneeId: assigneeId || null,
    })
    onClose()
  }

  return (
    <div className="modal-overlay fade-in" onClick={onClose}>
      <div className="modal pop-in" onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <input
              className="input"
              style={{ fontSize: 17, fontWeight: 700, border: 'none', background: 'transparent', padding: '4px 0' }}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <button className="icon-btn" onClick={onClose} title="Fermer"><XIcon size={14} /></button>
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>DESCRIPTION</label>
            <textarea
              className="input"
              placeholder="Ajoute plus de détails..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 160px' }}>
              <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>ÉCHÉANCE</label>
              <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div style={{ flex: '1 1 160px' }}>
              <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>ASSIGNÉ À</label>
              <Select
                value={assigneeId}
                onChange={setAssigneeId}
                placeholder="Personne"
                options={[{ value: '', label: 'Personne' }, ...members.map((m) => ({ value: m.user.id, label: m.user.name }))]}
              />
            </div>
          </div>

          {assigneeId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="avatar" style={{ width: 22, height: 22, fontSize: 10, background: colorFor(assigneeId) }}>
                {(members.find((m) => m.user.id === assigneeId)?.user.name || '?').slice(0, 2).toUpperCase()}
              </div>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                {members.find((m) => m.user.id === assigneeId)?.user.name}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: '1px solid var(--line-soft)' }}>
            <button className="btn-danger" onClick={onDelete}>Supprimer la carte</button>
            <button className="btn-primary" onClick={save}>Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  )
}
