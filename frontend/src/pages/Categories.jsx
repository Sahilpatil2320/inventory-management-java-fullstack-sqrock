import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { categoriesApi } from '../services/endpoints'
import { useAsync } from '../hooks/useAsync'
import { useDebounce } from '../hooks/useDebounce'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import PageHeader from '../components/PageHeader'
import SearchBar from '../components/SearchBar'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import FormField from '../components/FormField'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import { formatDate, formatNumber } from '../utils/format'
import { getErrorMessage, getFieldErrors } from '../utils/errors'

function CategoryModal({ category, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState({ name: category?.name || '', description: category?.description || '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim()) return setErrors({ name: 'Category name is required' })
    setBusy(true)
    try {
      const payload = { name: form.name.trim(), description: form.description.trim() || null }
      if (category) await categoriesApi.update(category.id, payload)
      else await categoriesApi.create(payload)
      toast.success(category ? 'Category updated' : 'Category added')
      onSaved()
    } catch (err) {
      setErrors({ name: getFieldErrors(err).name || (err.response?.status === 409 ? getErrorMessage(err) : undefined) })
      toast.error(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={category ? 'Edit category' : 'Add category'} onClose={onClose}>
      <form onSubmit={submit} noValidate className="stack">
        <FormField label="Name" error={errors.name} required>
          <input className="input" value={form.name} maxLength={100} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </FormField>
        <FormField label="Description">
          <textarea className="textarea" value={form.description} maxLength={500} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </FormField>
        <div className="form-actions" style={{ marginTop: 0 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : category ? 'Save changes' : 'Add category'}</button>
        </div>
      </form>
    </Modal>
  )
}

export default function Categories() {
  const { isAdmin } = useAuth()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const q = useDebounce(search)
  const { data, loading, error, reload } = useAsync(() => categoriesApi.list(q), [q])
  const [editing, setEditing] = useState(null) // null | {} (new) | category
  const [toDelete, setToDelete] = useState(null)
  const [busy, setBusy] = useState(false)

  async function remove() {
    setBusy(true)
    try {
      const res = await categoriesApi.remove(toDelete.id)
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
    { key: 'name', header: 'Category', render: (c) => <span className="cell-title">{c.name}</span> },
    { key: 'description', header: 'Description', render: (c) => c.description || <span className="muted">-</span> },
    { key: 'productCount', header: 'Products', align: 'right', render: (c) => formatNumber(c.productCount) },
    { key: 'created', header: 'Created', render: (c) => formatDate(c.createdAt) },
    ...(isAdmin ? [{
      key: 'actions', header: <span className="sr-only">Actions</span>,
      render: (c) => (
        <div className="row-actions">
          <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`}><Pencil size={16} /></button>
          <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setToDelete(c)} aria-label={`Delete ${c.name}`}><Trash2 size={16} /></button>
        </div>
      ),
    }] : []),
  ]

  return (
    <>
      <PageHeader title="Categories" subtitle="Group products so they are easy to find and report on.">
        {isAdmin && <button type="button" className="btn btn-primary" onClick={() => setEditing({})}><Plus size={16} /> Add category</button>}
      </PageHeader>
      <div className="card">
        <div className="toolbar"><SearchBar value={search} onChange={setSearch} placeholder="Search categories" label="Search categories" /></div>
        {loading && !data ? <Loading /> : error ? <ErrorState error={error} onRetry={reload} /> : data.length === 0 ? (
          <EmptyState title={q ? 'No categories match your search' : 'No categories yet'} message={q ? undefined : 'Add a category before creating products.'} />
        ) : (
          <DataTable columns={columns} rows={data} caption="Categories" />
        )}
      </div>
      {editing && <CategoryModal category={editing.id ? editing : null} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />}
      {toDelete && (
        <ConfirmDialog title="Delete category?" confirmLabel="Delete category" danger busy={busy} onConfirm={remove} onCancel={() => setToDelete(null)}
          message={`"${toDelete.name}" will be deleted. A category that still has products cannot be deleted: reassign those products first.`} />
      )}
    </>
  )
}
