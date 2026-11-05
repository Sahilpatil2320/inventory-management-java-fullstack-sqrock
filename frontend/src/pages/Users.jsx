import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { usersApi } from '../services/endpoints'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import FormField from '../components/FormField'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import { formatDate } from '../utils/format'
import { getErrorMessage, getFieldErrors } from '../utils/errors'

function UserModal({ user, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', password: '', role: user?.role || 'STAFF', active: user?.active ?? true })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (f) => (e) => setForm((v) => ({ ...v, [f]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    const found = {}
    if (!form.name.trim()) found.name = 'Name is required'
    if (!user && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) found.email = 'Enter a valid email address'
    if ((!user || form.password) && form.password.length < 8) found.password = 'Password must be at least 8 characters'
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    try {
      if (user) await usersApi.update(user.id, { name: form.name.trim(), role: form.role, active: form.active, password: form.password || null })
      else await usersApi.create({ name: form.name.trim(), email: form.email.trim(), password: form.password, role: form.role })
      toast.success(user ? 'User updated' : 'User created')
      onSaved()
    } catch (err) {
      setErrors(getFieldErrors(err))
      toast.error(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={user ? 'Edit user' : 'Add user'} onClose={onClose}>
      <form onSubmit={submit} noValidate className="stack">
        <FormField label="Full name" error={errors.name} required><input className="input" value={form.name} onChange={set('name')} maxLength={100} /></FormField>
        <FormField label="Email" error={errors.email} required><input className="input" type="email" value={form.email} onChange={set('email')} disabled={Boolean(user)} /></FormField>
        <FormField label={user ? 'New password' : 'Password'} error={errors.password} required={!user} hint={user ? 'Leave blank to keep the current password.' : 'At least 8 characters.'}>
          <input className="input" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} />
        </FormField>
        <FormField label="Role" required>
          <select className="select" value={form.role} onChange={set('role')}>
            <option value="STAFF">Staff: stock operations and viewing</option>
            <option value="ADMIN">Administrator: full access</option>
          </select>
        </FormField>
        {user && (
          <label className="row"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Account is active</label>
        )}
        <div className="form-actions" style={{ marginTop: 0 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : user ? 'Save changes' : 'Create user'}</button>
        </div>
      </form>
    </Modal>
  )
}

export default function Users() {
  const { user: me } = useAuth()
  const toast = useToast()
  const { data, loading, error, reload } = useAsync(() => usersApi.list(), [])
  const [editing, setEditing] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [busy, setBusy] = useState(false)

  async function remove() {
    setBusy(true)
    try {
      const res = await usersApi.remove(toDelete.id)
      toast.success(res.message)
      reload()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setBusy(false)
      setToDelete(null)
    }
  }

  const columns = [
    { key: 'name', header: 'User', render: (u) => <><span className="cell-title">{u.name}</span>{u.id === me?.id && <span className="muted"> (you)</span>}<div className="cell-sub">{u.email}</div></> },
    { key: 'role', header: 'Role', render: (u) => <span className={`badge ${u.role === 'ADMIN' ? 'badge-info' : 'badge-neutral'}`}>{u.role === 'ADMIN' ? 'Administrator' : 'Staff'}</span> },
    { key: 'active', header: 'Status', render: (u) => <span className={`badge ${u.active ? 'badge-ok' : 'badge-bad'}`}>{u.active ? 'Active' : 'Inactive'}</span> },
    { key: 'created', header: 'Created', render: (u) => formatDate(u.createdAt) },
    { key: 'actions', header: <span className="sr-only">Actions</span>, render: (u) => (
      <div className="row-actions">
        <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditing(u)} aria-label={`Edit ${u.name}`}><Pencil size={16} /></button>
        {u.id !== me?.id && <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setToDelete(u)} aria-label={`Delete ${u.name}`}><Trash2 size={16} /></button>}
      </div>
    ) },
  ]

  return (
    <>
      <PageHeader title="Users" subtitle="Create accounts for your team and control what they can do.">
        <button type="button" className="btn btn-primary" onClick={() => setEditing({})}><Plus size={16} /> Add user</button>
      </PageHeader>
      <div className="card">
        {loading && !data ? <Loading /> : error ? <ErrorState error={error} onRetry={reload} /> : data.length === 0 ? <EmptyState title="No users" /> : <DataTable columns={columns} rows={data} caption="Users" />}
      </div>
      {editing && <UserModal user={editing.id ? editing : null} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />}
      {toDelete && (
        <ConfirmDialog title="Delete user?" confirmLabel="Delete user" danger busy={busy} onConfirm={remove} onCancel={() => setToDelete(null)}
          message={`"${toDelete.name}" will lose access. If they have recorded stock transactions the account is deactivated instead, so the history keeps their name.`} />
      )}
    </>
  )
}
