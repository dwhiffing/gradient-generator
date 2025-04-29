import { useEffect, useRef } from 'react'
import { folder, useControls } from 'leva'
import { gradientPicker } from './components/GradientPicker'
import { fragShader, vertexShader } from './utils/shader'
import { createGradientTexture } from './utils/gradient'
import { createProgram } from './utils/gl'

export default function App() {
  const { gradient, size, scale, time, position, f } = useControls({
    position: { value: { x: 0, y: 0 }, step: 5, joystick: false },
    size: { value: { x: 800, y: 800 }, step: 5, joystick: false },
    scale: { value: 15, min: 0.001, max: 20, step: 0.0001 },
    time: { value: Math.random() * 5, min: 0, max: 5, step: 0.001 },
    f: { value: 0.01, min: 0.0000001, max: 5, step: 0.0001 },
    gradient: folder({
      gradient: gradientPicker(
        'linear-gradient(90deg, #060607 0%, #201847 20%, #362A7A 40%, #33A6C7 60%, #BC00B7 80%, #6C00A0 100%)',
      ),
    }),
  })

  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl', { premultipliedAlpha: false })!
    const program = createProgram(gl, vertexShader, fragShader)
    gl.useProgram(program)

    const positionBuffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([0, 0, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1]),
      gl.STATIC_DRAW,
    )

    const a_position = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(a_position)
    gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0)

    const uniformLoc = (name: string) => gl.getUniformLocation(program, name)
    gl.uniform1i(uniformLoc('u_gradient'), 0)
    gl.uniform1f(uniformLoc('u_xScale'), 20 - scale)
    gl.uniform1f(uniformLoc('u_yScale'), 20 - scale)
    gl.uniform1f(uniformLoc('u_xPos'), position.x)
    gl.uniform1f(uniformLoc('u_yPos'), -position.y)
    gl.uniform1f(uniformLoc('u_L'), 0.0015)
    gl.uniform1f(uniformLoc('u_F'), f)

    function render() {
      gl.uniform1f(uniformLoc('u_time'), time)

      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
      gl.activeTexture(gl.TEXTURE0)

      const gradientTexture = createGradientTexture(
        gl,
        gradient as unknown as string,
      )
      gl.bindTexture(gl.TEXTURE_2D, gradientTexture)

      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
    }

    render()
  }, [size.x, size.y, gradient, time, scale, position.x, position.y, f])

  return (
    <>
      <canvas
        ref={canvasRef}
        width={Math.min(size.x, window.innerWidth)}
        height={Math.min(size.y, window.innerHeight)}
        style={{ borderRadius: 4 }}
      />
    </>
  )
}
