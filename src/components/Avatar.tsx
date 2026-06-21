import { cn, getInitials, getAvatarColor } from '@/lib/utils'

interface AvatarProps {
  name: string
  photoURL?: string
  avatarColor?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-xl',
}

export function Avatar({ name, photoURL, avatarColor, size = 'md', className }: AvatarProps) {
  const color = avatarColor ?? getAvatarColor(name)
  const initials = getInitials(name)

  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt={name}
        className={cn('rounded-full object-cover ring-2 ring-primary/30', sizeMap[size], className)}
        onError={(e) => { e.currentTarget.style.display = 'none' }}
      />
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold text-white ring-2 ring-white/40 shadow-md select-none',
        sizeMap[size],
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {initials}
    </span>
  )
}
