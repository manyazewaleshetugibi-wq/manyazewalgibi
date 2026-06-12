// services/expense.service.ts

const API_BASE_URL = "/api"

// Casual Expenses API
export const casualApi = {
  getCosts: () => fetch(`${API_BASE_URL}/expense`).then(res => res.json()).then(data => data.data || []),
  addCost: (cost: any) => fetch(`${API_BASE_URL}/expense`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cost),
  }).then(res => res.json()),
  updateCost: (id: string, cost: any) => fetch(`${API_BASE_URL}/expense/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cost),
  }).then(res => res.json()),
  deleteCost: (id: string) => fetch(`${API_BASE_URL}/expense/${id}`, {
    method: "DELETE",
  }).then(res => res.json()),
}

// Common Expenses API
export const commonApi = {
  getExpenses: () => fetch(`${API_BASE_URL}/common-expense`).then(res => res.json()).then(data => data.data || []),
}

// Stock API
export const stockApi = {
  getStockItems: () => fetch(`${API_BASE_URL}/stock`).then(res => res.json()).then(data => data.data || []),
  getStockPurchases: () => fetch(`${API_BASE_URL}/stock-purchase`).then(res => res.json()).then(data => {
    const purchases = data.purchases || data.data || []
    return purchases
  }),
}

// Sales API for revenue
export const salesApi = {
  getOrderReport: () => fetch(`${API_BASE_URL}/order/report`).then(res => res.json()),
}