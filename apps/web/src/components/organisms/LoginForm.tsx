import type { FormEvent } from 'react'
import { Button } from '../atoms/Button'
import { Icon } from '../atoms/Icon'
import { TextLink } from '../atoms/TextLink'
import { CheckboxField } from '../molecules/CheckboxField'
import { FormField } from '../molecules/FormField'

export type LoginFormData = {
  login: string
  password: string
  remember: boolean
}

type LoginFormProps = {
  forgotPasswordHref: string
  onSubmit: (data: LoginFormData) => void
}

export function LoginForm({ forgotPasswordHref, onSubmit }: LoginFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    onSubmit({
      login: String(data.get('login')),
      password: String(data.get('password')),
      remember: data.has('remember'),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      <div className="flex flex-col gap-[13px]">
        <FormField
          id="login"
          name="login"
          label="Email ou usuário"
          placeholder="usuario123"
          autoComplete="username"
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
      <div className="mt-8">
        <Button type="submit">
          Login
          <Icon name="arrow-right" />
        </Button>
      </div>
    </form>
  )
}
