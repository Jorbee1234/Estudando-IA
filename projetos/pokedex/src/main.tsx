import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/shared/styles/global.scss'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Auditoria de acessibilidade em tempo real durante o desenvolvimento (violações no console).
if (import.meta.env.DEV) {
  void (async () => {
    try {
      const [React, ReactDOM, axe] = await Promise.all([import('react'), import('react-dom'), import('@axe-core/react')])
      await axe.default(React, ReactDOM, 1000)
    } catch {
      /* axe é opcional */
    }
  })()
}
