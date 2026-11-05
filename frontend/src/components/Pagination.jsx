import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PAGE_SIZES } from '../utils/constants'

export default function Pagination({ page, size, totalElements, totalPages, onPageChange, onSizeChange }) {
  if (totalElements === 0) return null
  const from = page * size + 1
  const to = Math.min((page + 1) * size, totalElements)
  return (
    <nav className="pagination" aria-label="Pagination">
      <span className="info num">Showing {from}–{to} of {totalElements}</span>
      <div className="pages">
        {onSizeChange && (
          <>
            <label className="sr-only" htmlFor="page-size">Rows per page</label>
            <select id="page-size" className="select" value={size} onChange={(e) => onSizeChange(Number(e.target.value))}>
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>{s} / page</option>
              ))}
            </select>
          </>
        )}
        <button type="button" className="btn btn-secondary btn-sm btn-icon" disabled={page <= 0} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
          <ChevronLeft size={16} />
        </button>
        <span className="num">Page {page + 1} of {Math.max(totalPages, 1)}</span>
        <button type="button" className="btn btn-secondary btn-sm btn-icon" disabled={page + 1 >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Next page">
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  )
}
