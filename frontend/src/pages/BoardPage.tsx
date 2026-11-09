import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { useAuth } from '../lib/auth'
import { apiFetch } from '../lib/api'
import { getSocket } from '../lib/socket'
import { useToast } from '../lib/toast'
import ConfirmDialog from '../components/ConfirmDialog'
import CardModal from '../components/CardModal'
import ThemeToggle from '../components/ThemeToggle'
import { TrashIcon, XIcon, CalendarIcon, ChevronLeftIcon, UsersIcon } from '../components/icons'

type Card = {
  id: string
  title: string
  description?: string | null
  position: number
  listId: string
  dueDate?: string | null
  assigneeId?: string | null
  assignee?: { id: string; name: string } | null
}
type List = { id: string; title: string; position: number; cards: Card[] }
type Member = { userId: string; role: string; user: { id: string; name: string; email: string } }
type BoardDetail = { id: string; title: string; lists: List[]; members: Member[] }
type Presence = { socketId: string; userId: string; name: string }
type Cursor = { userId: string; name: string; x: number; y: number }

const COLORS = ['#8b5cf6', '#22d3ee', '#f472b6', '#f59e0b', '#34d399']
function colorFor(id: string) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % COLORS.length
  return COLORS[h]
}

function formatDue(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}
function isOverdue(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d < today
}

export default function BoardPage() {
  const { id } = useParams<{ id: string }>()
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [board, setBoard] = useState<BoardDetail | null>(null)
  const [presence, setPresence] = useState<Presence[]>([])
  const [cursors, setCursors] = useState<Record<string, Cursor>>({})
  const [newListTitle, setNewListTitle] = useState('')
  const [addingCardFor, setAddingCardFor] = useState<string | null>(null)
  const [newCardTitle, setNewCardTitle] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [openCard, setOpenCard] = useState<Card | null>(null)
  const [editingListId, setEditingListId] = useState<string | null>(null)
  const [editingListTitle, setEditingListTitle] = useState('')
  const [listToDelete, setListToDelete] = useState<List | null>(null)
  const [membersOpen, setMembersOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null)
  const [confirmDeleteBoard, setConfirmDeleteBoard] = useState(false)
  const [editingBoardTitle, setEditingBoardTitle] = useState(false)
  const [boardTitleDraft, setBoardTitleDraft] = useState('')
  const stageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id || !token) return
    apiFetch(`/boards/${id}`, token)
      .then(setBoard)
      .catch((err) => toast.show(err.message || 'Tableau introuvable', 'error'))
  }, [id, token])

  useEffect(() => {
    if (!id || !token || !user) return
    const socket = getSocket(token)

    socket.emit('board:join', { boardId: id, name: user.name })

    socket.on('presence:update', (list: Presence[]) => setPresence(list))

    socket.on('cursor:move', (c: Cursor) => {
      setCursors((prev) => ({ ...prev, [c.userId]: c }))
    })

    socket.on('list:created', (list: List) => {
      setBoard((b) => (b ? { ...b, lists: [...b.lists, { ...list, cards: list.cards || [] }] } : b))
    })

    socket.on('list:renamed', ({ listId, title }: { listId: string; title: string }) => {
      setBoard((b) => (b ? { ...b, lists: b.lists.map((l) => (l.id === listId ? { ...l, title } : l)) } : b))
    })

    socket.on('list:deleted', ({ listId }: { listId: string }) => {
      setBoard((b) => (b ? { ...b, lists: b.lists.filter((l) => l.id !== listId) } : b))
    })

    socket.on('list:reordered', ({ orderedListIds }: { orderedListIds: string[] }) => {
      setBoard((b) => {
        if (!b) return b
        const byId = new Map(b.lists.map((l) => [l.id, l]))
        const lists = orderedListIds.map((lid, position) => ({ ...(byId.get(lid) as List), position }))
        return { ...b, lists }
      })
    })

    socket.on('card:created', ({ listId, card }: { listId: string; card: Card }) => {
      setBoard((b) =>
        b ? { ...b, lists: b.lists.map((l) => (l.id === listId ? { ...l, cards: [...l.cards, card] } : l)) } : b,
      )
    })

    socket.on('card:moved', ({ cardId, toListId, toPosition }: { cardId: string; toListId: string; toPosition: number }) => {
      setBoard((b) => {
        if (!b) return b
        let moved: Card | undefined
        const stripped = b.lists.map((l) => {
          const found = l.cards.find((c) => c.id === cardId)
          if (found) moved = found
          return { ...l, cards: l.cards.filter((c) => c.id !== cardId) }
        })
        if (!moved) return b
        return {
          ...b,
          lists: stripped.map((l) => {
            if (l.id !== toListId) return l
            const cards = [...l.cards]
            cards.splice(toPosition, 0, { ...moved!, listId: toListId, position: toPosition })
            return { ...l, cards }
          }),
        }
      })
    })

    socket.on('card:updated', (card: Card) => {
      setBoard((b) => {
        if (!b) return b
        // The card might have changed list via assignment logic elsewhere; just update in its current list.
        return {
          ...b,
          lists: b.lists.map((l) => (l.id === card.listId ? { ...l, cards: l.cards.map((c) => (c.id === card.id ? card : c)) } : l)),
        }
      })
      setOpenCard((oc) => (oc && oc.id === card.id ? card : oc))
    })

    socket.on('card:deleted', ({ cardId, listId }: { cardId: string; listId: string }) => {
      setBoard((b) => (b ? { ...b, lists: b.lists.map((l) => (l.id === listId ? { ...l, cards: l.cards.filter((c) => c.id !== cardId) } : l)) } : b))
      setOpenCard((oc) => (oc && oc.id === cardId ? null : oc))
    })

    socket.on('board:renamed', ({ title }: { title: string }) => {
      setBoard((b) => (b ? { ...b, title } : b))
    })

    socket.on('board:deleted', () => {
      toast.show('Ce tableau a été supprimé', 'info')
      navigate('/boards')
    })

    socket.on('member:removed', ({ userId }: { userId: string }) => {
      if (userId === user.id) {
        toast.show("Tu as été retiré de ce tableau", 'info')
        navigate('/boards')
        return
      }
      setBoard((b) => (b ? { ...b, members: b.members.filter((m) => m.userId !== userId) } : b))
    })

    return () => {
      socket.emit('board:leave', { boardId: id })
      socket.off('presence:update')
      socket.off('cursor:move')
      socket.off('list:created')
      socket.off('list:renamed')
      socket.off('list:deleted')
      socket.off('list:reordered')
      socket.off('card:created')
      socket.off('card:moved')
      socket.off('card:updated')
      socket.off('card:deleted')
      socket.off('board:renamed')
      socket.off('board:deleted')
      socket.off('member:removed')
    }
  }, [id, token, user])

  const lastEmit = useRef(0)
  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!id || !token || !user || !stageRef.current) return
      const now = Date.now()
      if (now - lastEmit.current < 50) return
      lastEmit.current = now
      const rect = stageRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      getSocket(token).emit('cursor:move', { boardId: id, name: user.name, x, y })
    },
    [id, token, user],
  )

  function createList(e: React.FormEvent) {
    e.preventDefault()
    if (!newListTitle.trim() || !id || !token) return
    getSocket(token).emit('list:create', { boardId: id, title: newListTitle })
    setNewListTitle('')
  }

  function createCard(listId: string) {
    if (!newCardTitle.trim() || !id || !token) return
    getSocket(token).emit('card:create', { boardId: id, listId, title: newCardTitle })
    setNewCardTitle('')
    setAddingCardFor(null)
  }

  function startEditingList(list: List) {
    setEditingListId(list.id)
    setEditingListTitle(list.title)
  }

  function saveListTitle() {
    if (!editingListId || !id || !token) return
    const title = editingListTitle.trim()
    if (title) getSocket(token).emit('list:rename', { boardId: id, listId: editingListId, title })
    setEditingListId(null)
  }

  function deleteList() {
    if (!listToDelete || !id || !token) return
    getSocket(token).emit('list:delete', { boardId: id, listId: listToDelete.id })
    setListToDelete(null)
    toast.show('Liste supprimée', 'success')
  }

  function saveCard(cardId: string, patch: { title: string; description: string; dueDate: string | null; assigneeId: string | null }) {
    if (!id || !token) return
    getSocket(token).emit('card:update', { boardId: id, cardId, ...patch })
  }

  function deleteCard(card: Card) {
    if (!id || !token) return
    getSocket(token).emit('card:delete', { boardId: id, cardId: card.id, listId: card.listId })
    setOpenCard(null)
    toast.show('Carte supprimée', 'success')
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim() || !id || !token) return
    setInviting(true)
    try {
      const res = await apiFetch(`/boards/${id}/members`, token, { method: 'POST', body: JSON.stringify({ email: inviteEmail }) })
      const refreshed = await apiFetch(`/boards/${id}`, token)
      setBoard(refreshed)
      setInviteEmail('')
      toast.show(res.invited ? `Invitation envoyée à ${inviteEmail}` : `${inviteEmail} a été ajouté au tableau`, 'success')
    } catch (err: any) {
      toast.show(err.message, 'error')
    } finally {
      setInviting(false)
    }
  }

  async function removeMember() {
    if (!memberToRemove || !id || !token) return
    try {
      await apiFetch(`/boards/${id}/members/${memberToRemove.userId}`, token, { method: 'DELETE' })
      setBoard((b) => (b ? { ...b, members: b.members.filter((m) => m.userId !== memberToRemove.userId) } : b))
      toast.show('Membre retiré', 'success')
    } catch (err: any) {
      toast.show(err.message, 'error')
    } finally {
      setMemberToRemove(null)
    }
  }

  async function leaveBoard() {
    if (!id || !token || !user) return
    try {
      await apiFetch(`/boards/${id}/members/${user.id}`, token, { method: 'DELETE' })
      navigate('/boards')
    } catch (err: any) {
      toast.show(err.message, 'error')
    }
  }

  async function deleteBoard() {
    if (!id || !token) return
    try {
      await apiFetch(`/boards/${id}`, token, { method: 'DELETE' })
      navigate('/boards')
    } catch (err: any) {
      toast.show(err.message, 'error')
    } finally {
      setConfirmDeleteBoard(false)
    }
  }

  function startEditingBoardTitle() {
    if (!board) return
    setBoardTitleDraft(board.title)
    setEditingBoardTitle(true)
  }

  async function saveBoardTitle() {
    if (!id || !token) return
    const title = boardTitleDraft.trim()
    setEditingBoardTitle(false)
    if (!title || title === board?.title) return
    try {
      const updated = await apiFetch(`/boards/${id}`, token, { method: 'PATCH', body: JSON.stringify({ title }) })
      setBoard((b) => (b ? { ...b, title: updated.title } : b))
    } catch (err: any) {
      toast.show(err.message, 'error')
    }
  }

  function onDragEnd(result: DropResult) {
    const { source, destination, draggableId, type } = result
    if (!destination || !id || !token || !board) return

    if (type === 'list') {
      if (source.index === destination.index) return
      const sorted = board.lists.slice().sort((a, b) => a.position - b.position)
      const ids = sorted.map((l) => l.id)
      const [movedId] = ids.splice(source.index, 1)
      ids.splice(destination.index, 0, movedId)
      setBoard((b) => {
        if (!b) return b
        const byId = new Map(b.lists.map((l) => [l.id, l]))
        return { ...b, lists: ids.map((lid, position) => ({ ...(byId.get(lid) as List), position })) }
      })
      getSocket(token).emit('list:reorder', { boardId: id, orderedListIds: ids })
      return
    }

    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    setBoard((b) => {
      if (!b) return b
      let moved: Card | undefined
      const stripped = b.lists.map((l) => {
        const found = l.cards.find((c) => c.id === draggableId)
        if (found) moved = found
        return l.id === source.droppableId ? { ...l, cards: l.cards.filter((c) => c.id !== draggableId) } : l
      })
      if (!moved) return b
      return {
        ...b,
        lists: stripped.map((l) => {
          if (l.id !== destination.droppableId) return l
          const cards = [...l.cards]
          cards.splice(destination.index, 0, moved!)
          return { ...l, cards }
        }),
      }
    })

    getSocket(token).emit('card:move', {
      boardId: id,
      cardId: draggableId,
      toListId: destination.droppableId,
      toPosition: destination.index,
    })
  }

  const onlineNames = useMemo(() => {
    const seen = new Map<string, Presence>()
    presence.forEach((p) => seen.set(p.userId, p))
    return Array.from(seen.values())
  }, [presence])

  const myRole = board?.members.find((m) => m.userId === user?.id)?.role

  if (!board) {
    return (
      <div style={{ padding: '24px 28px' }}>
        <div className="skeleton" style={{ width: 220, height: 24, marginBottom: 24 }} />
        <div style={{ display: 'flex', gap: 16 }}>
          {[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ width: 260, height: 300 }} />)}
        </div>
      </div>
    )
  }

  return (
    <div ref={stageRef} onMouseMove={onMouseMove} style={{ position: 'relative', minHeight: '100vh', padding: '24px 28px' }}>
      {Object.values(cursors).map((c) => (
        <div
          key={c.userId}
          style={{ position: 'absolute', left: c.x, top: c.y, pointerEvents: 'none', zIndex: 50, transition: 'left 0.08s linear, top 0.08s linear' }}
        >
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: colorFor(c.userId) }} />
          <div style={{ marginTop: 2, fontSize: 11, fontWeight: 600, background: colorFor(c.userId), color: 'var(--on-accent)', padding: '2px 6px', borderRadius: 6, whiteSpace: 'nowrap' }}>
            {c.name}
          </div>
        </div>
      ))}

      <div className="topbar" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <Link to="/boards" style={{ color: 'var(--muted)', fontSize: 13, textDecoration: 'none', flex: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ChevronLeftIcon size={13} /> Tableaux
          </Link>
          {editingBoardTitle ? (
            <input
              className="input"
              autoFocus
              value={boardTitleDraft}
              onChange={(e) => setBoardTitleDraft(e.target.value)}
              onBlur={saveBoardTitle}
              onKeyDown={(e) => e.key === 'Enter' && saveBoardTitle()}
              style={{ fontSize: 20, fontWeight: 700, maxWidth: 320 }}
            />
          ) : (
            <h1 onClick={startEditingBoardTitle} title="Cliquer pour renommer" style={{ margin: 0, fontSize: 22, cursor: 'pointer' }}>
              {board.title}
            </h1>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div onClick={() => setMembersOpen(true)} style={{ display: 'flex', cursor: 'pointer' }} title="Gérer les membres">
            {onlineNames.map((p) => (
              <div
                key={p.userId}
                title={p.name}
                className="avatar presence-dot"
                style={{ width: 28, height: 28, background: colorFor(p.userId), fontSize: 11, border: '2px solid var(--bg)', marginLeft: -8 }}
              >
                {p.name.slice(0, 2).toUpperCase()}
              </div>
            ))}
            {board.members.filter((m) => !onlineNames.some((p) => p.userId === m.userId)).slice(0, 3).map((m) => (
              <div
                key={m.userId}
                title={`${m.user.name} (hors ligne)`}
                className="avatar"
                style={{ width: 28, height: 28, background: colorFor(m.userId), fontSize: 11, border: '2px solid var(--bg)', marginLeft: -8, opacity: 0.45 }}
              >
                {m.user.name.slice(0, 2).toUpperCase()}
              </div>
            ))}
          </div>
          <button className="btn-ghost" onClick={() => setMembersOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <UsersIcon size={14} /> Membres
          </button>
          <ThemeToggle />
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="board-lists" direction="horizontal" type="list">
          {(boardProvided) => (
            <div
              ref={boardProvided.innerRef}
              {...boardProvided.droppableProps}
              style={{ display: 'flex', gap: 16, alignItems: 'flex-start', overflowX: 'auto', paddingBottom: 20 }}
            >
              {board.lists
                .slice()
                .sort((a, b) => a.position - b.position)
                .map((list, listIndex) => (
                  <Draggable key={list.id} draggableId={list.id} index={listIndex}>
                    {(listProvided) => (
                      <div
                        ref={listProvided.innerRef}
                        {...listProvided.draggableProps}
                        className="card-surface"
                        style={{ width: 268, flex: '0 0 auto', padding: 12, ...listProvided.draggableProps.style }}
                      >
                        <div {...listProvided.dragHandleProps} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, cursor: 'grab' }}>
                          {editingListId === list.id ? (
                            <input
                              className="input"
                              autoFocus
                              value={editingListTitle}
                              onChange={(e) => setEditingListTitle(e.target.value)}
                              onBlur={saveListTitle}
                              onKeyDown={(e) => e.key === 'Enter' && saveListTitle()}
                              style={{ fontWeight: 600, fontSize: 13.5, padding: '4px 8px' }}
                            />
                          ) : (
                            <div onClick={() => startEditingList(list)} style={{ fontWeight: 600, fontSize: 14, flex: 1, padding: '4px 2px' }}>
                              {list.title}
                              <span style={{ color: 'var(--muted)', fontWeight: 500, fontSize: 12, marginLeft: 6 }}>{list.cards.length}</span>
                            </div>
                          )}
                          <button className="icon-btn danger" title="Supprimer la liste" onClick={() => setListToDelete(list)}><TrashIcon size={14} /></button>
                        </div>

                        <Droppable droppableId={list.id}>
                          {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps} style={{ minHeight: 20 }}>
                              {list.cards
                                .slice()
                                .sort((a, b) => a.position - b.position)
                                .map((card, index) => (
                                  <Draggable key={card.id} draggableId={card.id} index={index}>
                                    {(dragProvided, snapshot) => (
                                      <div
                                        ref={dragProvided.innerRef}
                                        {...dragProvided.draggableProps}
                                        {...dragProvided.dragHandleProps}
                                        onClick={() => setOpenCard(card)}
                                        style={{
                                          background: 'var(--card-bg)',
                                          border: '1px solid var(--line)',
                                          borderRadius: 10,
                                          padding: 10,
                                          marginBottom: 8,
                                          fontSize: 13.5,
                                          cursor: 'pointer',
                                          boxShadow: snapshot.isDragging ? '0 10px 24px var(--shadow)' : 'none',
                                          transition: 'border-color 0.15s ease',
                                          ...dragProvided.draggableProps.style,
                                        }}
                                      >
                                        <div>{card.title}</div>
                                        {(card.dueDate || card.assignee) && (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                                            {card.dueDate && (
                                              <span
                                                className="badge"
                                                style={{
                                                  background: isOverdue(card.dueDate) ? 'var(--danger-bg)' : 'var(--chip-bg)',
                                                  color: isOverdue(card.dueDate) ? 'var(--danger-text)' : 'var(--muted)',
                                                }}
                                              >
                                                <CalendarIcon size={11} /> {formatDue(card.dueDate)}
                                              </span>
                                            )}
                                            {card.assignee && (
                                              <div className="avatar" title={card.assignee.name} style={{ width: 18, height: 18, fontSize: 9, background: colorFor(card.assignee.id), marginLeft: 'auto' }}>
                                                {card.assignee.name.slice(0, 2).toUpperCase()}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>

                        {addingCardFor === list.id ? (
                          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <input
                              className="input"
                              autoFocus
                              placeholder="Titre de la carte"
                              value={newCardTitle}
                              onChange={(e) => setNewCardTitle(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && createCard(list.id)}
                            />
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn-primary" style={{ flex: 1 }} onClick={() => createCard(list.id)}>Ajouter</button>
                              <button className="btn-ghost" onClick={() => setAddingCardFor(null)}>Annuler</button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAddingCardFor(list.id)}
                            style={{ marginTop: 8, width: '100%', background: 'none', border: 'none', color: 'var(--muted)', textAlign: 'left', fontSize: 13, padding: 6 }}
                          >
                            + Ajouter une carte
                          </button>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
              {boardProvided.placeholder}

              <form onSubmit={createList} style={{ width: 240, flex: '0 0 auto' }}>
                <input
                  className="input"
                  style={{ width: '100%', marginBottom: 6 }}
                  placeholder="Nouvelle liste"
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                />
                <button className="btn-ghost" style={{ width: '100%' }} type="submit">+ Ajouter une liste</button>
              </form>
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <CardModal
        card={openCard}
        members={board.members}
        onClose={() => setOpenCard(null)}
        onSave={(patch) => openCard && saveCard(openCard.id, patch)}
        onDelete={() => openCard && deleteCard(openCard)}
      />

      <ConfirmDialog
        open={!!listToDelete}
        title="Supprimer cette liste ?"
        message={`"${listToDelete?.title}" et toutes ses cartes seront supprimées définitivement.`}
        confirmLabel="Supprimer"
        danger
        onConfirm={deleteList}
        onCancel={() => setListToDelete(null)}
      />

      <ConfirmDialog
        open={!!memberToRemove}
        title="Retirer ce membre ?"
        message={`${memberToRemove?.user.name} n'aura plus accès à ce tableau.`}
        confirmLabel="Retirer"
        danger
        onConfirm={removeMember}
        onCancel={() => setMemberToRemove(null)}
      />

      <ConfirmDialog
        open={confirmDeleteBoard}
        title="Supprimer ce tableau ?"
        message="Toutes les listes et cartes seront supprimées définitivement. Impossible d'annuler."
        confirmLabel="Supprimer"
        danger
        onConfirm={deleteBoard}
        onCancel={() => setConfirmDeleteBoard(false)}
      />

      {membersOpen && (
        <div className="modal-overlay fade-in" onClick={() => setMembersOpen(false)}>
          <div className="modal pop-in" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 17 }}>Membres du tableau</h3>
                <button className="icon-btn" onClick={() => setMembersOpen(false)}><XIcon size={14} /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {board.members.map((m) => (
                  <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 2px' }}>
                    <div className="avatar" style={{ width: 30, height: 30, fontSize: 12, background: colorFor(m.userId) }}>
                      {m.user.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{m.user.name}{m.userId === user?.id ? ' (toi)' : ''}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{m.user.email}</div>
                    </div>
                    <span className="badge" style={{ background: m.role === 'owner' ? 'rgba(139,92,246,0.18)' : 'var(--chip-bg)', color: m.role === 'owner' ? 'var(--violet-soft)' : 'var(--muted)' }}>
                      {m.role === 'owner' ? 'Propriétaire' : 'Membre'}
                    </span>
                    {myRole === 'owner' && m.role !== 'owner' && (
                      <button className="icon-btn danger" title="Retirer" onClick={() => setMemberToRemove(m)}><TrashIcon size={14} /></button>
                    )}
                  </div>
                ))}
              </div>

              <form onSubmit={invite} style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--line-soft)', paddingTop: 14 }}>
                <input
                  className="input"
                  placeholder="Inviter par email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
                <button className="btn-primary" type="submit" disabled={inviting} style={{ whiteSpace: 'nowrap' }}>
                  {inviting ? '...' : 'Inviter'}
                </button>
              </form>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--line-soft)', paddingTop: 14 }}>
                {myRole === 'owner' ? (
                  <button className="btn-danger" onClick={() => { setMembersOpen(false); setConfirmDeleteBoard(true) }}>Supprimer le tableau</button>
                ) : (
                  <button className="btn-danger" onClick={() => { setMembersOpen(false); leaveBoard() }}>Quitter le tableau</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
