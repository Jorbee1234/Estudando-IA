import { Tag } from '../atoms/Tag'

type TagListProps = {
  tags: string[]
}

export function TagList({ tags }: TagListProps) {
  if (tags.length === 0) return null

  return (
    <ul aria-label="Tags" className="flex flex-wrap gap-2.5">
      {tags.map((tag) => (
        <li key={tag}>
          <Tag>{tag}</Tag>
        </li>
      ))}
    </ul>
  )
}
