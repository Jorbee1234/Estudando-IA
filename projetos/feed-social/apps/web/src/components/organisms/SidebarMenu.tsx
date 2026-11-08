import { useLocation } from 'react-router'
import { Button } from '../atoms/Button'
import { Logo } from '../atoms/Logo'
import { NavItem } from '../molecules/NavItem'

type SidebarMenuProps = {
  authenticated: boolean
  profileHref?: string
  onPublish: () => void
  onLogin: () => void
  onLogout: () => void
}

export function SidebarMenu({ authenticated, profileHref, onPublish, onLogin, onLogout }: SidebarMenuProps) {
  const { pathname } = useLocation()

  return (
    <aside className="flex flex-col items-center gap-6 rounded-lg bg-card px-4 py-6 lg:h-full lg:w-[177px] lg:gap-20 lg:py-10">
      <Logo />
      <nav
        aria-label="Principal"
        className="flex w-full flex-wrap items-center justify-center gap-4 lg:flex-col lg:gap-10"
      >
        <Button variant="outline" onClick={onPublish}>
          Publicar
        </Button>
        <NavItem icon="feed" label="Feed" href="/" active={pathname === '/'} />
        {authenticated && profileHref ? (
          <NavItem icon="account" label="Perfil" href={profileHref} active={pathname === profileHref} />
        ) : (
          <NavItem icon="account" label="Perfil" onClick={onLogin} />
        )}
        <NavItem icon="info" label="Sobre nós" disabled />
        {authenticated ? (
          <NavItem icon="logout" label="Sair" onClick={onLogout} />
        ) : (
          <NavItem icon="login" label="Entrar" onClick={onLogin} />
        )}
      </nav>
    </aside>
  )
}
