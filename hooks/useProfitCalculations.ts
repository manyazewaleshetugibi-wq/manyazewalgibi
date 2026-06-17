// hooks/useProfitCalculations.ts
import { useMemo, useState, useEffect, useCallback } from 'react'
import { ProfitService, ProfitFilters, ProfitDataResult, DailySoldItem } from '@/services/profit.service'

export interface UseProfitCalculationsReturn {
  data: ProfitDataResult | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  setFilters: (filters: ProfitFilters) => void
  filters: ProfitFilters
  items: DailySoldItem[]
  summary: ProfitDataResult['summary'] | null
  totals: ProfitDataResult['totals'] | null
  chartData: ProfitDataResult['chartData']
  pieData: ProfitDataResult['pieData']
  categories: ProfitDataResult['categories']
}

export function useProfitCalculations(
  initialDate?: Date,
  initialFilters: ProfitFilters = {}
): UseProfitCalculationsReturn {
  const [date] = useState<Date>(initialDate || new Date())
  const [filters, setFilters] = useState<ProfitFilters>(initialFilters)
  const [data, setData] = useState<ProfitDataResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch data function
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await ProfitService.getProfitData(date, filters)
      setData(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch profit data'
      setError(errorMessage)
      console.error('Error in useProfitCalculations:', err)
    } finally {
      setIsLoading(false)
    }
  }, [date, filters])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Refresh function
  const refresh = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  // Update filters
  const handleSetFilters = useCallback((newFilters: ProfitFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  // Memoized derived values
  const memoizedData = useMemo(() => {
    if (!data) return null
    return data
  }, [data])

  const memoizedItems = useMemo(() => {
    return data?.items || []
  }, [data?.items])

  const memoizedSummary = useMemo(() => {
    return data?.summary || null
  }, [data?.summary])

  const memoizedTotals = useMemo(() => {
    return data?.totals || null
  }, [data?.totals])

  const memoizedChartData = useMemo(() => {
    return data?.chartData || []
  }, [data?.chartData])

  const memoizedPieData = useMemo(() => {
    return data?.pieData || []
  }, [data?.pieData])

  const memoizedCategories = useMemo(() => {
    return data?.categories || []
  }, [data?.categories])

  return {
    data: memoizedData,
    isLoading,
    error,
    refresh,
    setFilters: handleSetFilters,
    filters,
    items: memoizedItems,
    summary: memoizedSummary,
    totals: memoizedTotals,
    chartData: memoizedChartData,
    pieData: memoizedPieData,
    categories: memoizedCategories
  }
}

// ============================================================================
// OPTIMIZED HOOK WITH CACHING
// ============================================================================

interface CachedProfitData {
  data: ProfitDataResult
  timestamp: number
  date: string
}

export function useCachedProfitCalculations(
  date?: Date,
  initialFilters: ProfitFilters = {},
  cacheDuration: number = 60000 // 1 minute cache
): UseProfitCalculationsReturn {
  const [cachedData, setCachedData] = useState<CachedProfitData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<ProfitFilters>(initialFilters)
  const targetDate = date || new Date()
  const dateKey = format(targetDate, 'yyyy-MM-dd')

  const fetchData = useCallback(async () => {
    // Check cache
    if (cachedData && 
        cachedData.date === dateKey && 
        Date.now() - cachedData.timestamp < cacheDuration) {
      // Use cached data
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const result = await ProfitService.getProfitData(targetDate, filters)
      
      const cacheEntry: CachedProfitData = {
        data: result,
        timestamp: Date.now(),
        date: dateKey
      }
      
      setCachedData(cacheEntry)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch profit data'
      setError(errorMessage)
      console.error('Error in useCachedProfitCalculations:', err)
    } finally {
      setIsLoading(false)
    }
  }, [targetDate, filters, cachedData, cacheDuration, dateKey])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const refresh = useCallback(async () => {
    // Clear cache and fetch
    setCachedData(null)
    await fetchData()
  }, [fetchData])

  const handleSetFilters = useCallback((newFilters: ProfitFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  const currentData = cachedData?.data || null

  return {
    data: currentData,
    isLoading,
    error,
    refresh,
    setFilters: handleSetFilters,
    filters,
    items: currentData?.items || [],
    summary: currentData?.summary || null,
    totals: currentData?.totals || null,
    chartData: currentData?.chartData || [],
    pieData: currentData?.pieData || [],
    categories: currentData?.categories || []
  }
}

// Helper function to format date
function format(date: Date, formatStr: string): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  const seconds = pad(date.getSeconds())

  return formatStr
    .replace('yyyy', year.toString())
    .replace('MM', month)
    .replace('dd', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}