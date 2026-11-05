import api from './api'

/** Drops empty filter values so they are not sent as "?search=&categoryId=". */
export const clean = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined))

const data = (promise) => promise.then((r) => r.data)

export const authApi = {
  login: (email, password) => data(api.post('/auth/login', { email, password })),
  me: () => data(api.get('/auth/me')),
  changePassword: (payload) => data(api.post('/auth/change-password', payload)),
}

export const productsApi = {
  list: (params) => data(api.get('/products', { params: clean(params) })),
  get: (id) => data(api.get(`/products/${id}`)),
  create: (payload) => data(api.post('/products', payload)),
  update: (id, payload) => data(api.put(`/products/${id}`, payload)),
  remove: (id) => data(api.delete(`/products/${id}`)),
}

export const categoriesApi = {
  list: (search) => data(api.get('/categories', { params: clean({ search }) })),
  create: (payload) => data(api.post('/categories', payload)),
  update: (id, payload) => data(api.put(`/categories/${id}`, payload)),
  remove: (id) => data(api.delete(`/categories/${id}`)),
}

export const suppliersApi = {
  list: (search) => data(api.get('/suppliers', { params: clean({ search }) })),
  get: (id) => data(api.get(`/suppliers/${id}`)),
  create: (payload) => data(api.post('/suppliers', payload)),
  update: (id, payload) => data(api.put(`/suppliers/${id}`, payload)),
  remove: (id) => data(api.delete(`/suppliers/${id}`)),
}

export const stockApi = {
  stockIn: (payload) => data(api.post('/stock/in', payload)),
  stockOut: (payload) => data(api.post('/stock/out', payload)),
  transactions: (params) => data(api.get('/stock/transactions', { params: clean(params) })),
}

export const dashboardApi = {
  summary: () => data(api.get('/dashboard/summary')),
  lowStock: (limit = 8) => data(api.get('/dashboard/low-stock', { params: { limit } })),
  recentTransactions: (limit = 8) => data(api.get('/dashboard/recent-transactions', { params: { limit } })),
}

export const reportsApi = {
  inventory: (params) => data(api.get('/reports/inventory', { params: clean(params) })),
  stockMovements: (params) => data(api.get('/reports/stock-movements', { params: clean(params) })),
  valuation: (params) => data(api.get('/reports/valuation', { params: clean(params) })),
  suppliers: () => data(api.get('/reports/suppliers')),
}

export const usersApi = {
  list: () => data(api.get('/users')),
  create: (payload) => data(api.post('/users', payload)),
  update: (id, payload) => data(api.put(`/users/${id}`, payload)),
  remove: (id) => data(api.delete(`/users/${id}`)),
}
