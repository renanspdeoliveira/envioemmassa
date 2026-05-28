import { useState, useEffect, useCallback, useRef } from 'react'

export function useApi(fetchFn, deps = [], options = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const hasDataRef = useRef(false)
  const { refreshInterval = 0 } = options

  const load = useCallback(async (mode = 'initial') => {
    const hasData = hasDataRef.current
    const isBackgroundRefresh = mode === 'refresh' && hasData

    if (isBackgroundRefresh) setRefreshing(true)
    else setLoading(true)

    if (mode !== 'refresh') setError(null)

    try {
      const result = await fetchFn()
      setData(result)
      hasDataRef.current = true
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message)
    } finally {
      if (isBackgroundRefresh) setRefreshing(false)
      else setLoading(false)
    }
  }, deps) // eslint-disable-line

  useEffect(() => { load('initial') }, [load])

  useEffect(() => {
    if (!refreshInterval) return undefined
    const timer = setInterval(() => { load('refresh') }, refreshInterval)
    return () => clearInterval(timer)
  }, [load, refreshInterval])

  return { data, loading, refreshing, error, refetch: load }
}

export function useLazyApi() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const execute = useCallback(async (fetchFn) => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchFn()
      setData(result)
      return result
    } catch (e) {
      setError(e.message)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, error, execute }
}
