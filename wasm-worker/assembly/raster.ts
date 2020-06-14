const SIZE: i32 = 255
const SIZEf: f32 = 255
const MAX_TRIANGLES: i32 = 100

@inline
function getMinMaxIndex(
  DATA_POINTER: i32,
  y: i32,
  triangleIndex: i32,
  comp: i32,
): i32 {
  assert(y >= 0, 'getMinMaxIndex y is too low')
  assert(y < SIZE, 'getMinMaxIndex y is too high')

  assert(triangleIndex >= 0, 'getMinMaxIndex triangleIndex is too low')
  assert(
    triangleIndex < MAX_TRIANGLES,
    'getMinMaxIndex triangleIndex is too high',
  )

  assert(comp >= 0, 'getMinMaxIndex comp is too low')
  assert(comp <= 1, 'getMinMaxIndex comp is too high')

  return DATA_POINTER + triangleIndex * MAX_TRIANGLES + y * 2 + comp
}

export function calcMinMax(
  minMaxPointer: i32,
  triangleIndex: i32,

  ax: f32,
  ay: f32,
  bx: f32,
  by: f32,
  cx: f32,
  cy: f32,
): void {
  assert(triangleIndex >= 0, 'calcMinMax triangleIndex is too low')
  assert(triangleIndex < MAX_TRIANGLES, 'calcMinMax triangleIndex is too high')
  assert(ax >= 0 && ax <= SIZEf, 'ax is out of bounds: ' + ax.toString())
  assert(ay >= 0 && ay <= SIZEf, 'ay is out of bounds: ' + ay.toString())
  assert(bx >= 0 && bx <= SIZEf, 'bx is out of bounds: ' + bx.toString())
  assert(by >= 0 && by <= SIZEf, 'by is out of bounds: ' + by.toString())
  assert(cx >= 0 && cx <= SIZEf, 'cx is out of bounds: ' + cx.toString())
  assert(cy >= 0 && cy <= SIZEf, 'cy is out of bounds: ' + cy.toString())

  let maxX: f32 = ax
  if (bx > maxX) maxX = bx
  if (cx > maxX) maxX = cx

  let minX: f32 = ax
  if (bx < minX) minX = bx
  if (cx < minX) minX = cx

  let minY: f32 = ay
  if (by < minY) minY = by
  if (cy < minY) minY = cy

  let maxY: f32 = ay
  if (by > maxY) maxY = by
  if (cy > maxY) maxY = cy

  const polygonWidth: f32 = maxX - minX
  const polygonHeight: f32 = maxY - minY

  if (polygonHeight === 0) return
  if (polygonWidth === 0) return

  scanlineFloat(minMaxPointer, triangleIndex, ax, ay, bx, by, maxY)
  scanlineFloat(minMaxPointer, triangleIndex, cx, cy, ax, ay, maxY)
  scanlineFloat(minMaxPointer, triangleIndex, bx, by, cx, cy, maxY)
}

@inline
function scanlineFloat(
  minMaxPointer: i32,
  triangleIndex: i32,
  x1: f32,
  y1: f32,
  x2: f32,
  y2: f32,
  endY: f32,
): void {
  if (y1 === y2) return

  if (y1 > y2) {
    let tempY: f32 = y1
    let tempX: f32 = x1
    y1 = y2
    y2 = tempY
    x1 = x2
    x2 = tempX
  }

  if (endY < y2) y2 = endY
  //if ( y2 < y1 ) { y2++ }

  if (y1 === y2) return

  let x: f32 = <f32>x1
  var dx: f32 = (<f32>x2 - x) / (<f32>y2 - <f32>y1) // change in x over change in y will give us the gradient
  var row: i32 = <i32>y1 // the offset the start writing at (into the array)

  for (; y1 <= y2; y1++) {
    let xByte1 = x
    if (xByte1 < 0) xByte1 = 0
    if (xByte1 > 255) xByte1 = 255

    const xByte: u8 = <u8>xByte1

    if (
      row >= 0 &&
      load<u8>(getMinMaxIndex(minMaxPointer, row, triangleIndex, 0)) > xByte
    ) {
      store<u8>(getMinMaxIndex(minMaxPointer, row, triangleIndex, 0), xByte)
    }

    if (
      row >= 0 &&
      load<u8>(getMinMaxIndex(minMaxPointer, row, triangleIndex, 1)) < xByte
    ) {
      store<u8>(getMinMaxIndex(minMaxPointer, row, triangleIndex, 1), xByte)
    }

    x += dx
    row++
  }
}

export function rasterizeAtPos(
  SRC_COLOR_BUFFER: i32,
  DEST_COLOR_BUFFER: i32,
  MIN_MAX_BUFFER: i32,

  x: u8,
  y: u8,

  fromTriangle: i32,
  toTriangle: i32,
): void {
  store<f32>(DEST_COLOR_BUFFER + 4 * 0, 1)
  store<f32>(DEST_COLOR_BUFFER + 4 * 1, 1)
  store<f32>(DEST_COLOR_BUFFER + 4 * 2, 1)

  for (var triIndex = fromTriangle; triIndex <= toTriangle; triIndex++) {
    const min: u8 = load<u8>(getMinMaxIndex(MIN_MAX_BUFFER, y, triIndex, 0))
    const max: u8 = load<u8>(getMinMaxIndex(MIN_MAX_BUFFER, y, triIndex, 1))

    if (min <= x && max >= x) {
      drawPixel(SRC_COLOR_BUFFER + triIndex * 4 * 4, DEST_COLOR_BUFFER)
    }
  }
}

function MARKER1(): void {}

function MARKER2(): void {}

@inline
function drawPixel(SRC_COLOR_BUFFER: i32, DEST_COLOR_BUFFER: i32): void {
  const R: f32 = load<f32>(SRC_COLOR_BUFFER + 0 * 4)
  const G: f32 = load<f32>(SRC_COLOR_BUFFER + 1 * 4)
  const B: f32 = load<f32>(SRC_COLOR_BUFFER + 2 * 4)
  const A: f32 = load<f32>(SRC_COLOR_BUFFER + 3 * 4)

  const inverseAlpha: f32 = 1.0 - A

  MARKER1()

  let index: i32 = DEST_COLOR_BUFFER + 0 * 4
  store<f32>(index, A * R + load<f32>(index) * inverseAlpha)

  index = DEST_COLOR_BUFFER + 1 * 4
  store<f32>(index, A * G + load<f32>(index) * inverseAlpha)

  index = DEST_COLOR_BUFFER + 2 * 4
  store<f32>(index, A * B + load<f32>(index) * inverseAlpha)
}

export function calculateFitness(
  SRC_COLOR_BUFFER: i32,
  DEST_COLOR_BUFFER: i32,
  COMPARE_COLOR_BUFFER: i32,
  MIN_MAX_BUFFER: i32,

  fromTriangle: i32,
  toTriangle: i32,
): f32 {
  let fitness: f32 = 0

  for (let y: i32 = 0; y < SIZE; y++) {
    for (let x: i32 = 0; x < SIZE; x++) {
      store<f32>(DEST_COLOR_BUFFER + 4 * 0, 1)
      store<f32>(DEST_COLOR_BUFFER + 4 * 1, 1)
      store<f32>(DEST_COLOR_BUFFER + 4 * 2, 1)

      for (var triIndex = fromTriangle; triIndex <= toTriangle; triIndex++) {
        const min: i32 = <i32>(
          load<u8>(getMinMaxIndex(MIN_MAX_BUFFER, y, triIndex, 0))
        )
        const max: i32 = <i32>(
          load<u8>(getMinMaxIndex(MIN_MAX_BUFFER, y, triIndex, 1))
        )

        if (min <= x && max >= x) {
          drawPixel(SRC_COLOR_BUFFER + triIndex * 4 * 4, DEST_COLOR_BUFFER)
        }
      }

      MARKER2()

      const pixelDiff: f32 =
        NativeMathf.abs(
          load<f32>(DEST_COLOR_BUFFER + 0 * 4) -
            load<f32>(COMPARE_COLOR_BUFFER + ((y * SIZE + x) * 3 + 0) * 4),
        ) +
        NativeMathf.abs(
          load<f32>(DEST_COLOR_BUFFER + 1 * 4) -
            load<f32>(COMPARE_COLOR_BUFFER + ((y * SIZE + x) * 3 + 1) * 4),
        ) +
        NativeMathf.abs(
          load<f32>(DEST_COLOR_BUFFER + 2 * 4) -
            load<f32>(COMPARE_COLOR_BUFFER + ((y * SIZE + x) * 3 + 2) * 4),
        )

      fitness = fitness + pixelDiff * pixelDiff
    }
  }

  return fitness
}

export function calculateFitnessAtPos(
  SRC_COLOR_BUFFER: i32,
  DEST_COLOR_BUFFER: i32,
  COMPARE_COLOR_BUFFER: i32,
  MIN_MAX_BUFFER: i32,

  x: i32,
  y: i32,

  fromTriangle: i32,
  toTriangle: i32,
): f32 {
  store<f32>(DEST_COLOR_BUFFER + 4 * 0, 1)
  store<f32>(DEST_COLOR_BUFFER + 4 * 1, 1)
  store<f32>(DEST_COLOR_BUFFER + 4 * 2, 1)

  for (var triIndex = fromTriangle; triIndex <= toTriangle; triIndex++) {
    const min: i32 = <i32>(
      load<u8>(getMinMaxIndex(MIN_MAX_BUFFER, y, triIndex, 0))
    )
    const max: i32 = <i32>(
      load<u8>(getMinMaxIndex(MIN_MAX_BUFFER, y, triIndex, 1))
    )

    if (min <= x && max >= x) {
      drawPixel(SRC_COLOR_BUFFER + triIndex * 4 * 4, DEST_COLOR_BUFFER)
    }
  }

  const pixelDiff: f32 =
    NativeMathf.abs(
      load<f32>(DEST_COLOR_BUFFER + 0 * 4) -
        load<f32>(COMPARE_COLOR_BUFFER + ((y * SIZE + x) * 3 + 0) * 4),
    ) +
    NativeMathf.abs(
      load<f32>(DEST_COLOR_BUFFER + 1 * 4) -
        load<f32>(COMPARE_COLOR_BUFFER + ((y * SIZE + x) * 3 + 1) * 4),
    ) +
    NativeMathf.abs(
      load<f32>(DEST_COLOR_BUFFER + 2 * 4) -
        load<f32>(COMPARE_COLOR_BUFFER + ((y * SIZE + x) * 3 + 2) * 4),
    )

  return pixelDiff * 2
}
