import { createPlugin, LevaInputProps, useInputContext } from 'leva/plugin'
import ColorPicker from 'react-best-gradient-color-picker'

const GradientPicker = () => {
  const { value, onUpdate } = useInputContext<LevaInputProps<string>>()
  return (
    <ColorPicker
      width={250}
      height={100}
      value={value}
      onChange={onUpdate}
      hideGradientType
      hideColorTypeBtns
      hideGradientAngle
      hideColorGuide
      hidePresets
      hideOpacity
    />
  )
}

export const gradientPicker = createPlugin({
  component: GradientPicker,
  sanitize: (v) => v,
  format: (v) => v,
})
