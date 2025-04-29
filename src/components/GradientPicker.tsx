import ColorPicker from 'react-best-gradient-color-picker'

export function GradientPicker(props: {
  gradient: string
  setGradient: (s: string) => void
}) {
  return (
    <div
      style={{
        backgroundColor: '#222',
        padding: 12,
        borderRadius: 8,
        width: 280,
      }}
    >
      <ColorPicker
        width={280}
        height={100}
        value={props.gradient}
        onChange={props.setGradient}
        hideGradientType
        hideColorGuide
        hidePresets
        hideOpacity
      />
    </div>
  )
}
