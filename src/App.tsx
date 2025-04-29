import { useEffect, useRef, useState } from 'react'
import { noiseUtils, simplexNoise } from './shader'
import { useControls } from 'leva'

const shader = `
precision highp float;

uniform float u_time;
uniform sampler2D u_gradient;
uniform float u_xScale;
uniform float u_xPos;
uniform float u_yPos;
uniform float u_yScale;
uniform float u_L;
uniform float u_F;
uniform float u_S;

${noiseUtils}
${simplexNoise}

void main() {
  vec3 red  = vec3(1.0, 0.0, 0.0);
  vec3 blue = vec3(0.0, 0.0, 1.0);

  float x = (gl_FragCoord.x + u_xPos) * u_xScale;
  float y = (gl_FragCoord.y + u_yPos) * u_yScale;

  float sum = 0.5;
  sum += simplex_noise(vec3(x * u_L * 1.0 +  u_F * 1.0, y * u_L * 1.00, u_time * u_S)) * 0.30;
  sum += simplex_noise(vec3(x * u_L * 0.6 +  -u_F * 0.6, y * u_L * 0.85, u_time * u_S)) * 0.26;
  sum += simplex_noise(vec3(x * u_L * 0.4 +  u_F * 0.8, y * u_L * 0.70, u_time * u_S)) * 0.22;

  float t = clamp(sum, 0.0, 1.0);
  gl_FragColor = texture2D(u_gradient, vec2(t, 0.5));
}
`

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
  const [seed] = useState(Math.random() * 10000)
  const { scale, speed, position, f } = useControls({
    position: { value: { x: 0, y: 0 }, step: 5 },
    scale: {
      value: 3,
      min: 0.0000001,
      max: 100,
      step: 0.0001,
    },
    speed: {
      value: 0.05,
      min: 0.0000001,
      max: 1,
      step: 0.0001,
    },
    f: {
      value: 0.01,
      min: 0.0000001,
      max: 1,
      step: 0.0001,
    },
  })

  const yPos = -position.y
  const xPos = position.x

  const colorConfiguration = {
    gradient: [
      '#060607',
      '#201847',
      '#362A7A',
      '#33A6C7',
      '#BC00B7',
      '#6C00A0',
    ],
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
    gl.uniform1f(uniformLoc('u_xScale'), scale)
    gl.uniform1f(uniformLoc('u_yScale'), scale)
    gl.uniform1f(uniformLoc('u_xPos'), xPos)
    gl.uniform1f(uniformLoc('u_yPos'), yPos)
    gl.uniform1f(uniformLoc('u_L'), 0.0015)
    gl.uniform1f(uniformLoc('u_F'), f)
    gl.uniform1f(uniformLoc('u_S'), speed)

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
  }, [
    width,
    height,
    seed,
    colorConfiguration.gradient,
    scale,
    xPos,
    yPos,
    f,
    speed,
  ])

  return <canvas ref={canvasRef} width={width} height={height} />
}
