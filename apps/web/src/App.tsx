import { Navigate, Route, Routes } from 'react-router'
import { LoginPage } from './components/pages/LoginPage'
import { SignupPage } from './components/pages/SignupPage'

// Authentication is not integrated yet: there is no API endpoint to call.
const handleLogin = () => {}
const handleSignup = () => {}
const handleSocialLogin = () => {}

function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <LoginPage onLogin={handleLogin} onSocialLogin={handleSocialLogin} />
        }
      />
      <Route
        path="/cadastro"
        element={
          <SignupPage
            onSignup={handleSignup}
            onSocialLogin={handleSocialLogin}
          />
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
