import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import { useToast } from '../lib/toast'
import ThemeToggle from '../components/ThemeToggle'
import { BoardIcon, LockIcon } from '../components/icons'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const navigate = useNavigate()
  const toast = useToast()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas')
      return
    }
    if (!token) {
      setError('Lien invalide — redemande un email depuis la page de connexion')
      return
    }
    setLoading(true)
    try {
      await apiFetch('/auth/reset-password', null, { method: 'POST', body: JSON.stringify({ token, password }) })
      toast.show('Mot de passe mis à jour, tu peux te connecter', 'success')
      navigate('/login')
    } catch (err: any) {
      setError(err.message || 'Lien invalide ou expiré')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 2 }}>
        <ThemeToggle />
      </div>

      <form onSubmit={submit} className="card-surface slide-up" style={{ width: 380, padding: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="brand-mark" style={{ color: 'var(--on-accent)' }}>
            <BoardIcon size={18} />
          </div>
          <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: -0.3 }}>Board Live</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--chip-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LockIcon size={18} />
          </div>
          <div>
            <h1 style={{ fontSize: 19, margin: 0 }}>Nouveau mot de passe</h1>
            <p style={{ color: 'var(--muted)', margin: '2px 0 0', fontSize: 13 }}>Choisis un mot de passe pour ton compte.</p>
          </div>
        </div>

        {!token && (
          <div style={{ color: 'var(--danger-text)', fontSize: 13, background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 8, padding: '8px 10px' }}>
            Aucun jeton trouvé dans le lien. Ouvre le lien reçu par email, ou redemande-en un.
          </div>
        )}

        <div>
          <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>NOUVEAU MOT DE PASSE</label>
          <input className="input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>CONFIRMER</label>
          <input className="input" type="password" placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} />
        </div>

        {error && (
          <div style={{ color: 'var(--danger-text)', fontSize: 13, background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 8, padding: '8px 10px' }}>
            {error}
          </div>
        )}

        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? 'Enregistrement...' : 'Réinitialiser le mot de passe'}
        </button>
        <Link to="/login" style={{ fontSize: 13, color: 'var(--cyan)', textDecoration: 'none' }}>← Retour à la connexion</Link>
      </form>
    </div>
  )
}
