/** Client-side validation mirrors the server rules so mistakes are caught before the request. */
export function validateProduct(v, { isEdit }) {
  const e = {}
  if (!v.name.trim()) e.name = 'Product name is required'
  if (!v.sku.trim()) e.sku = 'SKU is required'
  else if (!/^[A-Za-z0-9._/-]+$/.test(v.sku.trim())) e.sku = 'Use letters, digits and . _ - / only'
  if (!v.categoryId) e.categoryId = 'Select a category'
  if (v.purchasePrice === '' || Number(v.purchasePrice) < 0 || Number.isNaN(Number(v.purchasePrice))) e.purchasePrice = 'Enter a price of 0 or more'
  if (v.sellingPrice === '' || Number(v.sellingPrice) < 0 || Number.isNaN(Number(v.sellingPrice))) e.sellingPrice = 'Enter a price of 0 or more'
  if (!isEdit && v.quantity !== '' && (!Number.isInteger(Number(v.quantity)) || Number(v.quantity) < 0)) e.quantity = 'Quantity must be a whole number, 0 or more'
  if (v.minimumStockLevel === '' || !Number.isInteger(Number(v.minimumStockLevel)) || Number(v.minimumStockLevel) < 0) e.minimumStockLevel = 'Enter a whole number, 0 or more'
  return e
}

export function validateSupplier(v) {
  const e = {}
  if (!v.supplierName.trim()) e.supplierName = 'Contact name is required'
  if (!v.companyName.trim()) e.companyName = 'Company name is required'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = 'Enter a valid email address'
  if (!/^\+?[0-9][0-9 ()-]{5,22}[0-9]$/.test(v.phone.trim())) e.phone = 'Enter a valid phone number, e.g. +91 98765 43210'
  return e
}

export function validateQuantity(value) {
  if (value === '' || !Number.isInteger(Number(value)) || Number(value) < 1) return 'Enter a whole number of at least 1'
  return null
}
