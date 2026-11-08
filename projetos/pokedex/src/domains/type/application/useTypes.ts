import { useQuery } from '@tanstack/react-query'
import { fetchTypeMemberIds, fetchTypeNames } from '../infrastructure/typeApi'

export const typeKeys = {
  all: ['types'] as const,
  members: (type: string) => ['types', 'members', type] as const,
}

export const useTypes = () => useQuery({ queryKey: typeKeys.all, queryFn: fetchTypeNames })

export const useTypeMembers = (type: string | null) =>
  useQuery({
    queryKey: typeKeys.members(type ?? ''),
    queryFn: () => fetchTypeMemberIds(type as string),
    enabled: !!type,
  })
