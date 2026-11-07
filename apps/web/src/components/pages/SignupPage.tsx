import { AuthPrompt } from '../molecules/AuthPrompt'
import { SocialLogin } from '../molecules/SocialLogin'
import { SignupForm } from '../organisms/SignupForm'
import type { SignupFormData } from '../organisms/SignupForm'
import { AuthTemplate } from '../templates/AuthTemplate'
import { socialProviders } from './socialProviders'

type SignupPageProps = {
  onSignup: (data: SignupFormData) => void
  onSocialLogin: (providerId: string) => void
  error?: string
  pending?: boolean
}

export function SignupPage({
  onSignup,
  onSocialLogin,
  error,
  pending,
}: SignupPageProps) {
  return (
    <>
      <title>Cadastro | Code Connect</title>
      <AuthTemplate
        banner={{
          src: '/banner-cadastro.webp',
          alt: 'Mulher de óculos usando um notebook em frente a painéis verdes iluminados',
        }}
        title="Cadastro"
        subtitle="Olá! Preencha seus dados."
      >
        <SignupForm onSubmit={onSignup} error={error} pending={pending} />
        <div className="mt-8">
          <SocialLogin
            title="ou entre com outras contas"
            providers={socialProviders}
            onSelect={onSocialLogin}
          />
        </div>
        <div className="mt-6">
          <AuthPrompt
            question="Já tem conta?"
            linkLabel="Faça seu login!"
            href="/login"
            icon="login"
            layout="inline"
          />
        </div>
      </AuthTemplate>
    </>
  )
}
