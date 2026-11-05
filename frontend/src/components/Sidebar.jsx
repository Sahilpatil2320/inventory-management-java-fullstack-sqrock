import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Package, Tags, Truck, ArrowDownToLine, ArrowUpFromLine, History, Boxes, FileBarChart, Users, Warehouse } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const GROUPS = [
  { title: 'Overview', items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
  {
    title: 'Catalog',
    items: [
      { to: '/products', label: 'Products', icon: Package },
      { to: '/categories', label: 'Categories', icon: Tags },
      { to: '/suppliers', label: 'Suppliers', icon: Truck },
    ],
  },
  {
    title: 'Stock',
    items: [
      { to: '/stock-in', label: 'Stock in', icon: ArrowDownToLine },
      { to: '/stock-out', label: 'Stock out', icon: ArrowUpFromLine },
      { to: '/inventory', label: 'Inventory tracking', icon: Boxes },
      { to: '/transactions', label: 'Transaction history', icon: History },
    ],
  },
  {
    title: 'Insights',
    items: [{ to: '/reports', label: 'Reports', icon: FileBarChart }],
  },
  { title: 'Administration', adminOnly: true, items: [{ to: '/users', label: 'Users', icon: Users }] },
]

export default function Sidebar({ open, onNavigate }) {
  const { isAdmin } = useAuth()
  return (
    <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Main navigation">
      <div className="sidebar-brand">
        <span className="logo"><Warehouse size={18} /></span>
        Inventory
      </div>
      <nav className="sidebar-nav">
        {GROUPS.filter((g) => !g.adminOnly || isAdmin).map((g) => (
          <div key={g.title}>
            <div className="nav-group">{g.title}</div>
            {g.items.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onNavigate}>
                <Icon size={18} aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-foot">Inventory Management System</div>
    </aside>
  )
}
