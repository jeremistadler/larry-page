const fs = require('fs')
const loader = require('@assemblyscript/loader')

module.exports = function initTest(SIZE, MAX_TRIANGLES) {
  const SRC_COLOR_BUFFER_SIZE = 4 * 4 * MAX_TRIANGLES
  const DEST_COLOR_BUFFER_SIZE = 4 * 4 * MAX_TRIANGLES
  const TRIANGLE_POS_BUFFER_SIZE = 6 * 4 * MAX_TRIANGLES
  const MIN_MAX_BUFFER_SIZE = SIZE * 2 * MAX_TRIANGLES
  const memSizeInBytes =
    MIN_MAX_BUFFER_SIZE +
    SRC_COLOR_BUFFER_SIZE +
    DEST_COLOR_BUFFER_SIZE +
    TRIANGLE_POS_BUFFER_SIZE

  const memPages = ((memSizeInBytes + 0xffff) & ~0xffff) >>> 16
  console.log('Memory size', memSizeInBytes, 'bytes, ', memPages, 'pages')

  const memory = new WebAssembly.Memory({
    initial: 16,
    maximum: 16,
  })

  const wasm = loader.instantiateSync(
    fs.readFileSync(__dirname.replace('/tests', '') + '/build/optimized.wasm'),
    {
      /* imports */
      env: {
        //abort: (msg, file, line) => console.log('Abort!', {msg, file, line}),
        memory,
      },
    },
  )

  return {
    wasm,
    memory,
  }
}
