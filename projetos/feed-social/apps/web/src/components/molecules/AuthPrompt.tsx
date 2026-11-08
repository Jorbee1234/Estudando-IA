import { cva } from 'class-variance-authority'
import { Icon } from '../atoms/Icon'
import type { IconName } from '../atoms/Icon'
import { TextLink } from '../atoms/TextLink'

const container = cva('flex', {
  variants: {
    layout: {
      stacked: 'flex-col items-center gap-3',
      inline: 'flex-row items-center gap-2',
    },
  },
})

const question = cva('', {
  variants: {
    layout: { stacked: 'text-[15px]', inline: 'text-lg' },
  },
})

type AuthPromptProps = {
  question: string
  linkLabel: string
  href: string
  icon: IconName
  layout?: 'stacked' | 'inline'
}

export function AuthPrompt({
  question: text,
  linkLabel,
  href,
  icon,
  layout = 'stacked',
}: AuthPromptProps) {
  return (
    <div className={container({ layout })}>
      <p className={question({ layout })}>{text}</p>
      <TextLink href={href} variant="accent">
        {linkLabel}
        <Icon name={icon} />
      </TextLink>
    </div>
  )
}
