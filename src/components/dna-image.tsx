import * as React from 'react';
import {Dna} from '../scripts/dna';


interface DnaImageProps {
    dna: Dna;
    width: number;
    height: number;
};
interface DnaImageState {
};

class DnaImage extends React.Component<DnaImageProps, DnaImageState> {
  constructor(props, context) {
    super(props, context);
    this.state = { };
  }

  render() {
    const { dna, height, width } = this.props;

    if (!dna || !dna.Genes) return (<div>Empty Dna</div>)

    var polygons = dna.Genes.map((gene, i) => {
        var str = '';
        for (let i = 0; i < gene.Pos.length; i += 2)
            str += (gene.Pos[i] * width) + ',' + (gene.Pos[i + 1] * height) + ' ';

        var color = 'rgba(' + Math.floor(gene.Color[0] * 255) + ',' +
                              Math.floor(gene.Color[1] * 255) + ',' +
                              Math.floor(gene.Color[2] * 255) + ',' +
                              gene.Color[3] + ')';
        var style = {
            fill: color,
            stroke: 'rgba(0, 0, 0, 0.05)',
            strokeWidth: 1
        }
        return <polygon points={str} style={style} key={i} />
    });

    return (
        <svg height={height} width={width}>
            {polygons}
        </svg>
    );
  }
}

export default DnaImage;
