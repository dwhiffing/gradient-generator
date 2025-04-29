export function createGradientTexture(
  gl: WebGLRenderingContext,
  gradient: string,
): WebGLTexture {
  const canvas = document.createElement('canvas')
  const width = 1000
  const height = 2
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  const grd = ctx.createLinearGradient(0, 0, width, 0)
  const { stops } = parseLinearGradient(gradient)
  stops.forEach((stop) => grd.addColorStop(stop.position ?? 1, stop.color))
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

function parseLinearGradient(input: string): {
  angle: number
  stops: Stop[]
} {
  const linearRegex = /^linear-gradient\s*\(\s*([^,]+),([\s\S]+)\)$/i
  const match = input.trim().match(linearRegex)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, first, _rest] = match ?? []
  let rest = _rest
  let angle = 180
  const angleMatch = first.trim().match(/^([+-]?\d+)(deg)?$/i)

  if (angleMatch) {
    angle = parseFloat(angleMatch[1])
  } else if (/to /.test(first)) {
    const direction = first.trim().toLowerCase()
    const dirMap: Record<string, number> = {
      'to top': 0,
      'to top right': 45,
      'to right': 90,
      'to bottom right': 135,
      'to bottom': 180,
      'to bottom left': 225,
      'to left': 270,
      'to top left': 315,
    }
    angle = dirMap[direction] ?? 180
  } else {
    rest = first + ',' + rest
  }

  const stops: Stop[] = []
  const parts = rest.split(/,(?![^(]*\))/)

  for (const part of parts) {
    const stopMatch = part.trim().match(/^(.*?)(?:\s+([0-9.]+%?))?$/)
    if (!stopMatch) continue
    const color = stopMatch[1].trim()
    const posStr = stopMatch[2]?.trim()

    let position: number | undefined = undefined
    if (posStr) {
      if (posStr.endsWith('%')) {
        position = parseFloat(posStr) / 100
      } else {
        position = parseFloat(posStr)
      }
    }

    stops.push({ color, position })
  }

  return { angle, stops }
}

interface Stop {
  color: string
  position?: number
}
