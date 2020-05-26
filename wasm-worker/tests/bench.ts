import {FitnessCalculator} from 'shared/src/fitness-calculator'
const benchmark = require('nodemark')
import {Dna, Gene} from 'shared/src/dna'
import {renderDnaWasm} from './scanlineRenderDna'

const dna: Dna = {
  fitness: 10,
  genes: new Array(50),
  generation: 0,
  mutation: 0,
  organism: {
    id: 'test',
    width: 256,
    height: 256,
  },
}

let randomSeed = 1
function random() {
  var x = Math.sin(randomSeed++) * 10000
  return x - Math.floor(x)
}

for (var i = 0; i < dna.genes.length; i++) {
  var gene: Gene = (dna.genes[i] = {
    color: [random(), random(), random(), random() * 0.8 + 0.2],
    pos: new Array(6),
  })
  for (var q = 0; q < gene.pos.length; q++) gene.pos[q] = random()
}

const imageData: ImageData = {
  width: 256,
  height: 256,
  data: new Uint8ClampedArray(256 * 256 * 4),
}

console.log('Benching WASM')
console.log(
  benchmark(() => {
    renderDnaWasm(dna)
  }),
)

console.log('Benching JS renderer:')
console.log(
  benchmark(() => {
    FitnessCalculator.GetFitness(dna, imageData)
  }),
)
