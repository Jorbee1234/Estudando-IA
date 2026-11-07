import { Tag } from '../atoms/Tag'
import { SearchBox } from '../molecules/SearchBox'

type FeedFiltersProps = {
  searchText: string
  onSearchChange: (value: string) => void
  selectedTags: string[]
  suggestedTags: string[]
  onAddTag: (tag: string) => void
  onRemoveTag: (tag: string) => void
  onClear: () => void
}

export function FeedFilters({
  searchText,
  onSearchChange,
  selectedTags,
  suggestedTags,
  onAddTag,
  onRemoveTag,
  onClear,
}: FeedFiltersProps) {
  const hasFilters = searchText.trim() !== '' || selectedTags.length > 0
  const suggestions = suggestedTags.filter((tag) => !selectedTags.includes(tag))

  return (
    <section aria-label="Filtros" className="flex flex-col gap-4">
      <SearchBox value={searchText} onChange={onSearchChange} />
      <div className="flex items-start justify-between gap-4">
        <ul aria-label="Tags para filtrar" className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {selectedTags.map((tag) => (
            <li key={tag}>
              <Tag variant="selected" onClick={() => onRemoveTag(tag)}>
                {tag}
              </Tag>
            </li>
          ))}
          {suggestions.map((tag) => (
            <li key={tag}>
              <Tag variant="filter" onClick={() => onAddTag(tag)}>
                {tag}
              </Tag>
            </li>
          ))}
        </ul>
        {hasFilters && (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 cursor-pointer rounded text-lg leading-normal text-field hover:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Limpar tudo
          </button>
        )}
      </div>
    </section>
  )
}
