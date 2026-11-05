/** Filter dropdown: [{ value, label }] with a leading "all" option. */
import FormField from './FormField'

export default function Select({ label, value, onChange, options, allLabel = 'All', error, required, includeAll = true }) {
  return (
    <FormField label={label} error={error} required={required}>
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        {includeAll && <option value="">{allLabel}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </FormField>
  )
}
