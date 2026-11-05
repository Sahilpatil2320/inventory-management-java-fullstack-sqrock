import { useMemo, useState } from 'react'
import { Download, Printer } from 'lucide-react'
import { productsApi, reportsApi } from '../services/endpoints'
import { useAsync } from '../hooks/useAsync'
import { useDebounce } from '../hooks/useDebounce'
import { useAuth } from '../hooks/useAuth'
import { useLookups } from '../hooks/useLookups'
import PageHeader from '../components/PageHeader'
import SearchBar from '../components/SearchBar'
import Select from '../components/Select'
import FormField from '../components/FormField'
import DataTable from '../components/DataTable'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import StatusBadge from '../components/StatusBadge'
import { downloadCsv } from '../utils/csv'
import { formatCurrency, formatDateTime, formatNumber, STATUS_LABEL, TYPE_LABEL, toDateInput } from '../utils/format'

/* ---- column sets: header, on-screen render, and the plain value used for CSV ---- */
const productColumns = [
  { key: 'sku', header: 'SKU', render: (p) => p.sku, csv: (p) => p.sku },
  { key: 'name', header: 'Product', render: (p) => <span className="cell-title">{p.name}</span>, csv: (p) => p.name },
  { key: 'category', header: 'Category', render: (p) => p.categoryName || '-', csv: (p) => p.categoryName },
  { key: 'supplier', header: 'Supplier', render: (p) => p.supplierName || '-', csv: (p) => p.supplierName },
  { key: 'qty', header: 'Quantity', align: 'right', render: (p) => formatNumber(p.quantity), csv: (p) => p.quantity },
  { key: 'min', header: 'Minimum', align: 'right', render: (p) => formatNumber(p.minimumStockLevel), csv: (p) => p.minimumStockLevel },
  { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.stockStatus} />, csv: (p) => STATUS_LABEL[p.stockStatus] },
  { key: 'cost', header: 'Purchase price', align: 'right', render: (p) => formatCurrency(p.purchasePrice), csv: (p) => p.purchasePrice },
  { key: 'sell', header: 'Selling price', align: 'right', render: (p) => formatCurrency(p.sellingPrice), csv: (p) => p.sellingPrice },
  { key: 'value', header: 'Stock value', align: 'right', render: (p) => formatCurrency(p.stockValue), csv: (p) => p.stockValue },
]

const txColumns = [
  { key: 'date', header: 'Date', render: (t) => formatDateTime(t.transactionDate), csv: (t) => t.transactionDate },
  { key: 'sku', header: 'SKU', render: (t) => t.productSku, csv: (t) => t.productSku },
  { key: 'product', header: 'Product', render: (t) => <span className="cell-title">{t.productName}</span>, csv: (t) => t.productName },
  { key: 'category', header: 'Category', render: (t) => t.categoryName || '-', csv: (t) => t.categoryName },
  { key: 'type', header: 'Type', render: (t) => <span className={t.transactionType === 'STOCK_IN' ? 'type-in' : 'type-out'}>{TYPE_LABEL[t.transactionType]}</span>, csv: (t) => TYPE_LABEL[t.transactionType] },
  { key: 'qty', header: 'Quantity', align: 'right', render: (t) => formatNumber(t.quantity), csv: (t) => t.quantity },
  { key: 'before', header: 'Before', align: 'right', render: (t) => formatNumber(t.previousQuantity), csv: (t) => t.previousQuantity },
  { key: 'after', header: 'After', align: 'right', render: (t) => formatNumber(t.newQuantity), csv: (t) => t.newQuantity },
  { key: 'supplier', header: 'Supplier', render: (t) => t.supplierName || '-', csv: (t) => t.supplierName },
  { key: 'by', header: 'Recorded by', render: (t) => t.userName || '-', csv: (t) => t.userName },
  { key: 'reason', header: 'Reason / notes', render: (t) => [t.reason, t.notes].filter(Boolean).join(' · ') || '-', csv: (t) => [t.reason, t.notes].filter(Boolean).join(' · ') },
]

/** Groups inventory rows by category for the summary report. */
export function summarizeByCategory(products) {
  const map = new Map()
  products.forEach((p) => {
    const key = p.categoryName || 'Uncategorised'
    const row = map.get(key) || { category: key, products: 0, units: 0, value: 0, low: 0, out: 0 }
    row.products += 1
    row.units += p.quantity
    row.value += Number(p.stockValue)
    if (p.stockStatus === 'LOW_STOCK') row.low += 1
    if (p.stockStatus === 'OUT_OF_STOCK') row.out += 1
    map.set(key, row)
  })
  return [...map.values()].sort((a, b) => a.category.localeCompare(b.category))
}

const summaryColumns = [
  { key: 'category', header: 'Category', render: (r) => <span className="cell-title">{r.category}</span>, csv: (r) => r.category },
  { key: 'products', header: 'Products', align: 'right', render: (r) => formatNumber(r.products), csv: (r) => r.products },
  { key: 'units', header: 'Units in stock', align: 'right', render: (r) => formatNumber(r.units), csv: (r) => r.units },
  { key: 'low', header: 'Low stock', align: 'right', render: (r) => formatNumber(r.low), csv: (r) => r.low },
  { key: 'out', header: 'Out of stock', align: 'right', render: (r) => formatNumber(r.out), csv: (r) => r.out },
  { key: 'value', header: 'Stock value', align: 'right', render: (r) => formatCurrency(r.value), csv: (r) => r.value },
]

const supplierColumns = [
  { key: 'company', header: 'Company', render: (s) => <span className="cell-title">{s.companyName}</span>, csv: (s) => s.companyName },
  { key: 'contact', header: 'Contact', render: (s) => s.supplierName, csv: (s) => s.supplierName },
  { key: 'email', header: 'Email', render: (s) => s.email, csv: (s) => s.email },
  { key: 'phone', header: 'Phone', render: (s) => s.phone, csv: (s) => s.phone },
  { key: 'products', header: 'Products', align: 'right', render: (s) => formatNumber(s.productCount), csv: (s) => s.productCount },
  { key: 'units', header: 'Units in stock', align: 'right', render: (s) => formatNumber(s.unitsInStock), csv: (s) => s.unitsInStock },
  { key: 'received', header: 'Units received', align: 'right', render: (s) => formatNumber(s.unitsReceived), csv: (s) => s.unitsReceived },
  { key: 'value', header: 'Stock value', align: 'right', render: (s) => formatCurrency(s.stockValue), csv: (s) => s.stockValue },
]

const valuationColumns = [
  { key: 'sku', header: 'SKU', render: (r) => r.sku, csv: (r) => r.sku },
  { key: 'name', header: 'Product', render: (r) => <span className="cell-title">{r.name}</span>, csv: (r) => r.name },
  { key: 'category', header: 'Category', render: (r) => r.categoryName || '-', csv: (r) => r.categoryName },
  { key: 'qty', header: 'Quantity', align: 'right', render: (r) => formatNumber(r.quantity), csv: (r) => r.quantity },
  { key: 'cost', header: 'Unit cost', align: 'right', render: (r) => formatCurrency(r.purchasePrice), csv: (r) => r.purchasePrice },
  { key: 'costValue', header: 'Cost value', align: 'right', render: (r) => formatCurrency(r.costValue), csv: (r) => r.costValue },
  { key: 'retail', header: 'Retail value', align: 'right', render: (r) => formatCurrency(r.retailValue), csv: (r) => r.retailValue },
  { key: 'profit', header: 'Potential profit', align: 'right', render: (r) => formatCurrency(r.potentialProfit), csv: (r) => r.potentialProfit },
]

/** Each report: which filters it shows, how to load it, and how to display / export it. */
export const REPORTS = [
  { key: 'summary', title: 'Inventory summary', filters: ['category'], columns: summaryColumns,
    load: async (f) => ({ rows: summarizeByCategory(await reportsApi.inventory({ categoryId: f.categoryId })) }) },
  { key: 'products', title: 'Product report', filters: ['search', 'category', 'supplier'], columns: productColumns,
    load: async (f) => ({ rows: await reportsApi.inventory({ search: f.search, categoryId: f.categoryId, supplierId: f.supplierId }) }) },
  { key: 'low-stock', title: 'Low stock report', filters: ['search', 'category', 'supplier'], columns: productColumns,
    load: async (f) => ({ rows: await reportsApi.inventory({ search: f.search, categoryId: f.categoryId, supplierId: f.supplierId, stockStatus: 'LOW_STOCK' }) }) },
  { key: 'out-of-stock', title: 'Out of stock report', filters: ['search', 'category', 'supplier'], columns: productColumns,
    load: async (f) => ({ rows: await reportsApi.inventory({ search: f.search, categoryId: f.categoryId, supplierId: f.supplierId, stockStatus: 'OUT_OF_STOCK' }) }) },
  { key: 'stock-in', title: 'Stock in report', filters: ['search', 'category', 'product', 'date'], columns: txColumns,
    load: async (f) => ({ rows: await reportsApi.stockMovements({ ...txParams(f), type: 'STOCK_IN' }) }) },
  { key: 'stock-out', title: 'Stock out report', filters: ['search', 'category', 'product', 'date'], columns: txColumns,
    load: async (f) => ({ rows: await reportsApi.stockMovements({ ...txParams(f), type: 'STOCK_OUT' }) }) },
  { key: 'movement', title: 'Stock movement report', filters: ['search', 'category', 'product', 'date'], columns: txColumns,
    load: async (f) => ({ rows: await reportsApi.stockMovements(txParams(f)) }) },
  { key: 'suppliers', title: 'Supplier report', adminOnly: true, filters: [], columns: supplierColumns,
    load: async () => ({ rows: await reportsApi.suppliers() }) },
  { key: 'valuation', title: 'Inventory valuation report', adminOnly: true, filters: ['search', 'category'], columns: valuationColumns,
    load: async (f) => {
      const r = await reportsApi.valuation({ search: f.search, categoryId: f.categoryId })
      return { rows: r.rows, totals: r }
    } },
]

const txParams = (f) => ({ search: f.search, categoryId: f.categoryId, productId: f.productId, from: f.from, to: f.to })

export default function Reports() {
  const { isAdmin } = useAuth()
  const { categoryOptions, supplierOptions } = useLookups()
  const products = useAsync(() => productsApi.list({ size: 500, sortBy: 'name' }), [])
  const available = useMemo(() => REPORTS.filter((r) => isAdmin || !r.adminOnly), [isAdmin])

  const [key, setKey] = useState('summary')
  const [f, setF] = useState({ search: '', categoryId: '', supplierId: '', productId: '', from: '', to: '' })
  const search = useDebounce(f.search)
  const report = available.find((r) => r.key === key) || available[0]
  const effective = { ...f, search }

  const { data, loading, error, reload } = useAsync(() => report.load(effective), [report.key, search, f.categoryId, f.supplierId, f.productId, f.from, f.to])
  const set = (field) => (value) => setF((s) => ({ ...s, [field]: value }))
  const productOptions = (products.data?.content || []).map((p) => ({ value: String(p.id), label: `${p.name} (${p.sku})` }))
  const rows = data?.rows || []

  function exportCsv() {
    downloadCsv(`${report.key}-report-${toDateInput(new Date())}.csv`, report.columns, rows)
  }

  const footer = data?.totals && (
    <tr>
      <td colSpan={3}>Totals</td>
      <td className="right num">{formatNumber(data.totals.totalQuantity)}</td>
      <td />
      <td className="right num">{formatCurrency(data.totals.totalCostValue)}</td>
      <td className="right num">{formatCurrency(data.totals.totalRetailValue)}</td>
      <td className="right num">{formatCurrency(data.totals.totalPotentialProfit)}</td>
    </tr>
  )

  return (
    <>
      <PageHeader title="Reports" subtitle="Built from live database records. Export to CSV or print.">
        <button type="button" className="btn btn-secondary" onClick={() => window.print()} disabled={!rows.length}><Printer size={16} /> Print</button>
        <button type="button" className="btn btn-primary" onClick={exportCsv} disabled={!rows.length}><Download size={16} /> Export CSV</button>
      </PageHeader>

      <div className="tabs no-print" role="tablist" aria-label="Reports" style={{ marginBottom: 14 }}>
        {available.map((r) => (
          <button key={r.key} type="button" role="tab" className="tab" aria-selected={r.key === report.key} onClick={() => setKey(r.key)}>{r.title}</button>
        ))}
      </div>

      <div className="card">
        <div className="print-only card-pad"><h2>{report.title}</h2><p className="muted">Generated {formatDateTime(new Date().toISOString())}</p></div>
        {report.filters.length > 0 && (
          <div className="toolbar">
            {report.filters.includes('search') && <SearchBar value={f.search} onChange={set('search')} placeholder="Search by product name or SKU" label="Search report" />}
            {report.filters.includes('category') && <Select label="Category" value={f.categoryId} onChange={set('categoryId')} options={categoryOptions} allLabel="All categories" />}
            {report.filters.includes('supplier') && <Select label="Supplier" value={f.supplierId} onChange={set('supplierId')} options={supplierOptions} allLabel="All suppliers" />}
            {report.filters.includes('product') && <Select label="Product" value={f.productId} onChange={set('productId')} options={productOptions} allLabel="All products" />}
            {report.filters.includes('date') && (
              <>
                <FormField label="From date"><input className="input" type="date" value={f.from} max={f.to || undefined} onChange={(e) => set('from')(e.target.value)} /></FormField>
                <FormField label="To date"><input className="input" type="date" value={f.to} min={f.from || undefined} onChange={(e) => set('to')(e.target.value)} /></FormField>
              </>
            )}
          </div>
        )}
        {loading && !data ? <Loading label="Building report…" /> : error ? <ErrorState error={error} onRetry={reload} /> : rows.length === 0 ? (
          <EmptyState title="No data for this report" message="Change the filters or date range." />
        ) : (
          <>
            <DataTable columns={report.columns} rows={rows} rowKey={(r, i) => r.id ?? r.productId ?? r.supplierId ?? r.category ?? i} footer={footer} caption={report.title} />
            <div className="card-pad muted no-print">{formatNumber(rows.length)} row{rows.length === 1 ? '' : 's'}</div>
          </>
        )}
      </div>
    </>
  )
}
