import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAllUsers } from '@/services/firebase/users'

export function useUserProfiles() {
  const { data: users = [] } = useQuery({
    queryKey: ['user-profiles'],
    queryFn: getAllUsers,
    staleTime: 1000 * 60 * 10,
  })

  const map = useMemo(() => {
    const m = new Map<string, { displayName: string; avatarColor?: string }>()
    for (const u of users) {
      m.set(u.uid, { displayName: u.displayName, avatarColor: u.avatarColor })
    }
    return m
  }, [users])

  return {
    getProfile: (uid: string) => map.get(uid),
  }
}
