import { Children, cloneElement, useId } from 'react'

/** Label + control + error/hint. The single child gets the id and aria attributes automatically. */
export default function FormField({ label, error, hint, required, className = '', children }) {
  const id = useId()
  const child = Children.only(children)
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined
  return (
    <div className={`field ${className}`}>
      <label htmlFor={id}>
        {label}
        {required && <span className="req" aria-hidden="true"> *</span>}
      </label>
      {cloneElement(child, { id, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': describedBy })}
      {error ? <span id={`${id}-err`} className="error-text" role="alert">{error}</span> : hint ? <span id={`${id}-hint`} className="hint">{hint}</span> : null}
    </div>
  )
}
