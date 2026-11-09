import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import ThemeToggle from '../components/ThemeToggle'
import { BoardIcon, MailIcon } from '../components/icons'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await apiFetch('/auth/forgot-password', null, { method: 'POST', body: JSON.stringify({ email }) })
      setSent(true)
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 2 }}>
        <ThemeToggle />
      </div>

      <div className="card-surface slide-up" style={{ width: 380, padding: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="brand-mark" style={{ color: 'var(--on-accent)' }}>
            <BoardIcon size={18} />
          </div>
          <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: -0.3 }}>Board Live</div>
        </div>

        {sent ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--chip-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MailIcon size={20} />
            </div>
            <h1 style={{ fontSize: 19, margin: 0 }}>Vérifie ta boîte mail</h1>
            <p style={{ color: 'var(--muted)', fontSize: 13.5, margin: 0, lineHeight: 1.5 }}>
              Si un compte existe pour <strong style={{ color: 'var(--text)' }}>{email}</strong>, un lien de réinitialisation vient d'être envoyé (valable 1 heure). Pense à vérifier les spams.
            </p>
            <Link to="/login" className="btn-ghost" style={{ textDecoration: 'none', marginTop: 6 }}>Retour à la connexion</Link>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 20, margin: '4px 0 2px' }}>Mot de passe oublié</h1>
              <p style={{ color: 'var(--muted)', margin: 0, fontSize: 13.5 }}>
                Indique ton email, on t'envoie un lien pour le réinitialiser.
              </p>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>EMAIL</label>
              <input className="input" type="email" placeholder="toi@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {error && (
              <div style={{ color: 'var(--danger-text)', fontSize: 13, background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 8, padding: '8px 10px' }}>
                {error}
              </div>
            )}
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Envoi...' : 'Envoyer le lien'}
            </button>
            <Link to="/login" style={{ fontSize: 13, color: 'var(--cyan)', textDecoration: 'none' }}>← Retour à la connexion</Link>
          </form>
        )}
      </div>
    </div>
  )
}
