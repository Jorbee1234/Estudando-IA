import { createBrowserRouter } from 'react-router-dom'
import { DashboardPage } from '@/pages/DashboardPage'

/**
 * `/pokemon/:id` é rota-filha do dashboard: a grade permanece montada (necessário para o
 * Shared Element Transition) e a URL é compartilhável / sobrevive a refresh.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <DashboardPage />,
    children: [{ path: 'pokemon/:id', element: null }],
  },
  { path: '*', element: <DashboardPage /> },
], { basename: import.meta.env.BASE_URL })
