import { STATUS_LABEL, STATUS_TONE } from '../utils/format'

export default function StatusBadge({ status }) {
  return <span className={`badge badge-${STATUS_TONE[status] || 'neutral'}`}>{STATUS_LABEL[status] || status}</span>
}
