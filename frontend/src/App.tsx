import * as React from 'react'
import DnaGrid from './dna-grid/grid'
import DnaRenderer from './dna-renderer/renderer'
import Uploader from './uploader/uploader'
import {Provider} from 'react-redux'
import {createStore} from 'redux'
import {rootReducer} from './scripts/reducers'
import './form.css'

const store = createStore(rootReducer, {})

const App = () => (
  <Provider store={store}>
    <>
      <DnaRenderer />
      <Uploader />
      <DnaGrid />
    </>
  </Provider>
)

export default App
