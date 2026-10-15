import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Heart, AlertCircle } from 'lucide-react'

const t = {
  en: {
    fillFields: 'Please fill in all fields.',
    invalidCreds: 'Invalid username or password. Please try again.',
    title: 'Sign In',
    subtitle: 'Welcome back — sign in to your account',
    username: 'Username or Email',
    usernamePlaceholder: 'Enter your username or email',
    password: 'Password',
    passwordPlaceholder: 'Enter your password',
    signingIn: 'Signing in...',
    signIn: 'Sign In',
    createSupporter: 'Create a Supporter Account',
    backToSite: '← Back to public site',
  },
  tl: {
    fillFields: 'Pakipunan ang lahat ng fields.',
    invalidCreds: 'Maling username o password. Subukan muli.',
    title: 'Mag-sign In',
    subtitle: 'Maligayang pagbabalik — mag-sign in sa iyong account',
    username: 'Username o Email',
    usernamePlaceholder: 'Ilagay ang iyong username o email',
    password: 'Password',
    passwordPlaceholder: 'Ilagay ang iyong password',
    signingIn: 'Nag-si-sign in...',
    signIn: 'Mag-sign In',
    createSupporter: 'Gumawa ng Supporter Account',
    backToSite: '← Bumalik sa site',
  }
}

export default function Login({ lang }: { lang: 'en' | 'tl' }) {
  const tx = t[lang]
  const { login } = useAuth()
  const nav = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.username || !form.password) { setError(tx.fillFields); return }
    setLoading(true); setError('')
    try {
      const data: any = await login(form.username, form.password)
      nav(data?.role === 'donor' ? '/donor' : '/admin')
    } catch {
      setError(tx.invalidCreds)
    } finally { setLoading(false) }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--beige)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <div style={{
              width: 64, height: 64, background: 'var(--terracotta)', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
            }}>
              <Heart size={28} color="white" fill="white" />
            </div>
            <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontWeight: 700, color: 'var(--terracotta)' }}>Open Arms</span>
          </Link>
          <h1 style={{ fontSize: 28, marginBottom: 8, marginTop: 12, color: 'var(--navy)' }}>{tx.title}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>{tx.subtitle}</p>
        </div>

        <div className="card" style={{ padding: 32 }}>
          {error && (
            <div className="form-error-banner" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>{tx.username}</label>
              <input
                type="text" placeholder={tx.usernamePlaceholder}
                value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                autoComplete="username"
              />
            </div>
            <div className="form-group">
              <label>{tx.password}</label>
              <input
                type="password" placeholder={tx.passwordPlaceholder}
                value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit" className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15, marginTop: 8 }}
              disabled={loading}
            >
              {loading ? tx.signingIn : tx.signIn}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <Link to="/signup" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '11px', borderRadius: 10, border: '1.5px solid var(--border)',
            color: 'var(--navy)', fontSize: 15, fontWeight: 500, textDecoration: 'none',
            transition: 'all 0.15s', gap: 8
          }}>
            <Heart size={16} color="var(--terracotta)" />
            {tx.createSupporter}
          </Link>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <Link to="/" style={{ color: 'var(--text-muted)', fontSize: 13 }}>{tx.backToSite}</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
