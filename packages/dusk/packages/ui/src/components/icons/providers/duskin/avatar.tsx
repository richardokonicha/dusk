import { Avatar, AvatarFallback } from '@dusk/ui/components/primitives/avatar'
import { cn } from '@dusk/ui/lib/utils'

import { type IconAvatarProps } from '../../types'
import { DuskinLight } from './light'

export function DuskinAvatar({ size = 32, shape = 'circle', className }: Omit<IconAvatarProps, 'icon'>) {
  return (
    <Avatar
      className={cn('overflow-hidden', shape === 'circle' ? 'rounded-full' : 'rounded-[20%]', className)}
      style={{ width: size, height: size }}>
      <AvatarFallback className="text-foreground">
        <DuskinLight style={{ width: size, height: size }} />
      </AvatarFallback>
    </Avatar>
  )
}
