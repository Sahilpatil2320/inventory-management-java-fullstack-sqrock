import { describe, expect, it } from 'vitest'
import { buildCsv, escapeCsvCell } from '../utils/csv'
import { formatCurrency, formatNumber, formatDate } from '../utils/format'
import { validateProduct, validateQuantity, validateSupplier } from '../utils/validators'
import { getErrorMessage, getFieldErrors } from '../utils/errors'
import { clean } from '../services/endpoints'
import { summarizeByCategory } from '../pages/Reports'

describe('csv export', () => {
  it('quotes commas, quotes and line breaks', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"')
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""')
    expect(escapeCsvCell('two\nlines')).toBe('"two\nlines"')
  })
  it('neutralises spreadsheet formulas (CSV injection) but keeps negative numbers', () => {
    expect(escapeCsvCell('=HYPERLINK("x")')).toMatch(/^"?'=/)
    expect(escapeCsvCell('@SUM(A1)')).toBe("'@SUM(A1)")
    expect(escapeCsvCell(-5)).toBe('-5')
  })
  it('builds a header row and data rows', () => {
    const csv = buildCsv([{ header: 'SKU', csv: (r) => r.sku }, { header: 'Qty', csv: (r) => r.qty }], [{ sku: 'A-1', qty: 3 }])
    expect(csv).toBe('SKU,Qty\r\nA-1,3')
  })
})

describe('formatting', () => {
  it('formats rupees and numbers in the Indian system', () => {
    expect(formatCurrency(566900)).toContain('5,66,900')
    expect(formatNumber(1026)).toBe('1,026')
    expect(formatCurrency(null)).toBe('-')
    expect(formatDate('not a date')).toBe('-')
  })
})

describe('validation', () => {
  const ok = { name: 'Mouse', sku: 'EL-1', categoryId: '1', purchasePrice: '10', sellingPrice: '20', quantity: '5', minimumStockLevel: '2' }
  it('accepts a valid product', () => expect(validateProduct(ok, { isEdit: false })).toEqual({}))
  it('rejects missing name, bad SKU, negative prices and quantities', () => {
    const e = validateProduct({ ...ok, name: ' ', sku: 'bad sku!', purchasePrice: '-1', sellingPrice: '-2', quantity: '-3', minimumStockLevel: '-1' }, { isEdit: false })
    expect(Object.keys(e).sort()).toEqual(['minimumStockLevel', 'name', 'purchasePrice', 'quantity', 'sellingPrice', 'sku'])
  })
  it('requires a category', () => expect(validateProduct({ ...ok, categoryId: '' }, { isEdit: false }).categoryId).toBeTruthy())
  it('ignores quantity when editing', () => expect(validateProduct({ ...ok, quantity: '-9' }, { isEdit: true }).quantity).toBeUndefined())
  it('validates supplier email and phone', () => {
    const e = validateSupplier({ supplierName: 'A', companyName: 'B', email: 'nope', phone: 'abc' })
    expect(e.email).toBeTruthy(); expect(e.phone).toBeTruthy()
    expect(validateSupplier({ supplierName: 'A', companyName: 'B', email: 'a@b.co', phone: '+91 98765 43210' })).toEqual({})
  })
  it('requires a whole quantity of at least 1', () => {
    expect(validateQuantity('')).toBeTruthy(); expect(validateQuantity('0')).toBeTruthy()
    expect(validateQuantity('1.5')).toBeTruthy(); expect(validateQuantity('3')).toBeNull()
  })
})

describe('helpers', () => {
  it('extracts server messages and field errors', () => {
    const err = { response: { status: 400, data: { message: 'Bad', fieldErrors: { sku: 'dup' } } } }
    expect(getErrorMessage(err)).toBe('Bad'); expect(getFieldErrors(err)).toEqual({ sku: 'dup' })
    expect(getErrorMessage({ request: {} })).toMatch(/Cannot reach the server/)
  })
  it('drops empty filter params', () => expect(clean({ a: '', b: 'x', c: null, d: 0 })).toEqual({ b: 'x', d: 0 }))
  it('summarises inventory per category', () => {
    const rows = summarizeByCategory([
      { categoryName: 'A', quantity: 5, stockValue: 50, stockStatus: 'IN_STOCK' },
      { categoryName: 'A', quantity: 0, stockValue: 0, stockStatus: 'OUT_OF_STOCK' },
      { categoryName: null, quantity: 2, stockValue: 20, stockStatus: 'LOW_STOCK' },
    ])
    expect(rows.find((r) => r.category === 'A')).toMatchObject({ products: 2, units: 5, value: 50, out: 1 })
    expect(rows.find((r) => r.category === 'Uncategorised')).toMatchObject({ low: 1 })
  })
})
