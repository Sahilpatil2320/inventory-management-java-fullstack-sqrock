import { useState } from 'react'
import { History } from 'lucide-react'
import { dashboardApi, productsApi, stockApi } from '../services/endpoints'
import { useAsync } from '../hooks/useAsync'
import { useDebounce } from '../hooks/useDebounce'
import { useLookups } from '../hooks/useLookups'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import SearchBar from '../components/SearchBar'
import Select from '../components/Select'
import DataTable from '../components/DataTable'
import Pagination from '../components/Pagination'
import StatusBadge from '../components/StatusBadge'
import StockGauge from '../components/StockGauge'
import Modal from '../components/Modal'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import { formatCurrency, formatDateTime, formatNumber, TYPE_LABEL } from '../utils/format'

function MovementModal({ product, onClose }) {
  const [type, setType] = useState('')
  const { data, loading, error, reload } = useAsync(() => stockApi.transactions({ productId: product.id, type, size: 100 }), [product.id, type])
  return (
    <Modal title={`Stock movement: ${product.name}`} onClose={onClose} wide>
      <div className="tabs" role="tablist" style={{ marginBottom: 14 }}>
        {[['', 'All movement'], ['STOCK_IN', 'Stock-in history'], ['STOCK_OUT', 'Stock-out history']].map(([value, label]) => (
          <button key={label} type="button" role="tab" className="tab" aria-selected={type === value} onClick={() => setType(value)}>{label}</button>
        ))}
      </div>
      {loading ? <Loading /> : error ? <ErrorState error={error} onRetry={reload} /> : data.content.length === 0 ? <EmptyState title="No movement recorded" /> : (
        <DataTable rows={data.content} caption="Product stock movement" columns={[
          { key: 'date', header: 'Date', nowrap: true, render: (t) => formatDateTime(t.transactionDate) },
          { key: 'type', header: 'Type', render: (t) => <span className={t.transactionType === 'STOCK_IN' ? 'type-in' : 'type-out'}>{TYPE_LABEL[t.transactionType]}</span> },
          { key: 'qty', header: 'Qty', align: 'right', render: (t) => formatNumber(t.quantity) },
          { key: 'after', header: 'Stock after', align: 'right', render: (t) => formatNumber(t.newQuantity) },
          { key: 'by', header: 'By', render: (t) => t.userName || '-' },
        ]} />
      )}
    </Modal>
  )
}

export default function Inventory() {
  const { categoryOptions } = useLookups()
  const summary = useAsync(() => dashboardApi.summary(), [])
  const [tab, setTab] = useState('')
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const [selected, setSelected] = useState(null)
  const q = useDebounce(search)

  const { data, loading, error, reload } = useAsync(
    () => productsApi.list({ search: q, categoryId, stockStatus: tab, page, size, sortBy: 'quantity', direction: 'asc' }),
    [q, categoryId, tab, page, size],
  )
  const s = summary.data

  const columns = [
    { key: 'name', header: 'Product', render: (p) => <><span className="cell-title">{p.name}</span><div className="cell-sub">{p.sku} · {p.categoryName || 'No category'}</div></> },
    { key: 'stock', header: 'Current stock', render: (p) => <StockGauge quantity={p.quantity} minimum={p.minimumStockLevel} status={p.stockStatus} /> },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.stockStatus} /> },
    { key: 'cost', header: 'Unit cost', align: 'right', render: (p) => formatCurrency(p.purchasePrice) },
    { key: 'value', header: 'Stock value', align: 'right', render: (p) => formatCurrency(p.stockValue) },
    { key: 'move', header: <span className="sr-only">Movement</span>, render: (p) => (
      <div className="row-actions"><button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelected(p)}><History size={14} /> Movement</button></div>
    ) },
  ]

  return (
    <>
      <PageHeader title="Inventory tracking" subtitle="Current stock, alerts, valuation and per-product movement." />
      {s && (
        <div className="stat-grid" style={{ marginBottom: 16 }}>
          <StatCard label="Units in stock" value={formatNumber(s.totalStockQuantity)} tone="accent" />
          <StatCard label="Inventory value" value={formatCurrency(s.totalInventoryValue)} tone="accent" />
          <StatCard label="Low-stock alerts" value={formatNumber(s.lowStockProducts)} tone="warn" />
          <StatCard label="Out-of-stock alerts" value={formatNumber(s.outOfStockProducts)} tone="bad" />
        </div>
      )}
      <div className="card">
        <div className="toolbar">
          <div className="tabs" role="tablist" aria-label="Stock status" style={{ flexBasis: '100%' }}>
            {[['', 'All products'], ['LOW_STOCK', 'Low stock'], ['OUT_OF_STOCK', 'Out of stock'], ['IN_STOCK', 'In stock']].map(([value, label]) => (
              <button key={label} type="button" role="tab" className="tab" aria-selected={tab === value} onClick={() => { setTab(value); setPage(0) }}>{label}</button>
            ))}
          </div>
          <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(0) }} placeholder="Search by name or SKU" label="Search inventory" />
          <Select label="Category" value={categoryId} onChange={(v) => { setCategoryId(v); setPage(0) }} options={categoryOptions} allLabel="All categories" />
        </div>
        {loading && !data ? <Loading /> : error ? <ErrorState error={error} onRetry={reload} /> : data.content.length === 0 ? (
          <EmptyState title="No products in this view" message={tab ? 'Nothing is in this stock state right now.' : 'Add products to start tracking inventory.'} />
        ) : (
          <>
            <DataTable columns={columns} rows={data.content} caption="Inventory" />
            <Pagination page={data.page} size={data.size} totalElements={data.totalElements} totalPages={data.totalPages} onPageChange={setPage} onSizeChange={(n) => { setSize(n); setPage(0) }} />
          </>
        )}
      </div>
      {selected && <MovementModal product={selected} onClose={() => setSelected(null)} />}
    </>
  )
}
