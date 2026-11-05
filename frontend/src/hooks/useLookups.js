import { categoriesApi, suppliersApi } from '../services/endpoints'
import { useAsync } from './useAsync'

/** Categories and suppliers as dropdown options (loaded once per page). */
export function useLookups() {
  const { data, loading, error, reload } = useAsync(
    () => Promise.all([categoriesApi.list(), suppliersApi.list()]),
    [],
  )
  const [categories, suppliers] = data || [[], []]
  return {
    categories,
    suppliers,
    categoryOptions: categories.map((c) => ({ value: String(c.id), label: c.name })),
    supplierOptions: suppliers.map((s) => ({ value: String(s.id), label: s.companyName })),
    loading,
    error,
    reload,
  }
}
