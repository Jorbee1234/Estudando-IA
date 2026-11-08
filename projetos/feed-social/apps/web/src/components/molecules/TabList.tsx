import { Tab } from '../atoms/Tab'

type TabListProps<T extends string> = {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}

export function TabList<T extends string>({ label, options, value, onChange }: TabListProps<T>) {
  return (
    <div role="tablist" aria-label={label} className="flex justify-center gap-6">
      {options.map((option) => (
        <Tab
          key={option.value}
          active={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Tab>
      ))}
    </div>
  )
}
