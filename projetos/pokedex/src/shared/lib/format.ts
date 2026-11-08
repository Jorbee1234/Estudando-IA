export const padId = (id: number) => `#${String(id).padStart(4, '0')}`

/** "special-attack" -> "Special Attack" */
export function titleCase(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export const cleanText = (text: string) => text.replace(/[\f\n\r]+/g, ' ').replace(/\s+/g, ' ').trim()

export const decimeters = (n: number) => `${(n / 10).toLocaleString('pt-BR')} m`
export const hectograms = (n: number) => `${(n / 10).toLocaleString('pt-BR')} kg`
