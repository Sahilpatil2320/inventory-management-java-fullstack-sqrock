import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import StockGauge from '../components/StockGauge'
import StatusBadge from '../components/StatusBadge'
import Pagination from '../components/Pagination'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import ProtectedRoute from '../components/ProtectedRoute'

let auth = {}
vi.mock('../hooks/useAuth', () => ({ useAuth: () => auth }))

describe('StatusBadge / StockGauge', () => {
  it('labels each stock status', () => {
    render(<><StatusBadge status="IN_STOCK" /><StatusBadge status="LOW_STOCK" /><StatusBadge status="OUT_OF_STOCK" /></>)
    expect(screen.getByText('In stock')).toBeInTheDocument()
    expect(screen.getByText('Low stock')).toBeInTheDocument()
    expect(screen.getByText('Out of stock')).toBeInTheDocument()
  })
  it('shows quantity against the minimum', () => {
    render(<StockGauge quantity={6} minimum={10} status="LOW_STOCK" />)
    expect(screen.getByText(/min 10/)).toBeInTheDocument()
  })
})

describe('Pagination', () => {
  it('navigates pages and disables the edges', async () => {
    const onPageChange = vi.fn()
    const { rerender } = render(<Pagination page={0} size={10} totalElements={25} totalPages={3} onPageChange={onPageChange} />)
    expect(screen.getByText('Showing 1–10 of 25')).toBeInTheDocument()
    expect(screen.getByLabelText('Previous page')).toBeDisabled()
    await userEvent.click(screen.getByLabelText('Next page'))
    expect(onPageChange).toHaveBeenCalledWith(1)
    rerender(<Pagination page={2} size={10} totalElements={25} totalPages={3} onPageChange={onPageChange} />)
    expect(screen.getByLabelText('Next page')).toBeDisabled()
  })
  it('renders nothing when there are no rows', () => {
    const { container } = render(<Pagination page={0} size={10} totalElements={0} totalPages={0} onPageChange={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('DataTable', () => {
  it('renders rows and reports sort clicks', async () => {
    const onSort = vi.fn()
    render(<DataTable columns={[{ key: 'name', header: 'Name', sortKey: 'name' }]} rows={[{ id: 1, name: 'Mouse' }]} sort={{ field: 'name', direction: 'asc' }} onSort={onSort} />)
    expect(screen.getByText('Mouse')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute('aria-sort', 'ascending')
    await userEvent.click(screen.getByRole('button', { name: /Name/ }))
    expect(onSort).toHaveBeenCalledWith('name')
  })
})

describe('Modal', () => {
  it('closes with Escape and has dialog semantics', async () => {
    const onClose = vi.fn()
    render(<Modal title="Confirm" onClose={onClose}><p>Body</p></Modal>)
    expect(screen.getByRole('dialog', { name: 'Confirm' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})

describe('ProtectedRoute', () => {
  const renderAt = (adminOnly) => render(
    <MemoryRouter initialEntries={['/secret']}>
      <Routes>
        <Route path="/login" element={<p>Login page</p>} />
        <Route path="/secret" element={<ProtectedRoute adminOnly={adminOnly}><p>Secret content</p></ProtectedRoute>} />
      </Routes>
    </MemoryRouter>)

  it('redirects signed-out visitors to the login page', () => {
    auth = { isAuthenticated: false, isAdmin: false, loading: false }
    renderAt(false)
    expect(screen.getByText('Login page')).toBeInTheDocument()
  })
  it('lets signed-in users in', () => {
    auth = { isAuthenticated: true, isAdmin: false, loading: false }
    renderAt(false)
    expect(screen.getByText('Secret content')).toBeInTheDocument()
  })
  it('blocks STAFF from admin-only pages and allows ADMIN', () => {
    auth = { isAuthenticated: true, isAdmin: false, loading: false }
    const first = renderAt(true)
    expect(screen.getByText('Administrator access required')).toBeInTheDocument()
    first.unmount()
    auth = { isAuthenticated: true, isAdmin: true, loading: false }
    renderAt(true)
    expect(screen.getByText('Secret content')).toBeInTheDocument()
  })
  it('waits while the session is being restored', () => {
    auth = { isAuthenticated: false, isAdmin: false, loading: true }
    renderAt(false)
    expect(screen.getByText('Checking your session…')).toBeInTheDocument()
  })
})
