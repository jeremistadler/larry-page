import _ from 'lodash'

function ensure_bounds(vec, bounds) {
  const vec_new = []
  for (let i of _.range(vec.length)) {
    if (vec[i] < bounds[i][0]) {
      vec_new.push(bounds[i][0])
    } else if (vec[i] > bounds[i][1]) {
      vec_new.push(bounds[i][1])
    } else vec_new.push(vec[i])
  }

  return vec_new
}

async function main(
  cost_func,
  bounds,
  popsize,
  mutate,
  recombination,
  maxiter,
  onGeneration,
) {
  //--- INITIALIZE A POPULATION (step #1) ----------------+

  const population = []
  for (let i in _.range(popsize)) {
    let indv = []
    for (let j in _.range(bounds.length)) {
      // indv.push(_.random(bounds[j][0],bounds[j][1]))
      // indv.push(_.random(bounds[j][0],bounds[j][1], true))
      indv.push(bounds[j][0] + Math.random() * (bounds[j][1] - bounds[j][0]))
    }
    population.push(indv)
  }

  console.log('first pop', [...population])

  //--- SOLVE --------------------------------------------+

  let gen_scores = [] // score keeping

  // cycle through each generation (step #2)
  for (let i in _.range(maxiter + 1)) {
    console.log('GENERATION:', i)
    gen_scores.length = 0

    // cycle through each individual in the population
    for (let j in _.range(popsize)) {
      //--- MUTATION (step #3.A) ---------------------+

      // select three random vector index positions [0, popsize), not including current vector (j)
      let canidates = _.range(popsize)
      canidates.splice(j, 1)
      let random_index = _.sampleSize(canidates, 3)

      let x_1 = population[random_index[0]]
      let x_2 = population[random_index[1]]
      let x_3 = population[random_index[2]]
      let x_t = population[j] // target individual

      // subtract x3 from x2, and create a new vector (x_diff)
      let x_diff = _.zip(x_3, x_2).map(e => e[0] - e[1])

      // multiply x_diff by the mutation factor (F) and add to x_1
      let v_donor = _.zip(x_1, x_diff).map(e => e[0] + mutate * e[1])
      v_donor = ensure_bounds(v_donor, bounds)

      //--- RECOMBINATION (step #3.B) ----------------+

      let v_trial = []
      for (let k in _.range(x_t.length)) {
        let crossover = Math.random()
        if (crossover <= recombination) {
          v_trial.push(v_donor[k])
        } else {
          v_trial.push(x_t[k])
        }
      }

      //--- GREEDY SELECTION (step #3.C) -------------+

      let score_trial = cost_func(v_trial)
      let score_target = cost_func(x_t)

      if (score_trial < score_target) {
        population[j] = v_trial
        gen_scores.push(score_trial)
        console.log('improved score by', score_target - score_trial)
      } else {
        // console.log('   >', score_target, x_t)
        gen_scores.push(score_target)
      }
    }

    console.log(gen_scores)

    await onGeneration(population[gen_scores.indexOf(_.min(gen_scores))])
  }
  //--- SCORE KEEPING --------------------------------+

  let gen_avg = _.sum(gen_scores) / popsize // current generation avg. fitness
  let gen_best = _.min(gen_scores) // fitness of best individual
  let gen_sol = population[gen_scores.indexOf(gen_best)] // solution of best individual

  console.log(' > GENERATION AVERAGE:', gen_avg)
  console.log(' > GENERATION BEST:', gen_best)
  console.log(' > BEST SOLUTION:', gen_sol)

  return gen_sol
}

export function findGlobalMinima(cost_func, featureCount, onGeneration) {
  const popsize = 100 // Population size, must be >= 4
  const mutate = 0.5 // Mutation factor [0,2]
  const recombination = 0.7 // Recombination rate [0,1]
  const maxiter = 10 // Max number of generations (maxiter)
  const bounds = Array.from({length: featureCount}).map(() => [0.1, 0.9])

  return main(
    cost_func,
    bounds,
    popsize,
    mutate,
    recombination,
    maxiter,
    onGeneration,
  )
}
