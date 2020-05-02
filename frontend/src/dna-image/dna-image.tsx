import * as React from 'react'
import {Dna} from './../scripts/dna'
import './dna-image.css'

interface DnaImageProps {
  dna: Dna
  width: number
  height: number
}
interface DnaImageState {}

class DnaImage extends React.Component<DnaImageProps, DnaImageState> {
  organismId: number = 0
  mutation: number = 0

  shouldComponentUpdate(nextProps: any, nextState: any) {
    return (
      this.props.dna == null ||
      nextProps.dna == null ||
      this.organismId !== nextProps.dna.Organism.Id ||
      this.mutation !== nextProps.dna.Mutation ||
      this.props.width !== nextProps.width ||
      this.props.height !== nextProps.height
    )
  }

  componentWillUpdate(newProps: any, newState: any) {
    if (!newProps.dna) return
    this.organismId = newProps.dna.Organism.Id
    this.mutation = newProps.dna.Mutation
  }

  render() {
    const {dna, height, width} = this.props

    if (!dna || !dna.Genes) {
      var style = {
        width: width + 'px',
        height: height + 'px',
        display: 'inline-block',
      }
      return <div style={style}></div>
    }

    var animationLength = 5
    var lengthPerPoly = animationLength / dna.Genes.length

    var polygons = dna.Genes.map((gene, i) => {
      var str = ''
      for (let i = 0; i < gene.Pos.length; i += 2)
        str += gene.Pos[i] * width + ',' + gene.Pos[i + 1] * height + ' '

      var color =
        'rgba(' +
        Math.floor(gene.Color[0] * 255) +
        ',' +
        Math.floor(gene.Color[1] * 255) +
        ',' +
        Math.floor(gene.Color[2] * 255) +
        ',' +
        gene.Color[3] +
        ')'

      var style = {
        fill: color,
        stroke: 'rgba(0, 0, 0, 0.05)',
        strokeWidth: 0,
        animationDelay: i * lengthPerPoly + 's',
      }
      return <polygon points={str} style={style} key={i} />
    })

    return (
      <svg height={height} width={width}>
        {polygons}
      </svg>
    )
  }
}

export default DnaImage
