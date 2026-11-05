import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { productsApi } from '../services/endpoints'
import { useAsync } from '../hooks/useAsync'
import { useDebounce } from '../hooks/useDebounce'
import { useLookups } from '../hooks/useLookups'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import PageHeader from '../components/PageHeader'
import SearchBar from '../components/SearchBar'
import Select from '../components/Select'
import DataTable from '../components/DataTable'
import Pagination from '../components/Pagination'
import StatusBadge from '../components/StatusBadge'
import StockGauge from '../components/StockGauge'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import { formatCurrency } from '../utils/format'
import { getErrorMessage } from '../utils/errors'

const STATUS_OPTIONS = [
  { value: 'IN_STOCK', label: 'In stock' },
  { value: 'LOW_STOCK', label: 'Low stock' },
  { value: 'OUT_OF_STOCK', label: 'Out of stock' },
]

export default function Products() {
  const { isAdmin } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const { categoryOptions, supplierOptions } = useLookups()

  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [stockStatus, setStockStatus] = useState('')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const [sort, setSort] = useState({ field: 'name', direction: 'asc' })
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const q = useDebounce(search)
  const { data, loading, error, reload } = useAsync(
    () => productsApi.list({ search: q, categoryId, supplierId, stockStatus, page, size, sortBy: sort.field, direction: sort.direction }),
    [q, categoryId, supplierId, stockStatus, page, size, sort.field, sort.direction],
  )

  const onFilter = (setter) => (value) => { setter(value); setPage(0) }
  const onSort = (field) => {
    setSort((s) => (s.field === field ? { field, direction: s.direction === 'asc' ? 'desc' : 'asc' } : { field, direction: 'asc' }))
    setPage(0)
  }

  async function confirmDelete() {
    setDeleting(true)
    try {
      const res = await productsApi.remove(toDelete.id)
      toast.success(res.message)
      setToDelete(null)
      if (data.content.length === 1 && page > 0) setPage(page - 1)
      else reload()
    } catch (err) {
      toast.error(getErrorMessage(err))
      setToDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  const columns = [
    { key: 'name', header: 'Product', sortKey: 'name', render: (p) => (<><Link to={`/products/${p.id}`} className="cell-title">{p.name}</Link><div className="cell-sub">{p.sku}</div></>) },
    { key: 'category', header: 'Category', render: (p) => p.categoryName || '-' },
    { key: 'supplier', header: 'Supplier', render: (p) => p.supplierName || '-' },
    { key: 'price', header: 'Selling price', sortKey: 'sellingPrice', align: 'right', render: (p) => formatCurrency(p.sellingPrice) },
    { key: 'quantity', header: 'Stock', sortKey: 'quantity', render: (p) => <StockGauge quantity={p.quantity} minimum={p.minimumStockLevel} status={p.stockStatus} /> },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.stockStatus} /> },
    {
      key: 'actions', header: <span className="sr-only">Actions</span>,
      render: (p) => (
        <div className="row-actions">
          <Link className="btn btn-ghost btn-sm btn-icon" to={`/products/${p.id}`} aria-label={`View ${p.name}`}><Eye size={16} /></Link>
          {isAdmin && (
            <>
              <Link className="btn btn-ghost btn-sm btn-icon" to={`/products/${p.id}/edit`} aria-label={`Edit ${p.name}`}><Pencil size={16} /></Link>
              <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setToDelete(p)} aria-label={`Delete ${p.name}`}><Trash2 size={16} /></button>
            </>
          )}
        </div>
      ),
    },
  ]

  const filtered = Boolean(q || categoryId || supplierId || stockStatus)

  return (
    <>
      <PageHeader title="Products" subtitle="Every product with its current stock level.">
        {isAdmin && (
          <button type="button" className="btn btn-primary" onClick={() => navigate('/products/new')}>
            <Plus size={16} /> Add product
          </button>
        )}
      </PageHeader>

      <div className="card">
        <div className="toolbar">
          <SearchBar value={search} onChange={onFilter(setSearch)} placeholder="Search by name or SKU" label="Search products" />
          <Select label="Category" value={categoryId} onChange={onFilter(setCategoryId)} options={categoryOptions} allLabel="All categories" />
          <Select label="Supplier" value={supplierId} onChange={onFilter(setSupplierId)} options={supplierOptions} allLabel="All suppliers" />
          <Select label="Stock status" value={stockStatus} onChange={onFilter(setStockStatus)} options={STATUS_OPTIONS} allLabel="Any status" />
        </div>

        {loading && !data ? <Loading /> : error ? <ErrorState error={error} onRetry={reload} /> : data.content.length === 0 ? (
          <EmptyState
            title={filtered ? 'No products match these filters' : 'No products yet'}
            message={filtered ? 'Try a different search or clear a filter.' : isAdmin ? 'Add your first product to start tracking stock.' : 'An administrator needs to add products first.'}
            action={isAdmin && !filtered && <Link to="/products/new" className="btn btn-primary">Add product</Link>}
          />
        ) : (
          <>
            <DataTable columns={columns} rows={data.content} sort={sort} onSort={onSort} caption="Products" />
            <Pagination page={data.page} size={data.size} totalElements={data.totalElements} totalPages={data.totalPages}
              onPageChange={setPage} onSizeChange={(s) => { setSize(s); setPage(0) }} />
          </>
        )}
      </div>

      {toDelete && (
        <ConfirmDialog
          title="Delete product?"
          message={`"${toDelete.name}" will be removed. If it has stock history it is archived instead, and its transactions are kept.`}
          confirmLabel="Delete product" danger busy={deleting}
          onConfirm={confirmDelete} onCancel={() => setToDelete(null)}
        />
      )}
    </>
  )
}
