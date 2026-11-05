import { Navigate, useLocation } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import Loading from './Loading'

/** Redirects to /login when signed out. With `adminOnly`, STAFF users see an access-denied page. */
export default function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, isAdmin, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="fullpage"><Loading label="Checking your session…" /></div>
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (adminOnly && !isAdmin) {
    return (
      <div className="state card" role="alert">
        <ShieldOff size={36} />
        <h3>Administrator access required</h3>
        <p>Your account does not have permission to open this page.</p>
      </div>
    )
  }
  return children
}
