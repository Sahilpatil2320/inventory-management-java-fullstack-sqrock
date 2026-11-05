import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'

/**
 * columns: [{ key, header, render?(row), align?, sortKey?, nowrap? }]
 * sort: { field, direction } and onSort(field) make a column header clickable.
 */
export default function DataTable({ columns, rows, rowKey = (r) => r.id, sort, onSort, footer, caption }) {
  return (
    <div className="table-wrap">
      <table className="data">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((c) => {
              const sortable = c.sortKey && onSort
              const active = sortable && sort?.field === c.sortKey
              const ariaSort = active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined
              return (
                <th key={c.key} className={c.align === 'right' ? 'right' : ''} aria-sort={ariaSort} scope="col">
                  {sortable ? (
                    <button type="button" className="sort-btn" onClick={() => onSort(c.sortKey)}>
                      {c.header}
                      {active ? (sort.direction === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ChevronsUpDown size={13} opacity={0.5} />}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((c) => (
                <td key={c.key} className={`${c.align === 'right' ? 'right num' : ''} ${c.nowrap ? 'nowrap' : ''}`}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer && <tfoot>{footer}</tfoot>}
      </table>
    </div>
  )
}
