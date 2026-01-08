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
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    if (retries > 0) {
      console.log(`Retrying fetch to ${url}. Attempts left: ${retries - 1}`)
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
      return fetchWithRetry(url, options, retries - 1)
    }
    console.error(`Failed to fetch ${url}:`, error)
    toast.error(`Failed to fetch data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    throw error
  }
}

export const api = {
  fetchItemCategories: () => fetchWithRetry(`${API_BASE_URL}/item-category`),
  
  fetchStocks: () => fetchWithRetry(`${API_BASE_URL}/stock`),
  
  fetchMenuItems: () => fetchWithRetry(`${API_BASE_URL}/items`),
  
  // Updated to use FormData for image uploads
  createMenuItem: (formData: FormData) =>
    fetchWithRetry(`${API_BASE_URL}/items`, {
      method: "POST",
      body: formData,
      // Note: Do NOT set Content-Type header for FormData - browser sets it automatically
    }),
  
  // Updated to use FormData for image uploads
  updateMenuItem: (id: string, formData: FormData) =>
    fetchWithRetry(`${API_BASE_URL}/items?id=${id}`, {
      method: "PUT",
      body: formData,
      // Note: Do NOT set Content-Type header for FormData - browser sets it automatically
    }),
  
  deleteMenuItem: (id: string) => 
    fetchWithRetry(`${API_BASE_URL}/items?id=${id}`, { 
      method: "DELETE" 
    }),
}