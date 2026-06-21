import { useUserProfiles } from '@/hooks/use-user-profiles'
import { cn } from '@/lib/utils'

interface AuthorTagProps {
  userId?: string
  className?: string
}

export function AuthorTag({ userId, className }: AuthorTagProps) {
  const { getProfile } = useUserProfiles()

  if (!userId) return null

  const profile = getProfile(userId)
  if (!profile) return null

  const color = profile.avatarColor ?? '#1a3a5c'
  const firstName = profile.displayName.split(' ')[0]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground bg-background/80',
        className,
      )}
      title={profile.displayName}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0 ring-1 ring-black/10"
        style={{ backgroundColor: color }}
      />
      {firstName}
    </span>
  )
}
