export interface BenchResult {
  name: string
  opsPerSec: number
  nsPerOp: number
  iterations: number
  fitness: number
}

export function bench(
  name: string,
  fn: () => number,
  opts: {warmupMs?: number; runMs?: number} = {},
): BenchResult {
  const warmupMs = opts.warmupMs ?? 200
  const runMs = opts.runMs ?? 1500

  let lastFitness = 0
  const warmupEnd = performance.now() + warmupMs
  while (performance.now() < warmupEnd) lastFitness = fn()

  let iterations = 0
  const start = performance.now()
  const end = start + runMs
  while (performance.now() < end) {
    lastFitness = fn()
    iterations++
  }
  const elapsedMs = performance.now() - start

  const opsPerSec = (iterations / elapsedMs) * 1000
  const nsPerOp = (elapsedMs * 1e6) / iterations

  return {name, opsPerSec, nsPerOp, iterations, fitness: lastFitness}
}
