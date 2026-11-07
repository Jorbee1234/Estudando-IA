import type { FormEvent } from 'react'
import { Button } from '../atoms/Button'
import { Icon } from '../atoms/Icon'
import { TextLink } from '../atoms/TextLink'
import { CheckboxField } from '../molecules/CheckboxField'
import { FormField } from '../molecules/FormField'

export type LoginFormData = {
  email: string
  password: string
  remember: boolean
}

type LoginFormProps = {
  forgotPasswordHref: string
  onSubmit: (data: LoginFormData) => void
  error?: string
  pending?: boolean
}

export function LoginForm({
  forgotPasswordHref,
  onSubmit,
  error,
  pending = false,
}: LoginFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    onSubmit({
      email: String(data.get('email')),
      password: String(data.get('password')),
      remember: data.has('remember'),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      <div className="flex flex-col gap-[13px]">
        <FormField
          id="email"
          name="email"
          label="Email"
          type="email"
          placeholder="Digite seu email"
          autoComplete="email"
          required
        />
        <FormField
          id="password"
          name="password"
          label="Senha"
          type="password"
          placeholder="******"
          autoComplete="current-password"
          required
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <CheckboxField name="remember" label="Lembrar-me" />
        <TextLink href={forgotPasswordHref}>Esqueci a senha</TextLink>
      </div>
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="mt-8">
        <Button type="submit" disabled={pending}>
          Login
          <Icon name="arrow-right" />
        </Button>
      </div>
    </form>
  )
}
