import type { CompoundIcon, CompoundIconProps } from '../../types'
import { DuskinAvatar } from './avatar'
import { DuskinLight } from './light'

const Duskin = ({ variant, className, ...props }: CompoundIconProps) => {
  if (variant === 'light') return <DuskinLight {...props} className={className} />
  return <DuskinLight {...props} className={className} />
}

export const DuskinIcon: CompoundIcon = /*#__PURE__*/ Object.assign(Duskin, {
  Avatar: DuskinAvatar,
  colorPrimary: '#FF5F5F'
})

export default DuskinIcon
