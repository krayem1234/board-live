import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import ThemeToggle from '../components/ThemeToggle'
import { BoardIcon } from '../components/icons'

export default function LoginPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') await login(email, password)
      else await register(email, name, password)
      navigate('/boards')
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 2 }}>
        <ThemeToggle />
      </div>

      <div
        style={{
          position: 'absolute', width: 420, height: 420, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.22), transparent 70%)',
          top: -140, left: -140, filter: 'blur(10px)',
        }}
      />
      <div
        style={{
          position: 'absolute', width: 380, height: 380, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,211,238,0.16), transparent 70%)',
          bottom: -120, right: -100, filter: 'blur(10px)',
        }}
      />

      <form onSubmit={submit} className="card-surface slide-up" style={{ width: 380, padding: 32, display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
          <div className="brand-mark" style={{ color: 'var(--on-accent)' }}>
            <BoardIcon size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: -0.3 }}>Board Live</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Collaboration en temps réel</div>
          </div>
        </div>

        <div>
          <h1 style={{ fontSize: 21, margin: '4px 0 2px' }}>{mode === 'login' ? 'Bon retour' : 'Créer un compte'}</h1>
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: 13.5 }}>
            {mode === 'login' ? 'Connecte-toi pour retrouver tes tableaux.' : "Quelques infos et c'est parti."}
          </p>
        </div>

        {mode === 'register' && (
          <div>
            <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>NOM</label>
            <input className="input" placeholder="Ton nom" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
        )}
        <div>
          <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>EMAIL</label>
          <input className="input" type="email" placeholder="toi@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>MOT DE PASSE</label>
            {mode === 'login' && (
              <Link to="/forgot-password" style={{ fontSize: 12, color: 'var(--cyan)', textDecoration: 'none' }}>Oublié ?</Link>
            )}
          </div>
          <input className="input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </div>

        {error && (
          <div style={{ color: 'var(--danger-text)', fontSize: 13, background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 8, padding: '8px 10px' }}>
            {error}
          </div>
        )}

        <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: 4, padding: '12px 18px' }}>
          {loading ? 'Un instant...' : mode === 'login' ? 'Se connecter' : "S'inscrire"}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          style={{ background: 'none', border: 'none', color: 'var(--cyan)', fontSize: 13, padding: 0 }}
        >
          {mode === 'login' ? "Pas de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
        </button>
      </form>
    </div>
  )
}
