export default function StatCard({ label, value, icon: Icon, tone }) {
  return (
    <div className={`card stat ${tone ? `tone-${tone}` : ''}`}>
      <div className="stat-label">
        {Icon && <Icon size={16} aria-hidden="true" />}
        {label}
      </div>
      <div className="stat-value">{value}</div>
    </div>
  )
}
