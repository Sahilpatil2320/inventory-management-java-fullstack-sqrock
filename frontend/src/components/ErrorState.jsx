import { AlertTriangle } from 'lucide-react'
import { getErrorMessage } from '../utils/errors'

export default function ErrorState({ error, onRetry, title = 'Could not load data' }) {
  return (
    <div className="state error" role="alert">
      <AlertTriangle size={36} />
      <h3>{title}</h3>
      <p>{getErrorMessage(error)}</p>
      {onRetry && (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}
