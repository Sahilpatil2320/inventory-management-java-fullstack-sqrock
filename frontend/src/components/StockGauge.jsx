import { formatNumber } from '../utils/format'

/** Quantity drawn against the minimum level (the dark tick). The bar is full at 3x the minimum. */
export default function StockGauge({ quantity, minimum, status }) {
  const scale = Math.max(minimum * 3, quantity, 1)
  const fill = Math.min(100, (quantity / scale) * 100)
  const minPos = Math.min(100, (minimum / scale) * 100)
  const tone = status === 'OUT_OF_STOCK' ? 'out' : status === 'LOW_STOCK' ? 'low' : 'in'
  return (
    <div className="gauge" title={`${quantity} in stock, minimum ${minimum}`}>
      <div className="gauge-track">
        <div className={`gauge-fill ${tone}`} style={{ width: `${fill}%` }} />
        <div className="gauge-min" style={{ left: `${minPos}%` }} />
      </div>
      <span className="gauge-text num">
        {formatNumber(quantity)} <span aria-hidden="true">/</span> min {formatNumber(minimum)}
      </span>
    </div>
  )
}
