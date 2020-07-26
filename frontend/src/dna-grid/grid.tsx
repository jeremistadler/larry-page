import * as React from 'react'
import {Dna} from 'shared/src/dna'
import {DnaApi} from './../scripts/api'
import {Utils} from 'shared/src/utils'
import DnaImage from '../dna-image/dna-image'
import './grid.css'

const DnaGrid = ({onChangeDna}: {onChangeDna: (dna: Dna) => void}) => {
  const [dnaList, setDnaList] = React.useState<Dna[]>(() =>
    [1, 2, 3, 4, 5, 6, 7, 8].map(f => Utils.createDna(0, f.toString())),
  )

  React.useEffect(() => {
    DnaApi.fetchDnaList().then(response => {
      setDnaList(response)
    })
  }, [])

  const [isVisible, setIsVisible] = React.useState(false)

  React.useEffect(() => {
    setTimeout(() => {
      setIsVisible(true)
    }, 100)
  })

  return (
    <div>
      <ul className="grid">
        {dnaList.map((dna, index) => {
          var ratioW = 300 / dna.sourceImageWidth
          var ratioH = 200 / dna.sourceImageHeight
          var ratio = ratioW < ratioH ? ratioW : ratioH

          var width = dna.sourceImageWidth * ratio
          var height = dna.sourceImageHeight * ratio

          var floatRightStyle = {
            float: 'right',
          } as const

          return (
            <div
              className={
                'grid-image' + (isVisible ? ' grid-image-visible' : '')
              }
              key={dna.id}
              onClick={() => onChangeDna(dna)}>
              <DnaImage dna={dna} width={width} height={height} index={index} />
              <div className="grid-image-info">
                <span>{dna.genes.length} genes</span>
                <span style={floatRightStyle}>{dna.mutation} mutations</span>
              </div>
            </div>
          )
        })}
      </ul>
    </div>
  )
}

export default DnaGrid
