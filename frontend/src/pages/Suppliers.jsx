import { useState } from 'react'
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { productsApi, suppliersApi } from '../services/endpoints'
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
import StatusBadge from '../components/StatusBadge'
import { formatDate, formatNumber } from '../utils/format'
import { validateSupplier } from '../utils/validators'
import { getErrorMessage, getFieldErrors } from '../utils/errors'

function SupplierModal({ supplier, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState({
    supplierName: supplier?.supplierName || '', companyName: supplier?.companyName || '',
    email: supplier?.email || '', phone: supplier?.phone || '', address: supplier?.address || '',
  })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (f) => (e) => setForm((v) => ({ ...v, [f]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    const found = validateSupplier(form)
    setErrors(found)
    if (Object.keys(found).length) return
    setBusy(true)
    try {
      const payload = { ...form, address: form.address.trim() || null }
      if (supplier) await suppliersApi.update(supplier.id, payload)
      else await suppliersApi.create(payload)
      toast.success(supplier ? 'Supplier updated' : 'Supplier added')
      onSaved()
    } catch (err) {
      const fields = getFieldErrors(err)
      setErrors(Object.keys(fields).length ? fields : err.response?.status === 409 ? { email: getErrorMessage(err) } : {})
      toast.error(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={supplier ? 'Edit supplier' : 'Add supplier'} onClose={onClose} wide>
      <form onSubmit={submit} noValidate>
        <div className="form-grid">
          <FormField label="Contact name" error={errors.supplierName} required><input className="input" value={form.supplierName} onChange={set('supplierName')} maxLength={100} /></FormField>
          <FormField label="Company name" error={errors.companyName} required><input className="input" value={form.companyName} onChange={set('companyName')} maxLength={150} /></FormField>
          <FormField label="Email" error={errors.email} required><input className="input" type="email" value={form.email} onChange={set('email')} maxLength={150} /></FormField>
          <FormField label="Phone number" error={errors.phone} required><input className="input" value={form.phone} onChange={set('phone')} maxLength={25} /></FormField>
          <FormField label="Address" error={errors.address} className="full"><textarea className="textarea" value={form.address} onChange={set('address')} maxLength={300} /></FormField>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : supplier ? 'Save changes' : 'Add supplier'}</button>
        </div>
      </form>
    </Modal>
  )
}

function SupplierDetails({ supplier, onClose }) {
  const { data, loading, error, reload } = useAsync(() => productsApi.list({ supplierId: supplier.id, size: 100 }), [supplier.id])
  return (
    <Modal title={supplier.companyName} onClose={onClose} wide>
      <dl className="dl" style={{ marginBottom: 20 }}>
        <dt>Contact</dt><dd>{supplier.supplierName}</dd>
        <dt>Email</dt><dd>{supplier.email}</dd>
        <dt>Phone</dt><dd>{supplier.phone}</dd>
        <dt>Address</dt><dd>{supplier.address || '-'}</dd>
        <dt>Supplier since</dt><dd>{formatDate(supplier.createdAt)}</dd>
      </dl>
      <h3 style={{ marginBottom: 8 }}>Products supplied</h3>
      {loading ? <Loading /> : error ? <ErrorState error={error} onRetry={reload} /> : data.content.length === 0 ? <EmptyState title="No products from this supplier" /> : (
        <DataTable rows={data.content} caption="Products supplied" columns={[
          { key: 'name', header: 'Product', render: (p) => <><span className="cell-title">{p.name}</span><div className="cell-sub">{p.sku}</div></> },
          { key: 'quantity', header: 'In stock', align: 'right', render: (p) => formatNumber(p.quantity) },
          { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.stockStatus} /> },
        ]} />
      )}
    </Modal>
  )
}

export default function Suppliers() {
  const { isAdmin } = useAuth()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const q = useDebounce(search)
  const { data, loading, error, reload } = useAsync(() => suppliersApi.list(q), [q])
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [busy, setBusy] = useState(false)

  async function remove() {
    setBusy(true)
    try {
      const res = await suppliersApi.remove(toDelete.id)
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
    { key: 'company', header: 'Company', render: (s) => <><span className="cell-title">{s.companyName}</span><div className="cell-sub">{s.supplierName}</div></> },
    { key: 'email', header: 'Email', render: (s) => s.email },
    { key: 'phone', header: 'Phone', nowrap: true, render: (s) => s.phone },
    { key: 'products', header: 'Products', align: 'right', render: (s) => formatNumber(s.productCount) },
    { key: 'created', header: 'Added', render: (s) => formatDate(s.createdAt) },
    {
      key: 'actions', header: <span className="sr-only">Actions</span>,
      render: (s) => (
        <div className="row-actions">
          <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setViewing(s)} aria-label={`View ${s.companyName}`}><Eye size={16} /></button>
          {isAdmin && (
            <>
              <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditing(s)} aria-label={`Edit ${s.companyName}`}><Pencil size={16} /></button>
              <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setToDelete(s)} aria-label={`Delete ${s.companyName}`}><Trash2 size={16} /></button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader title="Suppliers" subtitle="Companies you buy stock from.">
        {isAdmin && <button type="button" className="btn btn-primary" onClick={() => setEditing({})}><Plus size={16} /> Add supplier</button>}
      </PageHeader>
      <div className="card">
        <div className="toolbar"><SearchBar value={search} onChange={setSearch} placeholder="Search by name, company or email" label="Search suppliers" /></div>
        {loading && !data ? <Loading /> : error ? <ErrorState error={error} onRetry={reload} /> : data.length === 0 ? (
          <EmptyState title={q ? 'No suppliers match your search' : 'No suppliers yet'} message={q ? undefined : 'Add a supplier to link products and stock-in deliveries.'} />
        ) : (
          <DataTable columns={columns} rows={data} caption="Suppliers" />
        )}
      </div>
      {editing && <SupplierModal supplier={editing.id ? editing : null} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />}
      {viewing && <SupplierDetails supplier={viewing} onClose={() => setViewing(null)} />}
      {toDelete && (
        <ConfirmDialog title="Delete supplier?" confirmLabel="Delete supplier" danger busy={busy} onConfirm={remove} onCancel={() => setToDelete(null)}
          message={`"${toDelete.companyName}" will be removed. A supplier with products still assigned cannot be deleted, and one with stock history is archived so old transactions stay intact.`} />
      )}
    </>
  )
}
