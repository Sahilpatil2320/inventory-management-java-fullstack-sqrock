/**
 * CSV export. Cells that start with = + - @ are prefixed with an apostrophe so spreadsheet
 * programs cannot run them as formulas (CSV injection).
 */
export function escapeCsvCell(value) {
  if (value === null || value === undefined) return ''
  let text = String(value)
  if (/^[=+\-@\t\r]/.test(text) && Number.isNaN(Number(text))) text = "'" + text
  return /[",\n\r]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text
}

/** columns: [{ header, csv: (row) => value }] */
export function buildCsv(columns, rows) {
  const lines = [columns.map((c) => escapeCsvCell(c.header)).join(',')]
  rows.forEach((row) => lines.push(columns.map((c) => escapeCsvCell(c.csv(row))).join(',')))
  return lines.join('\r\n')
}

export function downloadCsv(filename, columns, rows) {
  const blob = new Blob(['\uFEFF' + buildCsv(columns, rows)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
