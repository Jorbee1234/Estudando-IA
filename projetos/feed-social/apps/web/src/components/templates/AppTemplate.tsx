import type { ReactNode } from 'react'

type AppTemplateProps = {
  sidebar: ReactNode
  children: ReactNode
}

export function AppTemplate({ sidebar, children }: AppTemplateProps) {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-[1200px] flex-col gap-6 px-4 py-6 lg:flex-row lg:justify-between lg:gap-6 lg:px-0 lg:py-14">
      <div className="lg:shrink-0">{sidebar}</div>
      <main className="flex w-full min-w-0 flex-col gap-14 lg:max-w-[996px]">{children}</main>
    </div>
  )
}
