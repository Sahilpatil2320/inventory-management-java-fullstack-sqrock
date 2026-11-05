import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Warehouse } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import FormField from '../components/FormField'
import { getErrorMessage } from '../utils/errors'

export default function Login() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [busy, setBusy] = useState(false)

  if (isAuthenticated) return <Navigate to="/" replace />

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  async function onSubmit(e) {
    e.preventDefault()
    const next = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter your email address'
    if (!form.password) next.password = 'Enter your password'
    setErrors(next)
    setSubmitError('')
    if (Object.keys(next).length) return

    setBusy(true)
    try {
      await login(form.email.trim(), form.password)
      navigate(location.state?.from || '/', { replace: true })
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'Sign-in failed. Please try again.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <section className="login-side">
        <div className="row" style={{ color: '#fff', fontWeight: 600 }}>
          <span className="logo sidebar-brand" style={{ padding: 0 }}><Warehouse size={22} /></span> Inventory
        </div>
        <div>
          <h1>Know what you have, where it went and what to reorder.</h1>
          <p>Track products, suppliers and every stock movement in one place, with low-stock alerts and reports that come straight from your database.</p>
        </div>
        <small style={{ color: 'var(--on-ink-muted)' }}>Inventory Management System</small>
      </section>
      <section className="login-form-area">
        <form className="login-card stack" onSubmit={onSubmit} noValidate>
          <div>
            <h1>Sign in</h1>
            <p className="muted">Use the account your administrator created for you.</p>
          </div>
          {submitError && <div className="alert alert-error" role="alert">{submitError}</div>}
          <FormField label="Email" error={errors.email} required>
            <input className="input" type="email" autoComplete="username" value={form.email} onChange={set('email')} autoFocus />
          </FormField>
          <FormField label="Password" error={errors.password} required>
            <input className="input" type="password" autoComplete="current-password" value={form.password} onChange={set('password')} />
          </FormField>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </section>
    </div>
  )
}
