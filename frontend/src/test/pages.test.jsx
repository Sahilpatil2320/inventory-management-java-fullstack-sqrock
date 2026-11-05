import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

// ---- mocks: the real pages run, only the network layer and the auth/toast hooks are replaced ----
const api = vi.hoisted(() => ({
  authApi: { login: vi.fn(), me: vi.fn(), changePassword: vi.fn() },
  productsApi: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  categoriesApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  suppliersApi: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  stockApi: { stockIn: vi.fn(), stockOut: vi.fn(), transactions: vi.fn() },
  dashboardApi: { summary: vi.fn(), lowStock: vi.fn(), recentTransactions: vi.fn() },
  reportsApi: { inventory: vi.fn(), stockMovements: vi.fn(), valuation: vi.fn(), suppliers: vi.fn() },
  usersApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}))
vi.mock('../services/endpoints', async (orig) => ({ ...(await orig()), ...api }))

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('../hooks/useToast', () => ({ useToast: () => toast, ToastProvider: ({ children }) => children }))

let auth = {}
vi.mock('../hooks/useAuth', () => ({ useAuth: () => auth }))

import Login from '../pages/Login'
import Dashboard from '../pages/Dashboard'
import Products from '../pages/Products'
import StockOut from '../pages/StockOut'
import StockIn from '../pages/StockIn'
import Reports from '../pages/Reports'
import Categories from '../pages/Categories'
import Users from '../pages/Users'

const admin = { id: 1, name: 'Ada Admin', email: 'a@x.com', role: 'ADMIN' }
const staff = { id: 2, name: 'Sam Staff', email: 's@x.com', role: 'STAFF' }
const mouse = { id: 7, name: 'Wireless Mouse', sku: 'ELEC-001', categoryId: 1, categoryName: 'Electronics', supplierId: 1, supplierName: 'TechNova', purchasePrice: 450, sellingPrice: 699, quantity: 8, minimumStockLevel: 20, stockStatus: 'LOW_STOCK', stockValue: 3600, active: true }
const page = (content) => ({ content, page: 0, size: 10, totalElements: content.length, totalPages: content.length ? 1 : 0 })
const view = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>)

beforeEach(() => {
  vi.clearAllMocks()
  auth = { user: admin, isAuthenticated: false, isAdmin: true, login: vi.fn(), logout: vi.fn(), loading: false }
  api.categoriesApi.list.mockResolvedValue([{ id: 1, name: 'Electronics', description: 'Gadgets', productCount: 3, createdAt: '2026-01-01T00:00:00' }])
  api.suppliersApi.list.mockResolvedValue([{ id: 1, supplierName: 'Rohan', companyName: 'TechNova', email: 't@x.com', phone: '+91 98765 43210', productCount: 2, createdAt: '2026-01-01T00:00:00' }])
  api.productsApi.list.mockResolvedValue(page([mouse]))
})

describe('Login', () => {
  it('validates before calling the API', async () => {
    view(<Login />)
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(screen.getByText('Enter your email address')).toBeInTheDocument()
    expect(screen.getByText('Enter your password')).toBeInTheDocument()
    expect(auth.login).not.toHaveBeenCalled()
  })
  it('submits credentials and shows the server error when sign-in fails', async () => {
    auth.login.mockRejectedValue({ response: { status: 401, data: { message: 'Invalid email or password' } } })
    view(<Login />)
    await userEvent.type(screen.getByLabelText(/Email/), 'a@x.com')
    await userEvent.type(screen.getByLabelText(/Password/), 'wrong-pass')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(auth.login).toHaveBeenCalledWith('a@x.com', 'wrong-pass')
    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument()
  })
})

describe('Dashboard', () => {
  it('shows exactly the numbers returned by the API', async () => {
    api.dashboardApi.summary.mockResolvedValue({
      totalProducts: 20, totalCategories: 6, totalSuppliers: 6, totalStockQuantity: 1026, totalInventoryValue: 566900,
      lowStockProducts: 5, outOfStockProducts: 2, inStockProducts: 13,
      categoryDistribution: [{ category: 'Electronics', products: 5 }],
      stockMovement: [{ date: '2026-10-30', stockIn: 10, stockOut: 4 }],
    })
    api.dashboardApi.lowStock.mockResolvedValue([mouse])
    api.dashboardApi.recentTransactions.mockResolvedValue([{ id: 1, productName: 'Wireless Mouse', productSku: 'ELEC-001', transactionType: 'STOCK_OUT', quantity: 4, newQuantity: 8, userName: 'Sam Staff', transactionDate: '2026-10-30T10:00:00' }])
    view(<Dashboard />)
    expect(await screen.findByText('1,026')).toBeInTheDocument()
    expect(screen.getByText(/5,66,900/)).toBeInTheDocument()
    expect(screen.getByText('Low stock alerts')).toBeInTheDocument()
    expect(screen.getAllByText('Wireless Mouse').length).toBeGreaterThan(0)
    expect(api.dashboardApi.summary).toHaveBeenCalledTimes(1)
  })
  it('shows an error state with a retry when the API fails', async () => {
    api.dashboardApi.summary.mockRejectedValue({ response: { status: 500, data: { message: 'Something went wrong on the server' } } })
    api.dashboardApi.lowStock.mockResolvedValue([])
    api.dashboardApi.recentTransactions.mockResolvedValue([])
    view(<Dashboard />)
    expect(await screen.findByText('Something went wrong on the server')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})

describe('Products', () => {
  it('lists products, and sends search and filters to the API', async () => {
    view(<Products />)
    expect(await screen.findByText('Wireless Mouse')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Search products'), 'mouse')
    await waitFor(() => expect(api.productsApi.list).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'mouse', page: 0 })))
    await userEvent.selectOptions(screen.getByLabelText('Stock status'), 'LOW_STOCK')
    await waitFor(() => expect(api.productsApi.list).toHaveBeenLastCalledWith(expect.objectContaining({ stockStatus: 'LOW_STOCK' })))
  })
  it('sorts when a column header is clicked', async () => {
    view(<Products />)
    await screen.findByText('Wireless Mouse')
    await userEvent.click(screen.getByRole('button', { name: /Stock/ }))
    await waitFor(() => expect(api.productsApi.list).toHaveBeenLastCalledWith(expect.objectContaining({ sortBy: 'quantity', direction: 'asc' })))
  })
  it('offers add/edit/delete to admins but not to staff', async () => {
    const { unmount } = view(<Products />)
    expect(await screen.findByRole('button', { name: /Add product/ })).toBeInTheDocument()
    expect(screen.getByLabelText('Delete Wireless Mouse')).toBeInTheDocument()
    unmount()
    auth = { ...auth, user: staff, isAdmin: false }
    view(<Products />)
    await screen.findByText('Wireless Mouse')
    expect(screen.queryByRole('button', { name: /Add product/ })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Delete Wireless Mouse')).not.toBeInTheDocument()
  })
  it('asks for confirmation before deleting, then calls the API', async () => {
    api.productsApi.remove.mockResolvedValue({ message: 'Product deleted' })
    view(<Products />)
    await userEvent.click(await screen.findByLabelText('Delete Wireless Mouse'))
    const dialog = screen.getByRole('dialog')
    expect(api.productsApi.remove).not.toHaveBeenCalled()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete product' }))
    await waitFor(() => expect(api.productsApi.remove).toHaveBeenCalledWith(7))
    expect(toast.success).toHaveBeenCalledWith('Product deleted')
  })
  it('shows an empty state when nothing matches', async () => {
    api.productsApi.list.mockResolvedValue(page([]))
    view(<Products />)
    expect(await screen.findByText('No products yet')).toBeInTheDocument()
  })
})

describe('Stock out', () => {
  async function fill(qty) {
    view(<StockOut />)
    await screen.findByRole('option', { name: /Wireless Mouse/ })
    await userEvent.selectOptions(screen.getByLabelText(/Product/), '7')
    await userEvent.type(screen.getByLabelText(/Quantity issued/), String(qty))
  }
  it('blocks issuing more than is available, without calling the API', async () => {
    await fill(9)                       // only 8 available
    await userEvent.click(screen.getByRole('button', { name: 'Record stock out' }))
    expect(await screen.findByText('Only 8 available')).toBeInTheDocument()
    expect(api.stockApi.stockOut).not.toHaveBeenCalled()
  })
  it('submits a valid request once, with an idempotency key, and refreshes the stock', async () => {
    api.stockApi.stockOut.mockResolvedValue({ productName: 'Wireless Mouse', newQuantity: 5 })
    await fill(3)
    const button = screen.getByRole('button', { name: 'Record stock out' })
    await userEvent.dblClick(button)    // a double click must not create two transactions
    await waitFor(() => expect(api.stockApi.stockOut).toHaveBeenCalledTimes(1))
    const payload = api.stockApi.stockOut.mock.calls[0][0]
    expect(payload).toMatchObject({ productId: 7, quantity: 3, reason: 'SALE' })
    expect(payload.requestId).toBeTruthy()
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('now 5'))
    expect(api.productsApi.list.mock.calls.length).toBeGreaterThan(1)   // list reloaded
  })
  it('shows the server message when the backend rejects the request', async () => {
    api.stockApi.stockOut.mockRejectedValue({ response: { status: 409, data: { message: 'Insufficient stock for "Wireless Mouse": 2 available, 3 requested' } } })
    await fill(3)
    await userEvent.click(screen.getByRole('button', { name: 'Record stock out' }))
    expect(await screen.findAllByText(/Insufficient stock/)).not.toHaveLength(0)
    expect(toast.error).toHaveBeenCalled()
  })
})

describe('Stock in', () => {
  it('pre-fills supplier and price from the product and posts the receipt', async () => {
    api.stockApi.stockIn.mockResolvedValue({ productName: 'Wireless Mouse', newQuantity: 28 })
    view(<StockIn />)
    await screen.findByRole('option', { name: /Wireless Mouse/ })
    await userEvent.selectOptions(screen.getByLabelText(/Product/), '7')
    await waitFor(() => expect(screen.getByLabelText(/Purchase price/)).toHaveValue(450))
    await userEvent.type(screen.getByLabelText(/Quantity received/), '20')
    await userEvent.click(screen.getByRole('button', { name: 'Record stock in' }))
    await waitFor(() => expect(api.stockApi.stockIn).toHaveBeenCalledWith(expect.objectContaining({ productId: 7, quantity: 20, supplierId: 1, purchasePrice: 450 })))
  })
})

describe('Reports', () => {
  it('shows all nine reports to an administrator', async () => {
    api.reportsApi.inventory.mockResolvedValue([mouse])
    view(<Reports />)
    expect(await screen.findAllByRole('tab')).toHaveLength(9)
    expect(screen.getByRole('tab', { name: 'Inventory valuation report' })).toBeInTheDocument()
  })
  it('hides the financial reports from staff', async () => {
    auth = { ...auth, user: staff, isAdmin: false }
    api.reportsApi.inventory.mockResolvedValue([mouse])
    view(<Reports />)
    expect(await screen.findAllByRole('tab')).toHaveLength(7)
    expect(screen.queryByRole('tab', { name: 'Supplier report' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Inventory valuation report' })).not.toBeInTheDocument()
  })
  it('loads the low-stock report with the LOW_STOCK filter and enables CSV export', async () => {
    api.reportsApi.inventory.mockResolvedValue([mouse])
    view(<Reports />)
    await userEvent.click(await screen.findByRole('tab', { name: 'Low stock report' }))
    await waitFor(() => expect(api.reportsApi.inventory).toHaveBeenLastCalledWith(expect.objectContaining({ stockStatus: 'LOW_STOCK' })))
    expect(await screen.findByText('ELEC-001')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Export CSV/ })).toBeEnabled()
  })
  it('shows valuation totals from the API', async () => {
    api.reportsApi.inventory.mockResolvedValue([])
    api.reportsApi.valuation.mockResolvedValue({ rows: [{ productId: 1, name: 'Mouse', sku: 'E-1', categoryName: 'E', quantity: 2, purchasePrice: 10, sellingPrice: 20, costValue: 20, retailValue: 40, potentialProfit: 20 }], totalQuantity: 2, totalCostValue: 20, totalRetailValue: 40, totalPotentialProfit: 20 })
    view(<Reports />)
    await userEvent.click(await screen.findByRole('tab', { name: 'Inventory valuation report' }))
    expect(await screen.findByText('Totals')).toBeInTheDocument()
  })
})

describe('Categories and Users', () => {
  it('shows category product counts and validates the add form', async () => {
    view(<Categories />)
    expect(await screen.findByText('Electronics')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Add category/ }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Add category' }))
    expect(screen.getByText('Category name is required')).toBeInTheDocument()
    expect(api.categoriesApi.create).not.toHaveBeenCalled()
  })
  it('surfaces the server rule when a category in use cannot be deleted', async () => {
    api.categoriesApi.remove.mockRejectedValue({ response: { status: 409, data: { message: 'Cannot delete "Electronics": 3 product(s) still use it. Reassign those products to another category first' } } })
    view(<Categories />)
    await userEvent.click(await screen.findByLabelText('Delete Electronics'))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete category' }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Reassign')))
  })
  it('creates a user through the API', async () => {
    api.usersApi.list.mockResolvedValue([{ id: 1, name: 'Ada Admin', email: 'a@x.com', role: 'ADMIN', active: true, createdAt: '2026-01-01T00:00:00' }])
    api.usersApi.create.mockResolvedValue({ id: 3 })
    view(<Users />)
    await userEvent.click(await screen.findByRole('button', { name: /Add user/ }))
    await userEvent.type(screen.getByLabelText(/Full name/), 'New Person')
    await userEvent.type(screen.getByLabelText(/^Email/), 'new@x.com')
    await userEvent.type(screen.getByLabelText(/^Password/), 'longenough1')
    await userEvent.click(screen.getByRole('button', { name: 'Create user' }))
    await waitFor(() => expect(api.usersApi.create).toHaveBeenCalledWith({ name: 'New Person', email: 'new@x.com', password: 'longenough1', role: 'STAFF' }))
  })
})
