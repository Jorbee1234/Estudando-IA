import { Modal } from '../atoms/Modal'
import { TextLink } from '../atoms/TextLink'
import { Icon } from '../atoms/Icon'
import { LoginForm } from './LoginForm'
import type { LoginFormData } from './LoginForm'

type LoginModalProps = {
  open: boolean
  onClose: () => void
  onLogin: (data: LoginFormData) => void
  error?: string
  pending?: boolean
}

export function LoginModal({ open, onClose, onLogin, error, pending }: LoginModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Login">
      <LoginForm
        forgotPasswordHref="/esqueci-a-senha"
        onSubmit={onLogin}
        error={error}
        pending={pending}
      />
      <div className="mt-6 flex items-center justify-center gap-3 text-[15px]">
        Ainda não tem conta?
        <TextLink href="/cadastro" variant="accent" onClick={onClose}>
          Crie seu cadastro!
          <Icon name="clipboard" />
        </TextLink>
      </div>
    </Modal>
  )
}
