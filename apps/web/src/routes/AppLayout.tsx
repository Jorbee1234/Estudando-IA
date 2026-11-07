import { useCallback, useMemo, useRef, useState } from 'react'
import { Outlet } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { LoginModal } from '../components/organisms/LoginModal'
import { CreatePostModal } from '../components/organisms/CreatePostModal'
import { SidebarMenu } from '../components/organisms/SidebarMenu'
import { AppTemplate } from '../components/templates/AppTemplate'
import { getApiErrorMessage } from '../lib/api'
import { createPost } from '../services/postService'
import type { NewPost } from '../services/postService'
import { AppLayoutContext } from './AppLayoutContext'

type PendingAction = () => void | Promise<void>

export function AppLayout() {
  const { user, login, logout } = useAuth()

  const [feedVersion, setFeedVersion] = useState(0)
  const refreshFeed = useCallback(() => setFeedVersion((version) => version + 1), [])

  const [loginOpen, setLoginOpen] = useState(false)
  const [loginError, setLoginError] = useState<string>()
  const [loginPending, setLoginPending] = useState(false)
  const pendingAction = useRef<PendingAction | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [createError, setCreateError] = useState<string>()
  const [createPending, setCreatePending] = useState(false)

  const openLogin = useCallback(() => {
    setLoginError(undefined)
    setLoginOpen(true)
  }, [])

  const closeLogin = useCallback(() => {
    pendingAction.current = null
    setLoginOpen(false)
  }, [])

  const requireAuth = useCallback(
    (action: PendingAction) => {
      if (user) {
        void action()
        return
      }
      pendingAction.current = action
      openLogin()
    },
    [user, openLogin],
  )

  async function handleLogin({
    email,
    password,
    remember,
  }: {
    email: string
    password: string
    remember: boolean
  }) {
    setLoginError(undefined)
    setLoginPending(true)
    try {
      await login({ email, password }, remember)
    } catch (err) {
      setLoginError(getApiErrorMessage(err))
      setLoginPending(false)
      return
    }
    setLoginPending(false)
    setLoginOpen(false)

    const action = pendingAction.current
    pendingAction.current = null
    try {
      await action?.()
    } finally {
      refreshFeed()
    }
  }

  function handleLogout() {
    logout()
    refreshFeed()
  }

  async function handleCreatePost(post: NewPost) {
    setCreateError(undefined)
    setCreatePending(true)
    try {
      await createPost(post)
    } catch (err) {
      setCreateError(getApiErrorMessage(err))
      setCreatePending(false)
      return
    }
    setCreatePending(false)
    setCreateOpen(false)
    refreshFeed()
  }

  const context = useMemo(
    () => ({ requireAuth, feedVersion, refreshFeed }),
    [requireAuth, feedVersion, refreshFeed],
  )

  return (
    <AppLayoutContext value={context}>
      <AppTemplate
        sidebar={
          <SidebarMenu
            authenticated={user !== null}
            profileHref={user ? `/perfil/${user.id}` : undefined}
            onPublish={() =>
              requireAuth(() => {
                setCreateError(undefined)
                setCreateOpen(true)
              })
            }
            onLogin={openLogin}
            onLogout={handleLogout}
          />
        }
      >
        <Outlet />
      </AppTemplate>
      <LoginModal
        open={loginOpen}
        onClose={closeLogin}
        onLogin={handleLogin}
        error={loginError}
        pending={loginPending}
      />
      <CreatePostModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreatePost}
        error={createError}
        pending={createPending}
      />
    </AppLayoutContext>
  )
}
