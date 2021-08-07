import {Dna} from '../../../shared/src/dna'

function rollingAvg(old: number, newValue: number, partOfNew: number) {
  return old * (1 - partOfNew) + newValue * partOfNew
}

export function createRenderStats() {
  let lastDnaUpdateTime = 0
  let lastDnaGenerations = 0
  let lastFitness = 0
  let generationsPerSecond = 0
  let fitnessPerSecond = 0

  return {
    update(updatedDna: Dna) {
      const now = Date.now()

      if (lastDnaUpdateTime === 0 && updatedDna) {
        lastDnaUpdateTime = now
        lastDnaGenerations = updatedDna.testedPlacements
        lastFitness = updatedDna.fitness
      } else if (updatedDna) {
        const secondsPassed = (now - lastDnaUpdateTime) / 1000

        if (secondsPassed > 0) {
          generationsPerSecond = rollingAvg(
            generationsPerSecond,
            (updatedDna.testedPlacements - lastDnaGenerations) / secondsPassed,
            0.1,
          )

          fitnessPerSecond = rollingAvg(
            fitnessPerSecond,
            (lastFitness - updatedDna.fitness) / secondsPassed,
            0.1,
          )

          lastDnaUpdateTime = now
          lastDnaGenerations = updatedDna.testedPlacements
          lastFitness = updatedDna.fitness
        }
      }
    },
  }
}
