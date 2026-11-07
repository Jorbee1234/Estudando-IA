import { useCallback, useEffect, useState } from 'react'
import { getApiErrorMessage } from '../lib/api'
import { getProfile } from '../services/profileService'
import type { Profile } from '../services/profileService'

type State = { userId: string; profile?: Profile; error?: string }

export function useProfile(userId: string, refreshKey = 0) {
  const [state, setState] = useState<State>()

  useEffect(() => {
    let obsolete = false

    getProfile(userId)
      .then((profile) => {
        if (!obsolete) setState({ userId, profile })
      })
      .catch((err: unknown) => {
        if (obsolete) return
        setState((previous) =>
          previous?.userId === userId && previous.profile
            ? previous
            : { userId, error: getApiErrorMessage(err) },
        )
      })

    return () => {
      obsolete = true
    }
  }, [userId, refreshKey])

  const reload = useCallback(async () => {
    setState({ userId, profile: await getProfile(userId) })
  }, [userId])

  const replace = useCallback((profile: Profile) => setState({ userId, profile }), [userId])

  const settled = state?.userId === userId ? state : undefined

  return {
    profile: settled?.profile,
    error: settled?.error,
    loading: settled === undefined,
    reload,
    replace,
  }
}
