import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { productsApi, stockApi } from '../services/endpoints'
import { useAsync } from '../hooks/useAsync'
import { useLookups } from '../hooks/useLookups'
import { useToast } from '../hooks/useToast'
import PageHeader from '../components/PageHeader'
import FormField from '../components/FormField'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'
import StatusBadge from '../components/StatusBadge'
import StockGauge from '../components/StockGauge'
import { STOCK_OUT_REASONS } from '../utils/constants'
import { validateQuantity } from '../utils/validators'
import { formatCurrency, formatNumber } from '../utils/format'
import { getErrorMessage, getFieldErrors } from '../utils/errors'

const newRequestId = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`)

/**
 * Shared form for Stock in and Stock out. The requestId is generated once per submission attempt:
 * if the same request is sent twice (double click, network retry) the server applies it only once.
 */
export default function StockForm({ mode }) {
  const isIn = mode === 'in'
  const toast = useToast()
  const location = useLocation()
  const { suppliers } = useLookups()
  const products = useAsync(() => productsApi.list({ size: 500, sortBy: 'name', direction: 'asc' }), [])

  const [form, setForm] = useState({ productId: location.state?.productId ? String(location.state.productId) : '', quantity: '', supplierId: '', purchasePrice: '', reason: 'SALE', notes: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const requestId = useRef(newRequestId())

  const list = products.data?.content || []
  const selected = list.find((p) => String(p.id) === form.productId)

  // When a product is picked, pre-fill its usual supplier and purchase price for stock in.
  useEffect(() => {
    if (isIn && selected) {
      setForm((f) => ({ ...f, supplierId: selected.supplierId ? String(selected.supplierId) : '', purchasePrice: String(selected.purchasePrice) }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.productId, isIn])

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  async function onSubmit(e) {
    e.preventDefault()
    if (busy) return
    const found = {}
    if (!form.productId) found.productId = 'Select a product'
    const qtyError = validateQuantity(form.quantity)
    if (qtyError) found.quantity = qtyError
    if (!isIn && !form.reason) found.reason = 'Select a reason'
    if (!isIn && selected && !found.quantity && Number(form.quantity) > selected.quantity) {
      found.quantity = `Only ${selected.quantity} available`
    }
    if (isIn && form.purchasePrice !== '' && Number(form.purchasePrice) < 0) found.purchasePrice = 'Price cannot be negative'
    setErrors(found)
    setFormError('')
    if (Object.keys(found).length) return

    const payload = isIn
      ? { productId: Number(form.productId), quantity: Number(form.quantity), supplierId: form.supplierId ? Number(form.supplierId) : null,
          purchasePrice: form.purchasePrice === '' ? null : Number(form.purchasePrice), notes: form.notes.trim() || null, requestId: requestId.current }
      : { productId: Number(form.productId), quantity: Number(form.quantity), reason: form.reason, notes: form.notes.trim() || null, requestId: requestId.current }

    setBusy(true)
    try {
      const tx = await (isIn ? stockApi.stockIn(payload) : stockApi.stockOut(payload))
      toast.success(`${isIn ? 'Stock added' : 'Stock issued'}: ${tx.productName} is now ${formatNumber(tx.newQuantity)}`)
      requestId.current = newRequestId()          // the next submission is a new request
      setForm((f) => ({ ...f, quantity: '', notes: '' }))
      products.reload()                            // refresh the quantity shown on screen
    } catch (err) {
      const message = getErrorMessage(err)
      setErrors(getFieldErrors(err))
      setFormError(message)
      toast.error(message)
      if (err.response?.status === 409) products.reload()   // quantity may have changed meanwhile
    } finally {
      setBusy(false)
    }
  }

  if (products.loading && !products.data) return <Loading />
  if (products.error) return <ErrorState error={products.error} onRetry={products.reload} />

  return (
    <>
      <PageHeader title={isIn ? 'Stock in' : 'Stock out'} subtitle={isIn ? 'Record goods received. The product quantity increases immediately.' : 'Record goods issued. Quantity can never go below zero.'} />
      <div className="grid-3-1">
        <form className="card card-pad" onSubmit={onSubmit} noValidate>
          {formError && <div className="alert alert-error" role="alert" style={{ marginBottom: 16 }}>{formError}</div>}
          <div className="form-grid">
            <FormField label="Product" error={errors.productId} required className="full">
              <select className="select" value={form.productId} onChange={set('productId')}>
                <option value="">Select a product</option>
                {list.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
              </select>
            </FormField>
            <FormField label={isIn ? 'Quantity received' : 'Quantity issued'} error={errors.quantity} required>
              <input className="input num" type="number" min="1" step="1" value={form.quantity} onChange={set('quantity')} />
            </FormField>
            {isIn ? (
              <FormField label="Purchase price per unit (₹)" error={errors.purchasePrice} hint="Recorded on this transaction.">
                <input className="input num" type="number" min="0" step="0.01" value={form.purchasePrice} onChange={set('purchasePrice')} />
              </FormField>
            ) : (
              <FormField label="Reason" error={errors.reason} required>
                <select className="select" value={form.reason} onChange={set('reason')}>
                  {STOCK_OUT_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </FormField>
            )}
            {isIn && (
              <FormField label="Supplier" error={errors.supplierId} className="full">
                <select className="select" value={form.supplierId} onChange={set('supplierId')}>
                  <option value="">No supplier</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.companyName}</option>)}
                </select>
              </FormField>
            )}
            <FormField label="Notes" error={errors.notes} className="full">
              <textarea className="textarea" value={form.notes} onChange={set('notes')} maxLength={500} placeholder={isIn ? 'e.g. Delivery note or invoice number' : 'e.g. Order number or who requested it'} />
            </FormField>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : isIn ? 'Record stock in' : 'Record stock out'}</button>
          </div>
        </form>

        <aside className="card card-pad" aria-label="Selected product">
          <h2 style={{ marginBottom: 12 }}>Current stock</h2>
          {!selected ? <p className="muted">Select a product to see how much is in stock.</p> : (
            <div className="stack">
              <div><strong>{selected.name}</strong><div className="cell-sub">{selected.sku}</div></div>
              <div className="stat-value num">{formatNumber(selected.quantity)} <span className="muted" style={{ fontSize: '0.9rem', fontWeight: 400 }}>units</span></div>
              <StockGauge quantity={selected.quantity} minimum={selected.minimumStockLevel} status={selected.stockStatus} />
              <StatusBadge status={selected.stockStatus} />
              <div className="cell-sub">Purchase price {formatCurrency(selected.purchasePrice)}</div>
              {form.quantity && !validateQuantity(form.quantity) && (
                <div className="alert alert-info">After this transaction: <strong className="num">{formatNumber(Math.max(0, selected.quantity + (isIn ? 1 : -1) * Number(form.quantity)))}</strong> units</div>
              )}
            </div>
          )}
        </aside>
      </div>
    </>
  )
}
