import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { productsApi } from '../services/endpoints'
import { useAsync } from '../hooks/useAsync'
import { useLookups } from '../hooks/useLookups'
import { useToast } from '../hooks/useToast'
import PageHeader from '../components/PageHeader'
import FormField from '../components/FormField'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'
import { validateProduct } from '../utils/validators'
import { getErrorMessage, getFieldErrors } from '../utils/errors'

const EMPTY = { name: '', sku: '', description: '', categoryId: '', supplierId: '', purchasePrice: '', sellingPrice: '', quantity: '0', minimumStockLevel: '10' }

export default function ProductForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const toast = useToast()
  const { categoryOptions, supplierOptions, loading: lookupsLoading } = useLookups()
  const existing = useAsync(() => (isEdit ? productsApi.get(id) : Promise.resolve(null)), [id])

  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const p = existing.data
    if (p) {
      setForm({
        name: p.name, sku: p.sku, description: p.description || '',
        categoryId: p.categoryId ? String(p.categoryId) : '', supplierId: p.supplierId ? String(p.supplierId) : '',
        purchasePrice: String(p.purchasePrice), sellingPrice: String(p.sellingPrice),
        quantity: String(p.quantity), minimumStockLevel: String(p.minimumStockLevel),
      })
    }
  }, [existing.data])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  async function onSubmit(e) {
    e.preventDefault()
    const found = validateProduct(form, { isEdit })
    setErrors(found)
    setFormError('')
    if (Object.keys(found).length) return

    const payload = {
      name: form.name.trim(), sku: form.sku.trim(), description: form.description.trim() || null,
      categoryId: Number(form.categoryId), supplierId: form.supplierId ? Number(form.supplierId) : null,
      purchasePrice: Number(form.purchasePrice), sellingPrice: Number(form.sellingPrice),
      quantity: isEdit ? undefined : Number(form.quantity || 0),
      minimumStockLevel: Number(form.minimumStockLevel),
    }
    setBusy(true)
    try {
      const saved = isEdit ? await productsApi.update(id, payload) : await productsApi.create(payload)
      toast.success(isEdit ? 'Product updated' : 'Product created')
      navigate(`/products/${saved.id}`)
    } catch (err) {
      setErrors(getFieldErrors(err))
      setFormError(getErrorMessage(err))
      toast.error(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (isEdit && existing.loading && !existing.data) return <Loading />
  if (isEdit && existing.error) return <ErrorState error={existing.error} onRetry={existing.reload} />

  return (
    <>
      <PageHeader title={isEdit ? 'Edit product' : 'Add product'} subtitle={isEdit ? form.sku : 'Create a product and, optionally, its opening stock.'} />
      <form className="card card-pad" onSubmit={onSubmit} noValidate>
        {formError && <div className="alert alert-error" role="alert" style={{ marginBottom: 16 }}>{formError}</div>}
        <div className="form-grid">
          <FormField label="Product name" error={errors.name} required>
            <input className="input" value={form.name} onChange={set('name')} maxLength={150} />
          </FormField>
          <FormField label="SKU / product code" error={errors.sku} required hint="Must be unique. Saved in upper case.">
            <input className="input" value={form.sku} onChange={set('sku')} maxLength={50} />
          </FormField>
          <FormField label="Category" error={errors.categoryId} required>
            <select className="select" value={form.categoryId} onChange={set('categoryId')} disabled={lookupsLoading}>
              <option value="">Select a category</option>
              {categoryOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </FormField>
          <FormField label="Supplier" error={errors.supplierId}>
            <select className="select" value={form.supplierId} onChange={set('supplierId')} disabled={lookupsLoading}>
              <option value="">No supplier</option>
              {supplierOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </FormField>
          <FormField label="Purchase price (₹)" error={errors.purchasePrice} required>
            <input className="input num" type="number" min="0" step="0.01" value={form.purchasePrice} onChange={set('purchasePrice')} />
          </FormField>
          <FormField label="Selling price (₹)" error={errors.sellingPrice} required>
            <input className="input num" type="number" min="0" step="0.01" value={form.sellingPrice} onChange={set('sellingPrice')} />
          </FormField>
          <FormField label={isEdit ? 'Available quantity' : 'Opening quantity'} error={errors.quantity}
            hint={isEdit ? 'Change stock with Stock in or Stock out so the history stays accurate.' : 'Recorded as an opening stock-in transaction.'}>
            <input className="input num" type="number" min="0" step="1" value={form.quantity} onChange={set('quantity')} disabled={isEdit} />
          </FormField>
          <FormField label="Minimum stock level" error={errors.minimumStockLevel} required hint="Low-stock alerts start at or below this number.">
            <input className="input num" type="number" min="0" step="1" value={form.minimumStockLevel} onChange={set('minimumStockLevel')} />
          </FormField>
          <FormField label="Description" error={errors.description} className="full">
            <textarea className="textarea" value={form.description} onChange={set('description')} maxLength={1000} />
          </FormField>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)} disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}</button>
        </div>
      </form>
    </>
  )
}
