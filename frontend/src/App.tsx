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

  const setDnaAndUrl = (dna: Dna) => {
    const urlParams = new URLSearchParams(window.location.search)
    urlParams.set('dna', dna.organism.id)

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
      <DnaRenderer dna={dna} />
      <Uploader onUploaded={setDnaAndUrl} />
      <DnaGrid onChangeDna={setDnaAndUrl} />
    </>
  )
}

export default App
