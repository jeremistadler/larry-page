const fs = require('fs')
const loader = require('@assemblyscript/loader')

const memSizeInBytes = 5 * 5 * 4 * 3
const memory = new WebAssembly.Memory({
  initial: ((memSizeInBytes + 0xffff) & ~0xffff) >>> 16,
})

const hasBigInt64 = typeof BigUint64Array !== 'undefined'
let mem, I8, U8, I16, U16, I32, U32, F32, F64, I64, U64

const checkMem = asModule => {
  if (mem !== asModule.memory.buffer) {
    mem = asModule.memory.buffer
    I8 = new Int8Array(mem)
    U8 = new Uint8Array(mem)
    I16 = new Int16Array(mem)
    U16 = new Uint16Array(mem)
    I32 = new Int32Array(mem)
    U32 = new Uint32Array(mem)
    if (hasBigInt64) {
      I64 = new BigInt64Array(mem)
      U64 = new BigUint64Array(mem)
    }
    F32 = new Float32Array(mem)
    F64 = new Float64Array(mem)
  }
}

const getString = (asModule, ptr) => {
  checkMem(asModule)
  const dataLength = U32[ptr >>> 2]
  let dataOffset = (ptr + 4) >>> 1
  let dataRemain = dataLength
  const parts = []
  const chunkSize = 1024
  while (dataRemain > chunkSize) {
    let last = U16[dataOffset + chunkSize - 1]
    let size = last >= 0xd800 && last < 0xdc00 ? chunkSize - 1 : chunkSize
    let part = U16.subarray(dataOffset, (dataOffset += size))
    parts.push(String.fromCharCode.apply(String, part))
    dataRemain -= size
  }
  return (
    parts.join('') +
    String.fromCharCode.apply(
      String,
      U16.subarray(dataOffset, dataOffset + dataRemain),
    )
  )
}

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

module.exports = {
  wasm,
  memory,
}
