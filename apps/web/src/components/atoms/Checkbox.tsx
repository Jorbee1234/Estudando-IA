import type { ComponentProps } from 'react'

type CheckboxProps = Omit<ComponentProps<'input'>, 'type'>

export function Checkbox(props: CheckboxProps) {
  return (
    <span className="relative inline-flex size-6 shrink-0">
      <input
        type="checkbox"
        className="peer size-full cursor-pointer appearance-none rounded border border-accent outline-none focus-visible:ring-2 focus-visible:ring-accent"
        {...props}
      />
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden p-0.5 text-accent peer-checked:block"
      >
        <path d="m5 12 5 5 9-10" />
      </svg>
    </span>
  )
}
