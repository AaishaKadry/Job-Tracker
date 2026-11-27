import { useEffect, useState } from 'react'
import { ApiError } from '../lib/api/client'
import { fetchDashboard, type DashboardData } from '../lib/api/dashboard'

interface DashboardLoadState {
  requestKey: number
  data?: DashboardData
  error?: string
}

export function useDashboardData() {
  const [reloadKey, setReloadKey] = useState(0)
  const [loadState, setLoadState] = useState<DashboardLoadState | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    void fetchDashboard(controller.signal)
      .then((data) => {
        if (active) setLoadState({ requestKey: reloadKey, data })
      })
      .catch((cause: unknown) => {
        if (active && !controller.signal.aborted) {
          setLoadState({
            requestKey: reloadKey,
            error:
              cause instanceof ApiError
                ? cause.message
                : 'Unable to load dashboard data. Please try again.',
          })
        }
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [reloadKey])

  const isCurrentRequest = loadState?.requestKey === reloadKey

  return {
    data: isCurrentRequest ? loadState.data : undefined,
    error: isCurrentRequest ? loadState.error : undefined,
    isLoading: !isCurrentRequest,
    retry: () => setReloadKey((key) => key + 1),
  }
}
