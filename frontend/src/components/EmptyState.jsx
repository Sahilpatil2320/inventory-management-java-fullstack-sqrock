import { Inbox } from 'lucide-react'

export default function EmptyState({ title = 'Nothing here yet', message, action }) {
  return (
    <div className="state">
      <Inbox size={36} />
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action}
    </div>
  )
}
