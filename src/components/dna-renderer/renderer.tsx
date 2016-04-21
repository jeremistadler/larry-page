import * as React from 'react';
import { Raster } from '../../scripts/raster';
import { Utils } from '../../scripts/utils';
import { DnaApi } from '../../scripts/api';
import { RenderConfig } from '../../scripts/shared';
import { Dna, ISettings } from '../../scripts/dna';
import { GeneMutator } from '../../scripts/gene-mutator';
import { JsRasterizer } from '../../scripts/rasterizer';
import DnaImage from '../dna-image/dna-image';

interface RasterizerProps { };
interface RasterizerState {
  settings: ISettings;
  width: number;
  height: number;
  dna: Dna;
};

declare var fetch: any;

class DnaRenderer extends React.Component<RasterizerProps, RasterizerState> {
  rasterizer: JsRasterizer;

  constructor(props, context) {
    super(props, context);
    this.state = {
        width: 200,
        height: 200,
        dna: null,
        settings: {
            minGridSize: 1,
            maxGridSize: 3,

            newMinOpacity: 0.1,
            newMaxOpacity: 1,

            autoAdjustMutatorWeights: true,
            mutatorWeights: Utils.CreateNumberArray(GeneMutator.GeneMutators.length),
            iterations: 50
        }
    };
}

componentWillMount(){
    DnaApi.fetchRandomDna().then(dna => {
        this.changeSourceDna(dna);
    })
}

dnaUpdated(dna: Dna) {
    var ratioW = 500 / dna.Organism.Width;
    var ratioH = 300 / dna.Organism.Height;
    var ratio = ratioW < ratioH?ratioW:ratioH;

    var width = dna.Organism.Width * ratio;
    var height = dna.Organism.Height * ratio;

    this.setState({
        settings: this.state.settings,
        width: width,
        height: height,
        dna: dna
    });
}

changeSourceDna(dna: Dna){
    this.dnaUpdated(dna);

    var imageUrl = RenderConfig.imageBaseUrl + '/' + dna.Organism.ImagePath;
    DnaApi.loadAndScaleImageData(imageUrl, RenderConfig.globalWidth, RenderConfig.globalHeight).then(image => {
        //if(window.devicePixelRatio) return;
        this.rasterizer = new JsRasterizer(image, dna, this.state.settings);
        this.rasterizer.onFrameCompleted.push((dna) => {
            this.dnaUpdated(dna);
        });
    }).catch(() => {
        this.componentWillMount();
    });
}

  render() {
    var { width, height, dna, settings } = this.state;

    if (!dna) dna = Utils.createDna(0, '');

    return (
        <div className="renderer-container">
            <div className="renderer-inner-container">
            <p className="renderer-header">Currently rendering</p>
            <div className="renderer-image" >
                <DnaImage dna={dna} width={width} height={height} />
            </div>
            <div className="renderer-text-container">
                <p>Generation: <span className="renderer-value-text">{dna.Generation}</span></p>
                <p>Mutation: <span className="renderer-value-text">{dna.Mutation}</span></p>
                <p>Fitness: <span className="renderer-value-text">{dna.Fitness}</span></p>
                <p>Weights: <span className="renderer-value-text">{settings.mutatorWeights.map(f => Math.round(f * 10) / 10).join(', ')}</span></p>
            </div>
            </div>
        </div>
    );
  }
}

export default DnaRenderer;
