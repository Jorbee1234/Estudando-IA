import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { config } from '@/shared/config'
import { MotionPreferenceProvider } from '@/shared/hooks/MotionPreferenceProvider'
import { SoundProvider } from '@/shared/hooks/SoundProvider'
import { AccentProvider, AdaptiveBackground, GoldenParticles, ShinyProvider } from '@/domains/theme'

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: config.staleTimeMs,
            gcTime: config.gcTimeMs,
            refetchOnWindowFocus: false,
            retry: 2,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={client}>
      <MotionPreferenceProvider>
        <SoundProvider>
          <ShinyProvider>
            <AccentProvider>
              <AdaptiveBackground />
              <GoldenParticles />
              {children}
            </AccentProvider>
          </ShinyProvider>
        </SoundProvider>
      </MotionPreferenceProvider>
      {import.meta.env.DEV && <ReactQueryDevtools buttonPosition="bottom-left" />}
    </QueryClientProvider>
  )
}
