const fs = require('fs')
const loader = require('@assemblyscript/loader')

module.exports = function initTest(SIZE) {
  const scanlineBytes = SIZE * 2
  const pixelDataBytes = SIZE * SIZE * 3 * 4
  const memSizeInBytes = 255 * 255 * 4 * 4 + 255 * 2 * 100 //  pixelDataBytes + scanlineBytes

  console.log('Memory size', memSizeInBytes, 'bytes')

  const memory = new WebAssembly.Memory({
    initial: ((memSizeInBytes + 0xffff) & ~0xffff) >>> 16,
  })

  const wasm = loader.instantiateSync(
    fs.readFileSync(__dirname.replace('/tests', '') + '/build/untouched.wasm'),
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
