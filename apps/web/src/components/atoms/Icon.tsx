const paths = {
  'arrow-right': (
    <path
      d="M5 12h14m-6-6 6 6-6 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  clipboard: (
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M9 2a1 1 0 0 0-1 1v1H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V3a1 1 0 0 0-1-1H9Zm1 2h4v2h-4V4ZM8 10h8v2H8v-2Zm0 4h8v2H8v-2Z"
    />
  ),
}

export type IconName = keyof typeof paths

type IconProps = {
  name: IconName
}

export function Icon({ name }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      data-icon={name}
      className="size-[1.25em] shrink-0"
    >
      {paths[name]}
    </svg>
  )
}
