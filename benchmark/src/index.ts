import {readFile, writeFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {dirname, join} from 'node:path'
import {GetFitness} from 'shared/src/fitness-calculator'
import {Rasterizer as RustRasterizer} from 'larry-rasterizer'
import {loadImage} from './loadImage.js'
import {buildDna} from './buildDna.js'
import {mulberry32} from './seededRandom.js'
import {bench, BenchResult} from './runner.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..')
const TEST_IMAGES_DIR = join(REPO_ROOT, 'test-images')
const BASELINE_PATH = join(__dirname, '..', 'baseline.json')

const IMAGES = ['choosen.jpg', 'hourse.jpg']
const SCENARIOS: {size: number; genes: number}[] = [
  {size: 64, genes: 20},
  {size: 128, genes: 50},
  {size: 256, genes: 100},
  {size: 256, genes: 250},
]

type Baseline = Record<string, {fitness: number}>

async function loadBaseline(): Promise<Baseline> {
  try {
    return JSON.parse(await readFile(BASELINE_PATH, 'utf8'))
  } catch {
    return {}
  }
}

async function main() {
  const updateBaseline = process.argv.includes('--update-baseline')
  const baseline = await loadBaseline()
  const nextBaseline: Baseline = {}
  type Row = {
    scenario: string
    jsResult: BenchResult
    wasmResult: BenchResult
  }
  const rows: Row[] = []
  const correctnessFailures: string[] = []

  for (const imageName of IMAGES) {
    for (const {size, genes} of SCENARIOS) {
      const image = await loadImage(
        join(TEST_IMAGES_DIR, imageName),
        size,
        size,
      )
      const rng = mulberry32(0xc0ffee ^ size ^ (genes << 8))
      const dna = buildDna(rng, genes, image.width, image.height)
      const scenario = `${imageName.padEnd(12)} ${size}x${size}  ${String(genes).padStart(3)} genes`

      const jsResult = bench(scenario + ' [js  ]', () => GetFitness(dna, image))

      const rust = new RustRasterizer(
        image.width,
        image.height,
        image.data as unknown as Uint8Array,
      )
      const wasmResult = bench(scenario + ' [wasm]', () =>
        rust.get_fitness(dna.genes),
      )
      rust.free()

      rows.push({scenario, jsResult, wasmResult})
      nextBaseline[scenario] = {fitness: jsResult.fitness}

      const fitnessDrift = Math.abs(jsResult.fitness - wasmResult.fitness)
      if (fitnessDrift > 1e-3) {
        correctnessFailures.push(
          `${scenario}: js=${jsResult.fitness.toFixed(4)} vs wasm=${wasmResult.fitness.toFixed(4)} (drift ${fitnessDrift.toFixed(4)})`,
        )
      }

      const recorded = baseline[scenario]?.fitness
      if (!updateBaseline && recorded != null) {
        const drift = Math.abs(recorded - jsResult.fitness)
        if (drift > 1e-6) {
          correctnessFailures.push(
            `${scenario} (js vs baseline): ${jsResult.fitness} != ${recorded} (drift ${drift})`,
          )
        }
      }
    }
  }

  console.log('')
  console.log(
    'scenario'.padEnd(38) +
      'js ops/s'.padStart(11) +
      'wasm ops/s'.padStart(13) +
      'speedup'.padStart(10) +
      '  fitness',
  )
  console.log('-'.repeat(85))
  for (const r of rows) {
    const speedup = r.wasmResult.opsPerSec / r.jsResult.opsPerSec
    console.log(
      r.scenario.padEnd(38) +
        r.jsResult.opsPerSec.toFixed(1).padStart(11) +
        r.wasmResult.opsPerSec.toFixed(1).padStart(13) +
        (speedup.toFixed(2) + '×').padStart(10) +
        '  ' +
        r.jsResult.fitness.toFixed(4),
    )
  }
  console.log('')

  if (updateBaseline) {
    await writeFile(BASELINE_PATH, JSON.stringify(nextBaseline, null, 2) + '\n')
    console.log(`Wrote baseline to ${BASELINE_PATH}`)
    return
  }

  if (correctnessFailures.length > 0) {
    console.error('CORRECTNESS FAILURES:')
    for (const f of correctnessFailures) console.error('  ' + f)
    process.exit(1)
  }

  if (Object.keys(baseline).length === 0) {
    console.log(
      'No baseline.json found. Run with --update-baseline to record one.',
    )
  } else {
    console.log('All fitness values match baseline and js/wasm agree.')
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
