import type { FormEvent } from 'react'
import { Button } from '../atoms/Button'
import { Icon } from '../atoms/Icon'
import { CheckboxField } from '../molecules/CheckboxField'
import { FormField } from '../molecules/FormField'

export type SignupFormData = {
  name: string
  email: string
  password: string
  remember: boolean
}

type SignupFormProps = {
  onSubmit: (data: SignupFormData) => void
}

export function SignupForm({ onSubmit }: SignupFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    onSubmit({
      name: String(data.get('name')),
      email: String(data.get('email')),
      password: String(data.get('password')),
      remember: data.has('remember'),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      <div className="flex flex-col gap-4">
        <FormField
          id="name"
          name="name"
          label="Nome"
          placeholder="Nome completo"
          autoComplete="name"
          required
        />
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
          autoComplete="new-password"
          required
        />
      </div>
      <div className="mt-2">
        <CheckboxField name="remember" label="Lembrar-me" />
      </div>
      <div className="mt-8">
        <Button type="submit">
          Cadastrar
          <Icon name="arrow-right" />
        </Button>
      </div>
    </form>
  )
}
