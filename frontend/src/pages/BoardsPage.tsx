import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { apiFetch } from '../lib/api'
import { useToast } from '../lib/toast'
import ConfirmDialog from '../components/ConfirmDialog'
import ThemeToggle from '../components/ThemeToggle'
import { BoardIcon, LogOutIcon, PlusIcon, TrashIcon } from '../components/icons'

type Member = { userId: string; role: string; user: { id: string; name: string } }
type Board = { id: string; title: string; members: Member[] }

const COLORS = ['#8b5cf6', '#22d3ee', '#f472b6', '#f59e0b', '#34d399']
function colorFor(id: string) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % COLORS.length
  return COLORS[h]
}

export default function BoardsPage() {
  const { token, user, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [boards, setBoards] = useState<Board[]>([])
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [toDelete, setToDelete] = useState<Board | null>(null)

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }
    apiFetch('/boards', token)
      .then(setBoards)
      .catch(() => toast.show('Impossible de charger tes tableaux', 'error'))
      .finally(() => setLoading(false))
  }, [token])

  async function createBoard(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !token) return
    setCreating(true)
    try {
      const board = await apiFetch('/boards', token, { method: 'POST', body: JSON.stringify({ title }) })
      setBoards([board, ...boards])
      setTitle('')
      toast.show('Tableau créé', 'success')
    } catch (err: any) {
      toast.show(err.message, 'error')
    } finally {
      setCreating(false)
    }
  }

  async function confirmDelete() {
    if (!toDelete || !token) return
    try {
      await apiFetch(`/boards/${toDelete.id}`, token, { method: 'DELETE' })
      setBoards((b) => b.filter((x) => x.id !== toDelete.id))
      toast.show('Tableau supprimé', 'success')
    } catch (err: any) {
      toast.show(err.message, 'error')
    } finally {
      setToDelete(null)
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 20px' }}>
      <div className="topbar" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="brand-mark" style={{ color: 'var(--on-accent)' }}>
            <BoardIcon size={18} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 19 }}>Mes tableaux</h1>
            <p style={{ color: 'var(--muted)', margin: '2px 0 0', fontSize: 13 }}>Connecté en tant que {user?.name}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ThemeToggle />
          <button className="btn-ghost" onClick={() => { logout(); navigate('/login') }} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <LogOutIcon size={14} /> Déconnexion
          </button>
        </div>
      </div>

      <form onSubmit={createBoard} style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
        <input className="input" style={{ flex: 1 }} placeholder="Nom du nouveau tableau" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button className="btn-primary" type="submit" disabled={creating} style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
          <PlusIcon size={14} /> {creating ? '...' : 'Créer'}
        </button>
      </form>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 96, borderRadius: 14 }} />)}
        </div>
      ) : boards.length === 0 ? (
        <div className="card-surface fade-in" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--chip-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <BoardIcon size={22} />
          </div>
          <p style={{ color: 'var(--muted)', margin: 0 }}>Aucun tableau pour l'instant — crée le premier ci-dessus.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 14 }}>
          {boards.map((b, i) => {
            const isOwner = b.members.find((m) => m.userId === user?.id)?.role === 'owner'
            return (
              <div
                key={b.id}
                className="card-surface slide-up"
                style={{ padding: 18, position: 'relative', animationDelay: `${i * 0.04}s`, transition: 'transform 0.15s ease, border-color 0.15s ease' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--line-strong)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--line)')}
              >
                <div style={{ height: 3, borderRadius: 3, background: 'linear-gradient(90deg, var(--violet), var(--cyan))', marginBottom: 14, opacity: 0.8 }} />
                <Link to={`/boards/${b.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                  <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 15 }}>{b.title}</div>
                </Link>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex' }}>
                    {b.members.slice(0, 4).map((m) => (
                      <div key={m.userId} className="avatar" title={m.user.name} style={{ width: 24, height: 24, fontSize: 10, background: colorFor(m.userId), border: '2px solid var(--surface-2)', marginLeft: -7 }}>
                        {m.user.name.slice(0, 2).toUpperCase()}
                      </div>
                    ))}
                    {b.members.length === 0 && <span style={{ fontSize: 12, color: 'var(--muted)' }}>Aucun membre</span>}
                  </div>
                  {isOwner && (
                    <button className="icon-btn danger" title="Supprimer" onClick={() => setToDelete(b)}>
                      <TrashIcon size={14} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Supprimer ce tableau ?"
        message={`"${toDelete?.title}" sera supprimé définitivement, avec toutes ses listes et cartes. Impossible d'annuler.`}
        confirmLabel="Supprimer"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
