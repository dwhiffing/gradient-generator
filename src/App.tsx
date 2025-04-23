import { useEffect, useRef } from 'react'
import { shader } from './shader'

const N_TIME_VALUES = 2

function timeKey(index: number) {
  return index === 0 ? 'u_time' : `u_time${index + 1}`
}

export interface ColorConfiguration {
  gradient: string[]
}

const vertexShaderSource = `
precision highp float;
attribute vec2 a_position;

void main() {
  vec2 clipSpace = a_position * 2.0 - 1.0;
  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
}`

function createShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader))
    throw new Error('Shader compile error')
  }
  return shader
}

function createProgram(
  gl: WebGLRenderingContext,
  vSrc: string,
  fSrc: string,
): WebGLProgram {
  const program = gl.createProgram()!
  const vShader = createShader(gl, gl.VERTEX_SHADER, vSrc)
  const fShader = createShader(gl, gl.FRAGMENT_SHADER, fSrc)
  gl.attachShader(program, vShader)
  gl.attachShader(program, fShader)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program))
    throw new Error('Program link error')
  }
  return program
}

function createGradientTexture(
  gl: WebGLRenderingContext,
  gradient: string[],
): WebGLTexture {
  const canvas = document.createElement('canvas')
  const width = 1000
  const height = 2
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  const grd = ctx.createLinearGradient(0, 0, width, 0)
  gradient.forEach((stop, i) =>
    grd.addColorStop(i / (gradient.length - 1), stop),
  )
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, width, height)

  const texture = gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  return texture
}

export default function GaussianNoiseApp() {
  const width = 800
  const height = 800
  const seed = 12926
  const colorConfiguration = {
    gradient: ['hsl(141 75% 72%)', 'hsl(41 90% 62%)', 'hsl(358 64% 50%)'],
  }
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl', { premultipliedAlpha: false })!
    const program = createProgram(gl, vertexShaderSource, shader)
    gl.useProgram(program)

    // Time state
    const timeStates = Array.from({ length: N_TIME_VALUES }).map(() => ({
      seed,
      lastTime: Date.now(),
      elapsed: 0,
      timeSpeed: 1,
    }))

    const gradientTexture = createGradientTexture(
      gl,
      colorConfiguration.gradient,
    )

    const uniformLoc = (name: string) => gl.getUniformLocation(program, name)

    // Setup quad
    const a_position = gl.getAttribLocation(program, 'a_position')
    const positionBuffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([0, 0, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1]),
      gl.STATIC_DRAW,
    )
    gl.enableVertexAttribArray(a_position)
    gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0)
    gl.uniform1i(uniformLoc('u_gradient'), 0)

    let stop = false
    function render() {
      if (stop) return
      requestAnimationFrame(render)

      const now = Date.now()
      for (let i = 0; i < N_TIME_VALUES; i++) {
        const state = timeStates[i]
        state.elapsed += (now - state.lastTime) * state.timeSpeed
        state.lastTime = now
        const t = state.seed + state.elapsed / 1000
        const loc = uniformLoc(timeKey(i))
        if (loc) gl.uniform1f(loc, t)
      }

      gl.uniform1f(uniformLoc('u_w'), gl.canvas.width)
      gl.uniform1f(uniformLoc('u_h'), gl.canvas.height)

      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, gradientTexture)

      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
    }

    render()
    return () => {
      stop = true
    }
  }, [width, height, seed, colorConfiguration.gradient])

  return <canvas ref={canvasRef} width={width} height={height} />
}
