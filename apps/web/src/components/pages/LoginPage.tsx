import { AuthPrompt } from '../molecules/AuthPrompt'
import { SocialLogin } from '../molecules/SocialLogin'
import type { SocialProvider } from '../molecules/SocialLogin'
import { LoginForm } from '../organisms/LoginForm'
import type { LoginFormData } from '../organisms/LoginForm'
import { AuthTemplate } from '../templates/AuthTemplate'

const socialProviders: SocialProvider[] = [
  { id: 'github', label: 'Entrar com Github', iconSrc: '/github.png' },
  { id: 'gmail', label: 'Entrar com Gmail', iconSrc: '/Gmail.png' },
]

type LoginPageProps = {
  onLogin: (data: LoginFormData) => void
  onSocialLogin: (providerId: string) => void
}

export function LoginPage({ onLogin, onSocialLogin }: LoginPageProps) {
  return (
    <AuthTemplate
      banner={{
        src: '/logotipo.png',
        alt: 'Mulher sorrindo enquanto usa um notebook em frente a painéis verdes iluminados',
      }}
      title="Login"
      subtitle="Boas-vindas! Faça seu login."
    >
      <LoginForm forgotPasswordHref="/esqueci-a-senha" onSubmit={onLogin} />
      <div className="mt-[34px] -mx-3.5">
        <SocialLogin
          title="ou entre com outras contas"
          providers={socialProviders}
          onSelect={onSocialLogin}
        />
      </div>
      <div className="mt-6">
        <AuthPrompt
          question="Ainda não tem conta?"
          linkLabel="Crie seu cadastro!"
          href="/cadastro"
          icon="clipboard"
        />
      </div>
    </AuthTemplate>
  )
}
