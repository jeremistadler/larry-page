import {readFile, writeFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {dirname, join} from 'node:path'
import {GetFitness} from 'shared/src/fitness-calculator'
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
  const results: BenchResult[] = []
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
      const name = `${imageName.padEnd(12)} ${size}x${size}  ${String(genes).padStart(3)} genes`

      const result = bench(name, () => GetFitness(dna, image))
      results.push(result)
      nextBaseline[name] = {fitness: result.fitness}

      const recorded = baseline[name]?.fitness
      if (!updateBaseline && recorded != null) {
        const drift = Math.abs(recorded - result.fitness)
        if (drift > 1e-6) {
          correctnessFailures.push(
            `${name}: fitness ${result.fitness} != baseline ${recorded} (drift ${drift})`,
          )
        }
      }
    }
  }

  console.log('')
  console.log(
    'scenario'.padEnd(36) +
      'ops/sec'.padStart(12) +
      'ms/op'.padStart(12) +
      'iters'.padStart(10) +
      '  fitness',
  )
  console.log('-'.repeat(80))
  for (const r of results) {
    console.log(
      r.name.padEnd(36) +
        r.opsPerSec.toFixed(1).padStart(12) +
        (r.nsPerOp / 1e6).toFixed(3).padStart(12) +
        String(r.iterations).padStart(10) +
        '  ' +
        r.fitness.toFixed(4),
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
    console.log('All fitness values match baseline.')
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
