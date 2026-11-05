import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowDownToLine, ArrowUpFromLine, Pencil, Trash2 } from 'lucide-react'
import { productsApi, stockApi } from '../services/endpoints'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import PageHeader from '../components/PageHeader'
import StatusBadge from '../components/StatusBadge'
import StockGauge from '../components/StockGauge'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import { formatCurrency, formatDate, formatDateTime, formatNumber, TYPE_LABEL } from '../utils/format'
import { getErrorMessage } from '../utils/errors'

export default function ProductDetails() {
  const { id } = useParams()
  const { isAdmin } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const { data, loading, error, reload } = useAsync(
    () => Promise.all([productsApi.get(id), stockApi.transactions({ productId: id, size: 10 })]),
    [id],
  )
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)

  if (loading && !data) return <Loading />
  if (error) return <ErrorState error={error} onRetry={reload} title="Could not load this product" />
  const [p, history] = data

  async function remove() {
    setBusy(true)
    try {
      const res = await productsApi.remove(p.id)
      toast.success(res.message)
      navigate('/products')
    } catch (err) {
      toast.error(getErrorMessage(err))
      setConfirm(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title={p.name} subtitle={`SKU ${p.sku}`}>
        <Link to="/stock-in" state={{ productId: p.id }} className="btn btn-secondary"><ArrowDownToLine size={16} /> Stock in</Link>
        <Link to="/stock-out" state={{ productId: p.id }} className="btn btn-secondary"><ArrowUpFromLine size={16} /> Stock out</Link>
        {isAdmin && (
          <>
            <Link to={`/products/${p.id}/edit`} className="btn btn-secondary"><Pencil size={16} /> Edit</Link>
            <button type="button" className="btn btn-danger" onClick={() => setConfirm(true)}><Trash2 size={16} /> Delete</button>
          </>
        )}
      </PageHeader>

      {!p.active && <div className="alert alert-warn" style={{ marginBottom: 16 }}>This product is archived. It is hidden from lists and its stock can no longer change.</div>}

      <div className="grid-2">
        <section className="card card-pad">
          <h2 style={{ marginBottom: 14 }}>Details</h2>
          <dl className="dl">
            <dt>Category</dt><dd>{p.categoryName || '-'}</dd>
            <dt>Supplier</dt><dd>{p.supplierName || '-'}</dd>
            <dt>Purchase price</dt><dd className="num">{formatCurrency(p.purchasePrice)}</dd>
            <dt>Selling price</dt><dd className="num">{formatCurrency(p.sellingPrice)}</dd>
            <dt>Description</dt><dd>{p.description || '-'}</dd>
            <dt>Created</dt><dd>{formatDate(p.createdAt)}</dd>
            <dt>Last updated</dt><dd>{formatDateTime(p.updatedAt)}</dd>
          </dl>
        </section>
        <section className="card card-pad">
          <h2 style={{ marginBottom: 14 }}>Stock</h2>
          <div className="stack">
            <div className="row"><StatusBadge status={p.stockStatus} /></div>
            <StockGauge quantity={p.quantity} minimum={p.minimumStockLevel} status={p.stockStatus} />
            <dl className="dl">
              <dt>Available quantity</dt><dd className="num">{formatNumber(p.quantity)}</dd>
              <dt>Minimum level</dt><dd className="num">{formatNumber(p.minimumStockLevel)}</dd>
              <dt>Stock value (cost)</dt><dd className="num">{formatCurrency(p.stockValue)}</dd>
            </dl>
          </div>
        </section>
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <h2>Recent stock movement</h2>
          <span className="spacer" />
          <Link className="btn btn-ghost btn-sm" to="/transactions" state={{ productId: p.id }}>Full history</Link>
        </div>
        {history.content.length === 0 ? <EmptyState title="No stock movement yet" /> : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Date</th><th>Type</th><th className="right">Qty</th><th className="right">Before</th><th className="right">After</th><th>By</th><th>Note / reason</th></tr></thead>
              <tbody>
                {history.content.map((t) => (
                  <tr key={t.id}>
                    <td className="nowrap">{formatDateTime(t.transactionDate)}</td>
                    <td className={t.transactionType === 'STOCK_IN' ? 'type-in' : 'type-out'}>{TYPE_LABEL[t.transactionType]}</td>
                    <td className="right num">{formatNumber(t.quantity)}</td>
                    <td className="right num">{formatNumber(t.previousQuantity)}</td>
                    <td className="right num">{formatNumber(t.newQuantity)}</td>
                    <td>{t.userName || '-'}</td>
                    <td>{t.reason || t.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {confirm && (
        <ConfirmDialog title="Delete product?" message={`"${p.name}" will be removed. If it has stock history it is archived instead, and its transactions are kept.`}
          confirmLabel="Delete product" danger busy={busy} onConfirm={remove} onCancel={() => setConfirm(false)} />
      )}
    </>
  )
}
