import { Search } from 'lucide-react'

export default function SearchBar({ value, onChange, placeholder = 'Search…', label = 'Search' }) {
  return (
    <div className="field search">
      <label className="sr-only" htmlFor="search-input">{label}</label>
      <div className="search-box">
        <Search size={16} aria-hidden="true" />
        <input
          id="search-input"
          className="input"
          type="search"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  )
}
