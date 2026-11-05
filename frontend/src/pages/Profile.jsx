import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { authApi } from '../services/endpoints'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import PageHeader from '../components/PageHeader'
import FormField from '../components/FormField'
import { formatDate } from '../utils/format'
import { getErrorMessage } from '../utils/errors'

export default function Profile() {
  const { user, logout } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (f) => (e) => setForm((v) => ({ ...v, [f]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    const found = {}
    if (!form.currentPassword) found.currentPassword = 'Enter your current password'
    if (form.newPassword.length < 8) found.newPassword = 'Password must be at least 8 characters'
    if (form.confirm !== form.newPassword) found.confirm = 'Passwords do not match'
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    try {
      await authApi.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword })
      toast.success('Password updated')
      setForm({ currentPassword: '', newPassword: '', confirm: '' })
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Profile" subtitle="Your account and password.">
        <button type="button" className="btn btn-secondary" onClick={logout}><LogOut size={16} /> Sign out</button>
      </PageHeader>
      <div className="grid-2">
        <section className="card card-pad">
          <h2 style={{ marginBottom: 14 }}>Account</h2>
          <dl className="dl">
            <dt>Name</dt><dd>{user.name}</dd>
            <dt>Email</dt><dd>{user.email}</dd>
            <dt>Role</dt><dd>{user.role === 'ADMIN' ? 'Administrator' : 'Staff'}</dd>
            <dt>Member since</dt><dd>{formatDate(user.createdAt)}</dd>
          </dl>
        </section>
        <form className="card card-pad stack" onSubmit={submit} noValidate>
          <h2>Change password</h2>
          <FormField label="Current password" error={errors.currentPassword} required><input className="input" type="password" autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} /></FormField>
          <FormField label="New password" error={errors.newPassword} required hint="At least 8 characters."><input className="input" type="password" autoComplete="new-password" value={form.newPassword} onChange={set('newPassword')} /></FormField>
          <FormField label="Confirm new password" error={errors.confirm} required><input className="input" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} /></FormField>
          <div><button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button></div>
        </form>
      </div>
    </>
  )
}
