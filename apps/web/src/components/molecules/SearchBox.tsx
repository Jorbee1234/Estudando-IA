import { Icon } from '../atoms/Icon'

type SearchBoxProps = {
  value: string
  onChange: (value: string) => void
}

export function SearchBox({ value, onChange }: SearchBoxProps) {
  return (
    <div
      role="search"
      className="flex items-center gap-4 rounded bg-card px-4 py-2 text-muted focus-within:ring-2 focus-within:ring-accent"
    >
      <Icon name="search" className="size-8" />
      <input
        type="search"
        aria-label="Buscar posts"
        placeholder="Digite o que você procura"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-transparent text-[22px] leading-normal text-muted outline-none placeholder:text-muted"
      />
    </div>
  )
}
