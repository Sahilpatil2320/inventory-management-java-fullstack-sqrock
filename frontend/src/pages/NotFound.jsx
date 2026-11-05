import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="card state">
      <Compass size={36} />
      <h3>Page not found</h3>
      <p>The page you are looking for does not exist or has moved.</p>
      <Link className="btn btn-primary" to="/">Back to dashboard</Link>
    </div>
  )
}
