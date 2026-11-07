import { useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router'
import { useAuth } from './auth/AuthContext'
import { LoginPage } from './components/pages/LoginPage'
import { SignupPage } from './components/pages/SignupPage'
import { getApiErrorMessage } from './lib/api'
import { AppLayout } from './routes/AppLayout'
import { FeedRoute } from './routes/FeedRoute'
import { ProfileRoute } from './routes/ProfileRoute'

// Social login is not available in the API yet.
const handleSocialLogin = () => {}

// Runs an auth action, tracking pending/error state and going home on success.
function useAuthSubmit() {
  const navigate = useNavigate()
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)

  async function submit(action: () => Promise<void>) {
    setError(undefined)
    setPending(true)
    try {
      await action()
      navigate('/', { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err))
      setPending(false)
    }
  }

  return { error, pending, submit }
}

function LoginRoute() {
  const { login } = useAuth()
  const { error, pending, submit } = useAuthSubmit()

  return (
    <LoginPage
      error={error}
      pending={pending}
      onSocialLogin={handleSocialLogin}
      onLogin={({ email, password, remember }) =>
        submit(() => login({ email, password }, remember))
      }
    />
  )
}

function SignupRoute() {
  const { signup } = useAuth()
  const { error, pending, submit } = useAuthSubmit()

  return (
    <SignupPage
      error={error}
      pending={pending}
      onSocialLogin={handleSocialLogin}
      onSignup={({ name, email, password, remember }) =>
        submit(() => signup({ name, email, password }, remember))
      }
    />
  )
}

function App() {
  return (
    <Routes>
      {/* The feed is public: visitors read it, interacting asks for a login. */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<FeedRoute />} />
        <Route path="/perfil/:userId" element={<ProfileRoute />} />
      </Route>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/cadastro" element={<SignupRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
