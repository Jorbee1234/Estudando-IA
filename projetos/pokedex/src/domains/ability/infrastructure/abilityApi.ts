import { getJson } from '@/shared/api/httpClient'
import { config } from '@/shared/config'
import { cleanText } from '@/shared/lib/format'

export interface AbilityInfo {
  name: string
  shortEffect: string | null
  effect: string | null
}

interface AbilityDto {
  name: string
  effect_entries: Array<{ effect: string; short_effect: string; language: { name: string } }>
  flavor_text_entries: Array<{ flavor_text: string; language: { name: string } }>
}

export async function fetchAbility(name: string): Promise<AbilityInfo> {
  const dto = await getJson<AbilityDto>(`${config.apiBaseUrl}/ability/${name}`)
  const entry = dto.effect_entries.find((e) => e.language.name === 'en')
  const flavor = dto.flavor_text_entries.filter((e) => e.language.name === 'en').at(-1)
  return {
    name: dto.name,
    shortEffect: entry ? cleanText(entry.short_effect) : flavor ? cleanText(flavor.flavor_text) : null,
    effect: entry ? cleanText(entry.effect) : null,
  }
}
