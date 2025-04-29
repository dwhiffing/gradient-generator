import { useEffect, useRef, useState } from 'react'
import { useControls } from 'leva'
import { GradientPicker } from './components/GradientPicker'
import { fragShader, vertexShader } from './utils/shader'
import { createGradientTexture } from './utils/gradient'
import { createProgram } from './utils/gl'

export default function App() {
  const width = 800
  const height = 800
  const [seed] = useState(Math.random() * 10000)
  const [gradient, setGradient] = useState(
    'linear-gradient(90deg, #060607 0%, #201847 20%, #362A7A 40%, #33A6C7 60%, #BC00B7 80%, #6C00A0 100%)',
  )
  const { scale, speed, position, f } = useControls({
    position: { value: { x: 0, y: 0 }, step: 5 },
    scale: { value: 3, min: 0.0000001, max: 100, step: 0.0001 },
    speed: { value: 0.05, min: 0.0000001, max: 1, step: 0.0001 },
    f: { value: 0.01, min: 0.0000001, max: 1, step: 0.0001 },
  })

  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl', { premultipliedAlpha: false })!
    const program = createProgram(gl, vertexShader, fragShader)
    gl.useProgram(program)

    const timeStates = Array.from({ length: 2 }).map(() => ({
      seed,
      lastTime: Date.now(),
      elapsed: 0,
      timeSpeed: 1,
    }))

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
    gl.uniform1f(uniformLoc('u_xScale'), scale)
    gl.uniform1f(uniformLoc('u_yScale'), scale)
    gl.uniform1f(uniformLoc('u_xPos'), position.x)
    gl.uniform1f(uniformLoc('u_yPos'), -position.y)
    gl.uniform1f(uniformLoc('u_L'), 0.0015)
    gl.uniform1f(uniformLoc('u_F'), f)
    gl.uniform1f(uniformLoc('u_S'), speed)

    function render() {
      requestAnimationFrame(render)

      const now = Date.now()
      for (let i = 0; i < 2; i++) {
        const state = timeStates[i]
        state.elapsed += (now - state.lastTime) * state.timeSpeed
        state.lastTime = now
        const t = state.seed + state.elapsed / 1000
        const loc = uniformLoc(i === 0 ? 'u_time' : `u_time${i + 1}`)
        if (loc) gl.uniform1f(loc, t)
      }

      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
      gl.activeTexture(gl.TEXTURE0)

      const gradientTexture = createGradientTexture(gl, gradient)
      gl.bindTexture(gl.TEXTURE_2D, gradientTexture)

      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
    }

    render()
  }, [width, height, seed, gradient, scale, position, f, speed])

  return (
    <>
      <canvas ref={canvasRef} width={width} height={height} />
      <GradientPicker gradient={gradient} setGradient={setGradient} />
    </>
  )
}
