import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { stockApi, productsApi } from '../services/endpoints'
import { useAsync } from '../hooks/useAsync'
import { useDebounce } from '../hooks/useDebounce'
import { useLookups } from '../hooks/useLookups'
import PageHeader from '../components/PageHeader'
import SearchBar from '../components/SearchBar'
import Select from '../components/Select'
import FormField from '../components/FormField'
import DataTable from '../components/DataTable'
import Pagination from '../components/Pagination'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import { formatCurrency, formatDateTime, formatNumber, TYPE_LABEL } from '../utils/format'

export const transactionColumns = [
  { key: 'date', header: 'Date', nowrap: true, render: (t) => formatDateTime(t.transactionDate) },
  { key: 'product', header: 'Product', render: (t) => <><span className="cell-title">{t.productName}</span><div className="cell-sub">{t.productSku}</div></> },
  { key: 'type', header: 'Type', render: (t) => <span className={t.transactionType === 'STOCK_IN' ? 'type-in' : 'type-out'}>{TYPE_LABEL[t.transactionType]}</span> },
  { key: 'qty', header: 'Qty', align: 'right', render: (t) => formatNumber(t.quantity) },
  { key: 'before', header: 'Before', align: 'right', render: (t) => formatNumber(t.previousQuantity) },
  { key: 'after', header: 'After', align: 'right', render: (t) => formatNumber(t.newQuantity) },
  { key: 'price', header: 'Unit price', align: 'right', render: (t) => (t.unitPrice == null ? '-' : formatCurrency(t.unitPrice)) },
  { key: 'supplier', header: 'Supplier', render: (t) => t.supplierName || '-' },
  { key: 'by', header: 'By', render: (t) => t.userName || '-' },
  { key: 'note', header: 'Reason / notes', render: (t) => [t.reason && t.reason.replace(/_/g, ' ').toLowerCase(), t.notes].filter(Boolean).join(' · ') || '-' },
]

export default function Transactions() {
  const location = useLocation()
  const { categoryOptions } = useLookups()
  const products = useAsync(() => productsApi.list({ size: 500, sortBy: 'name' }), [])
  const [f, setF] = useState({ productId: location.state?.productId ? String(location.state.productId) : '', categoryId: '', type: '', from: '', to: '', search: '' })
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const search = useDebounce(f.search)

  const { data, loading, error, reload } = useAsync(
    () => stockApi.transactions({ productId: f.productId, categoryId: f.categoryId, type: f.type, from: f.from, to: f.to, search, page, size }),
    [f.productId, f.categoryId, f.type, f.from, f.to, search, page, size],
  )
  const update = (field) => (value) => { setF((s) => ({ ...s, [field]: value })); setPage(0) }
  const productOptions = (products.data?.content || []).map((p) => ({ value: String(p.id), label: `${p.name} (${p.sku})` }))
  const filtered = Object.values({ ...f, search }).some(Boolean)

  return (
    <>
      <PageHeader title="Transaction history" subtitle="Every stock-in and stock-out, newest first. Entries are permanent." />
      <div className="card">
        <div className="toolbar">
          <SearchBar value={f.search} onChange={update('search')} placeholder="Search product name or SKU" label="Search transactions" />
          <Select label="Product" value={f.productId} onChange={update('productId')} options={productOptions} allLabel="All products" />
          <Select label="Category" value={f.categoryId} onChange={update('categoryId')} options={categoryOptions} allLabel="All categories" />
          <Select label="Type" value={f.type} onChange={update('type')} options={[{ value: 'STOCK_IN', label: 'Stock in' }, { value: 'STOCK_OUT', label: 'Stock out' }]} allLabel="In and out" />
          <FormField label="From"><input className="input" type="date" value={f.from} max={f.to || undefined} onChange={(e) => update('from')(e.target.value)} /></FormField>
          <FormField label="To"><input className="input" type="date" value={f.to} min={f.from || undefined} onChange={(e) => update('to')(e.target.value)} /></FormField>
          {filtered && <button type="button" className="btn btn-ghost" onClick={() => { setF({ productId: '', categoryId: '', type: '', from: '', to: '', search: '' }); setPage(0) }}>Clear filters</button>}
        </div>
        {loading && !data ? <Loading /> : error ? <ErrorState error={error} onRetry={reload} /> : data.content.length === 0 ? (
          <EmptyState title={filtered ? 'No transactions match these filters' : 'No transactions yet'} message={filtered ? 'Widen the date range or clear a filter.' : 'Use Stock in or Stock out to record the first movement.'} />
        ) : (
          <>
            <DataTable columns={transactionColumns} rows={data.content} caption="Stock transactions" />
            <Pagination page={data.page} size={data.size} totalElements={data.totalElements} totalPages={data.totalPages} onPageChange={setPage} onSizeChange={(s) => { setSize(s); setPage(0) }} />
          </>
        )}
      </div>
    </>
  )
}
