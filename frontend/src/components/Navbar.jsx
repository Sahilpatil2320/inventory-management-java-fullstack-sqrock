import { Link, useLocation } from 'react-router-dom'
import { LogOut, Menu } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const TITLES = {
  '/': 'Dashboard', '/products': 'Products', '/categories': 'Categories', '/suppliers': 'Suppliers',
  '/stock-in': 'Stock in', '/stock-out': 'Stock out', '/inventory': 'Inventory tracking',
  '/transactions': 'Transaction history', '/reports': 'Reports', '/users': 'Users', '/profile': 'Profile',
}

export default function Navbar({ onMenu }) {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const title = TITLES[pathname] || (pathname.startsWith('/products') ? 'Products' : '')
  const initials = (user?.name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

  return (
    <header className="topbar">
      <button type="button" className="menu-btn" onClick={onMenu} aria-label="Open navigation menu">
        <Menu size={22} />
      </button>
      <span className="topbar-title">{title}</span>
      <span className="spacer" />
      <Link to="/profile" className="user-chip" aria-label="Open your profile">
        <span className="user-meta">
          <strong>{user?.name}</strong>
          <br />
          <small>{user?.role === 'ADMIN' ? 'Administrator' : 'Staff'}</small>
        </span>
        <span className="avatar" aria-hidden="true">{initials}</span>
      </Link>
      <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
        <LogOut size={16} aria-hidden="true" /> Sign out
      </button>
    </header>
  )
}
