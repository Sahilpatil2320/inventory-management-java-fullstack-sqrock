export default function Loading({ label = 'Loading…' }) {
  return (
    <div className="state" role="status">
      <div className="spinner" />
      <span>{label}</span>
    </div>
  )
}
