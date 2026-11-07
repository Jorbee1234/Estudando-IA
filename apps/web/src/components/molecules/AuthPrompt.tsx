import { Icon } from '../atoms/Icon'
import type { IconName } from '../atoms/Icon'
import { TextLink } from '../atoms/TextLink'

type AuthPromptProps = {
  question: string
  linkLabel: string
  href: string
  icon: IconName
}

export function AuthPrompt({ question, linkLabel, href, icon }: AuthPromptProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-[15px]">{question}</p>
      <TextLink href={href} variant="accent">
        {linkLabel}
        <Icon name={icon} />
      </TextLink>
    </div>
  )
}
