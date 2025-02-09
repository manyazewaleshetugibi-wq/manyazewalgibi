import { toast } from "react-hot-toast"

interface MenuItem {
  id?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
}

const API_BASE_URL = "/api"

const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second

async function fetchWithRetry(url: string, options?: RequestInit, retries = MAX_RETRIES): Promise<any> {
  try {
    const response = await fetch(url, options)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    if (retries > 0) {
      console.log(`Retrying fetch to ${url}. Attempts left: ${retries - 1}`)
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
      return fetchWithRetry(url, options, retries - 1)
    }
    throw error
  }
}

export const api = {
  fetchItemCategories: () => fetchWithRetry(`${API_BASE_URL}/item-category`),
  fetchStocks: () => fetchWithRetry(`${API_BASE_URL}/stock`),
  fetchMenuItems: () => fetchWithRetry(`${API_BASE_URL}/items`),
  createMenuItem: (item: MenuItem) =>
    fetchWithRetry(`${API_BASE_URL}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    }),
  updateMenuItem: (id: string, item: MenuItem) =>
    fetchWithRetry(`${API_BASE_URL}/items/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    }),
  deleteMenuItem: (id: string) => fetchWithRetry(`${API_BASE_URL}/items/${id}`, { method: "DELETE" }),
}
