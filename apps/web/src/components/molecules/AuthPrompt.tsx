import { Icon } from '../atoms/Icon'
import type { IconName } from '../atoms/Icon'
import { TextLink } from '../atoms/TextLink'

const layouts = {
  stacked: 'flex-col items-center gap-3',
  inline: 'flex-row items-center gap-2',
}

type AuthPromptProps = {
  question: string
  linkLabel: string
  href: string
  icon: IconName
  layout?: keyof typeof layouts
}

export function AuthPrompt({
  question,
  linkLabel,
  href,
  icon,
  layout = 'stacked',
}: AuthPromptProps) {
  return (
    <div className={`flex ${layouts[layout]}`}>
      <p className={layout === 'inline' ? 'text-lg' : 'text-[15px]'}>
        {question}
      </p>
      <TextLink href={href} variant="accent">
        {linkLabel}
        <Icon name={icon} />
      </TextLink>
    </div>
  )
}
