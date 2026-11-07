import type { ReactNode } from 'react'

const symbolSrc = '/Símbolo.png'

type AuthTemplateProps = {
  banner: {
    src: string
    alt: string
  }
  title: string
  subtitle: string
  children: ReactNode
}

export function AuthTemplate({
  banner,
  title,
  subtitle,
  children,
}: AuthTemplateProps) {
  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden p-4">
      <img src={symbolSrc} alt="" className="absolute top-0 left-[73px]" />
      <img src={symbolSrc} alt="" className="absolute right-[142px] bottom-0" />
      <div className="relative flex w-full max-w-[994px] justify-center gap-[69px] rounded-[32px] bg-card px-6 py-10 lg:justify-start lg:pt-[55px] lg:pr-[123px] lg:pb-[63px] lg:pl-[77px]">
        <img
          src={banner.src}
          alt={banner.alt}
          className="hidden h-[628px] w-[407px] object-cover lg:block"
        />
        <div className="flex w-full max-w-[318px] flex-col">
          <h1 className="text-[32px] font-semibold">{title}</h1>
          <p className="mt-6 mb-[39px] text-[22px]">{subtitle}</p>
          {children}
        </div>
      </div>
    </main>
  )
}
