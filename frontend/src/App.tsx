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
    DnaApi.fetchRandomDna().then(dna => {
      setDna(dna)
    })
  }, [])

  return (
    <>
      <DnaRenderer dna={dna} />
      <Uploader onUploaded={setDna} />
      <DnaGrid onChangeDna={setDna} />
    </>
  )
}

export default App
