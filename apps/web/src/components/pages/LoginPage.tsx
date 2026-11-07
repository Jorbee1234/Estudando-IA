import { AuthPrompt } from '../molecules/AuthPrompt'
import { SocialLogin } from '../molecules/SocialLogin'
import { LoginForm } from '../organisms/LoginForm'
import type { LoginFormData } from '../organisms/LoginForm'
import { AuthTemplate } from '../templates/AuthTemplate'
import { socialProviders } from './socialProviders'

type LoginPageProps = {
  onLogin: (data: LoginFormData) => void
  onSocialLogin: (providerId: string) => void
}

export function LoginPage({ onLogin, onSocialLogin }: LoginPageProps) {
  return (
    <>
      <title>Login | Code Connect</title>
      <AuthTemplate
        banner={{
          src: '/logotipo.webp',
          alt: 'Mulher sorrindo enquanto usa um notebook em frente a painéis verdes iluminados',
        }}
        title="Login"
        subtitle="Boas-vindas! Faça seu login."
        headerInset
      >
        <div className="mx-auto w-full max-w-[318px] pt-2">
          <LoginForm forgotPasswordHref="/esqueci-a-senha" onSubmit={onLogin} />
        </div>
        <div className="mt-8">
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
    </>
  )
}
