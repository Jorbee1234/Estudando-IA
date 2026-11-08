import { useQuery } from '@tanstack/react-query'
import { fetchAbility } from '../infrastructure/abilityApi'

export const useAbility = (name: string) =>
  useQuery({ queryKey: ['ability', name], queryFn: () => fetchAbility(name) })
