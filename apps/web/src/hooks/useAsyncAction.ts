import { useCallback, useState } from 'react'
import { getApiErrorMessage, getApiFieldErrors } from '../lib/api'

export function useAsyncAction() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const run = useCallback(async (action: () => Promise<void>) => {
    setError(undefined)
    setFieldErrors({})
    setPending(true)
    try {
      await action()
      return true
    } catch (err) {
      setError(getApiErrorMessage(err))
      setFieldErrors(getApiFieldErrors(err))
      return false
    } finally {
      setPending(false)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(undefined)
    setFieldErrors({})
  }, [])

  return { pending, error, fieldErrors, run, clearError }
}
