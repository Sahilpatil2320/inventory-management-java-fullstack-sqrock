import { Link } from 'react-router-dom'
import { Package, Tags, Truck, Boxes, IndianRupee, AlertTriangle, PackageX } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { dashboardApi } from '../services/endpoints'
import { useAsync } from '../hooks/useAsync'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import StatusBadge from '../components/StatusBadge'
import StockGauge from '../components/StockGauge'
import { formatCurrency, formatDateTime, formatNumber, TYPE_LABEL } from '../utils/format'

const load = () => Promise.all([dashboardApi.summary(), dashboardApi.lowStock(8), dashboardApi.recentTransactions(8)])

export default function Dashboard() {
  const { data, loading, error, reload } = useAsync(load, [])

  if (loading && !data) return <Loading label="Loading dashboard…" />
  if (error) return <ErrorState error={error} onRetry={reload} />
  const [s, lowStock, recent] = data

  const movement = s.stockMovement.map((d) => ({
    day: new Date(d.date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    'Stock in': d.stockIn,
    'Stock out': d.stockOut,
  }))
  const overviewTotal = Math.max(s.totalProducts, 1)
  const pct = (n) => `${(n / overviewTotal) * 100}%`

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Live view of stock levels, value and recent movement." />

      <div className="stat-grid">
        <StatCard label="Total products" value={formatNumber(s.totalProducts)} icon={Package} tone="accent" />
        <StatCard label="Categories" value={formatNumber(s.totalCategories)} icon={Tags} />
        <StatCard label="Suppliers" value={formatNumber(s.totalSuppliers)} icon={Truck} />
        <StatCard label="Units in stock" value={formatNumber(s.totalStockQuantity)} icon={Boxes} />
        <StatCard label="Inventory value" value={formatCurrency(s.totalInventoryValue)} icon={IndianRupee} tone="accent" />
        <StatCard label="Low stock" value={formatNumber(s.lowStockProducts)} icon={AlertTriangle} tone="warn" />
        <StatCard label="Out of stock" value={formatNumber(s.outOfStockProducts)} icon={PackageX} tone="bad" />
      </div>

      <div className="grid-3-1" style={{ marginTop: 16 }}>
        <section className="card" aria-labelledby="movement-h">
          <div className="card-head"><h2 id="movement-h">Stock movement, last 14 days</h2></div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={movement} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid vertical={false} stroke="#e3e9e7" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Stock in" fill="#1b7f4b" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Stock out" fill="#c46a1a" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card" aria-labelledby="overview-h">
          <div className="card-head"><h2 id="overview-h">Inventory overview</h2></div>
          <div className="card-pad stack">
            <div className="gauge-track" style={{ height: 14, display: 'flex', overflow: 'hidden', borderRadius: 7 }} role="img"
              aria-label={`${s.inStockProducts} in stock, ${s.lowStockProducts} low, ${s.outOfStockProducts} out of stock`}>
              <div style={{ width: pct(s.inStockProducts), background: 'var(--ok)' }} />
              <div style={{ width: pct(s.lowStockProducts), background: '#d9962b' }} />
              <div style={{ width: pct(s.outOfStockProducts), background: 'var(--bad)' }} />
            </div>
            <dl className="dl" style={{ gridTemplateColumns: '1fr auto' }}>
              <dt>In stock</dt><dd className="num">{formatNumber(s.inStockProducts)}</dd>
              <dt>Low stock</dt><dd className="num">{formatNumber(s.lowStockProducts)}</dd>
              <dt>Out of stock</dt><dd className="num">{formatNumber(s.outOfStockProducts)}</dd>
            </dl>
          </div>
        </section>
      </div>

      <div className="grid-2" style={{ marginTop: 16 }}>
        <section className="card" aria-labelledby="cat-h">
          <div className="card-head"><h2 id="cat-h">Products by category</h2></div>
          {s.categoryDistribution.length === 0 ? (
            <EmptyState title="No categorised products" />
          ) : (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={s.categoryDistribution} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 24 }}>
                  <CartesianGrid horizontal={false} stroke="#e3e9e7" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="category" width={110} tick={{ fontSize: 12 }} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="products" name="Products" fill="#0e7c6b" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="card" aria-labelledby="low-h">
          <div className="card-head">
            <h2 id="low-h">Low stock alerts</h2>
            <span className="spacer" />
            <Link to="/inventory" className="btn btn-ghost btn-sm">View all</Link>
          </div>
          {lowStock.length === 0 ? (
            <EmptyState title="All stocked up" message="No product is at or below its minimum level." />
          ) : (
            <ul className="list-plain">
              {lowStock.map((p) => (
                <li key={p.id}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link to={`/products/${p.id}`} className="cell-title">{p.name}</Link>
                    <div className="cell-sub">{p.sku}</div>
                  </div>
                  <StockGauge quantity={p.quantity} minimum={p.minimumStockLevel} status={p.stockStatus} />
                  <StatusBadge status={p.stockStatus} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid-3-1" style={{ marginTop: 16 }}>
        <section className="card" aria-labelledby="tx-h">
          <div className="card-head">
            <h2 id="tx-h">Recent stock transactions</h2>
            <span className="spacer" />
            <Link to="/transactions" className="btn btn-ghost btn-sm">View all</Link>
          </div>
          {recent.length === 0 ? (
            <EmptyState title="No transactions yet" message="Stock-in and stock-out entries will appear here." />
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Date</th><th>Product</th><th>Type</th><th className="right">Qty</th><th className="right">New stock</th></tr></thead>
                <tbody>
                  {recent.map((t) => (
                    <tr key={t.id}>
                      <td className="nowrap">{formatDateTime(t.transactionDate)}</td>
                      <td><span className="cell-title">{t.productName}</span><div className="cell-sub">{t.productSku}</div></td>
                      <td className={t.transactionType === 'STOCK_IN' ? 'type-in' : 'type-out'}>{TYPE_LABEL[t.transactionType]}</td>
                      <td className="right num">{t.transactionType === 'STOCK_IN' ? '+' : '−'}{formatNumber(t.quantity)}</td>
                      <td className="right num">{formatNumber(t.newQuantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card" aria-labelledby="act-h">
          <div className="card-head"><h2 id="act-h">Recent activity</h2></div>
          {recent.length === 0 ? (
            <EmptyState title="No activity yet" />
          ) : (
            <ul className="list-plain">
              {recent.slice(0, 6).map((t) => (
                <li key={t.id}>
                  <span className={`dot ${t.transactionType === 'STOCK_IN' ? 'in' : 'out'}`} aria-hidden="true" />
                  <div style={{ minWidth: 0 }}>
                    <div>
                      {t.userName || 'System'} {t.transactionType === 'STOCK_IN' ? 'received' : 'issued'}{' '}
                      <strong className="num">{formatNumber(t.quantity)}</strong> × {t.productName}
                    </div>
                    <div className="cell-sub">{formatDateTime(t.transactionDate)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
