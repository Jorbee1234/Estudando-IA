import { LoginPage } from './components/pages/LoginPage'

// Authentication is not integrated yet: there is no API endpoint to call.
const handleLogin = () => {}
const handleSocialLogin = () => {}

function App() {
  return <LoginPage onLogin={handleLogin} onSocialLogin={handleSocialLogin} />
}

export default App
