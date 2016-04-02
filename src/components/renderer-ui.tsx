import * as React from 'react';
import { Raster } from '../scripts/raster';
import { Utils } from '../scripts/utils';
import { RenderConfig } from '../scripts/shared';
import { Dna, ISettings } from '../scripts/dna';
import { GeneMutator } from '../scripts/gene-mutator';
import { JsRasterizer } from '../scripts/rasterizer';
import DnaImage from './dna-image';

interface RasterizerProps {
    dna: Dna;
};
interface RasterizerState {
  settings: ISettings;
  width: number;
  height: number;
};

declare var fetch: any;

class DnaRenderer extends React.Component<RasterizerProps, RasterizerState> {
    rasterizer: JsRasterizer;

  constructor(props, context) {
    super(props, context);
    this.state = {
        width: 200,
        height: 200,
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

componentWillReceiveProps(newProps, context)
{
    if (!newProps.dna) return;
    if (this.props.dna && this.props.dna.Organism.Id === newProps.dna.Organism.Id)
        return;
    var dna: Dna = newProps.dna;
    Utils.loadAndScaleImageData(RenderConfig.imageBaseUrl + '/' + dna.Organism.ImagePath, RenderConfig.globalWidth, RenderConfig.globalHeight, (image, sourceImageCanvas) => {
        this.rasterizer = new JsRasterizer(image, dna, this.state.settings);

        this.rasterizer.onFrameCompleted.push((dna) => {
            this.setState({
                settings: this.state.settings,
                width:  this.state.width,
                height: this.state.height,
            })
        });
    });
}

  render() {
    const { dna } = this.props;
    const { width, height } = this.state;

    return (
        <div>
            <span>Settings will come here</span>
            <DnaImage dna={dna} width={width} height={height} />
        </div>
    );
  }
}

export default DnaRenderer;
