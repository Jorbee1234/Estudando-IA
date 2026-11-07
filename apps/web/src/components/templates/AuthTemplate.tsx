import type { ReactNode } from 'react'
import { Logo } from '../atoms/Logo'
import { Symbol } from '../atoms/Symbol'

type AuthTemplateProps = {
  banner: {
    src: string
    alt: string
  }
  title: string
  subtitle: string
  // Indents the title and subtitle to line up with a narrower form.
  headerInset?: boolean
  children: ReactNode
}

export function AuthTemplate({
  banner,
  title,
  subtitle,
  headerInset = false,
  children,
}: AuthTemplateProps) {
  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden p-4">
      <Symbol className="-top-[30px] left-[73px]" />
      <Symbol className="right-[142px] bottom-0" />
      <div className="relative flex w-full max-w-[996px] justify-center rounded-[32px] border border-black bg-card px-6 py-10 lg:justify-start lg:gap-[23px] lg:px-[77px] lg:py-[55px]">
        <div className="relative hidden w-[407px] shrink-0 self-stretch py-1 lg:block">
          <img
            src={banner.src}
            alt={banner.alt}
            // The banner is hidden below lg; lazy loading keeps small screens
            // from downloading it.
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
          <div className="absolute bottom-[39px] left-1/2 -translate-x-1/2">
            <Logo />
          </div>
        </div>
        <div className="flex w-full max-w-[410px] flex-col lg:px-8">
          <div className={headerInset ? 'px-3.5' : undefined}>
            <h1 className="text-[31px] leading-normal font-semibold">{title}</h1>
            <p className="mt-6 text-[22px] leading-normal">{subtitle}</p>
          </div>
          <div className="mt-8 flex flex-col">{children}</div>
        </div>
      </div>
    </main>
  )
}
