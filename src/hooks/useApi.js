import { useState, useEffect, useCallback, useRef } from 'react'

export function useApi(fetchFn, deps = [], options = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)
  const { refreshInterval = 0 } = options

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchFn()
      setData(result)
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message)
    } finally {
      setLoading(false)
    }
  }, deps) // eslint-disable-line

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!refreshInterval) return undefined
    const timer = setInterval(() => { load() }, refreshInterval)
    return () => clearInterval(timer)
  }, [load, refreshInterval])

  return { data, loading, error, refetch: load }
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
