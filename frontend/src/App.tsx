import * as React from 'react'
import DnaGrid from './dna-grid/grid'
import DnaRenderer from './dna-renderer/renderer'
import Uploader from './uploader/uploader'
import './form.css'
import {Dna} from 'shared/src/dna'
import {DnaApi} from './scripts/api'

const App = () => {
  let [dna, setDna] = React.useState<Dna | null>(null)

  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const dnaId = urlParams.get('dna')

    if (dnaId) DnaApi.fetchDnaById(dnaId).then(dna => setDna(dna))
    else DnaApi.fetchRandomDna().then(dna => setDna(dna))
  }, [])

  // React.useEffect(() => {
  //   const createSemaphore = (max: number) => {
  //     let active = 0
  //     let waitingList: {fn: () => Promise<any>; resolver: () => void}[] = []
  //     const next = () => {
  //       if (active >= max) return
  //       if (waitingList.length === 0) return
  //       const waitingItem = waitingList.pop()
  //       if (waitingItem == null) return
  //       waitingItem.resolver()
  //       active++
  //       waitingItem.fn().finally(() => {
  //         active--
  //         next()
  //       })
  //     }
  //     return (fn: () => Promise<any>) => {
  //       return new Promise(resolver => {
  //         waitingList.push({fn, resolver})
  //         next()
  //       })
  //     }
  //   }
  //   const saveLock = createSemaphore(5)
  //   ;(async () => {
  //     let cursor: any = undefined
  //     while (true) {
  //       const toUpdate = await DnaApi.fetchDnaToUpdate(cursor)
  //       console.log('toUpdate', toUpdate.keys)
  //       cursor = toUpdate.cursor

  //       for (const item of toUpdate.dnaList) {
  //         const imageData = await DnaApi.loadAndScaleImageData(item, 128, 128)
  //         item.lastRenderSize = 128
  //         item.fitness = GetFitness(item, imageData)
  //         for (const gene of item.genes) {
  //           delete gene.Pos
  //           delete gene.Color
  //         }
  //         await saveLock(() => DnaApi.saveDna(item))
  //       }

  //       if (toUpdate.keys.list_complete) break
  //     }
  //   })()
  // }, [])

  const setDnaAndUrl = (dna: Dna) => {
    const urlParams = new URLSearchParams(window.location.search)
    urlParams.set('dna', dna.id)

    const newurl =
      window.location.protocol +
      '//' +
      window.location.host +
      window.location.pathname +
      '?' +
      urlParams.toString()

    window.history.pushState({path: newurl}, '', newurl)

    setDna(dna)
  }

  return (
    <>
      <DnaRenderer key={dna?.id} dna={dna} />
      <Uploader onUploaded={setDnaAndUrl} />
      <DnaGrid onChangeDna={setDnaAndUrl} />
    </>
  )
}

export default App
