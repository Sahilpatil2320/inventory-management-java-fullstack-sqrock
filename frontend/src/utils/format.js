const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })
const number = new Intl.NumberFormat('en-IN')

export const formatCurrency = (value) => (value === null || value === undefined ? '-' : currency.format(Number(value)))
export const formatNumber = (value) => (value === null || value === undefined ? '-' : number.format(Number(value)))

export function formatDate(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return (
    d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ', ' +
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  )
}

export const STATUS_LABEL = { IN_STOCK: 'In stock', LOW_STOCK: 'Low stock', OUT_OF_STOCK: 'Out of stock' }
export const STATUS_TONE = { IN_STOCK: 'ok', LOW_STOCK: 'warn', OUT_OF_STOCK: 'bad' }
export const TYPE_LABEL = { STOCK_IN: 'Stock in', STOCK_OUT: 'Stock out' }

/** yyyy-mm-dd for <input type="date"> values */
export const toDateInput = (d) => d.toISOString().slice(0, 10)
