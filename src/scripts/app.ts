import { Raster } from './raster';
import { Utils } from './utils';
import { RenderConfig } from './shared';
import { Dna, ISettings } from './dna';
import { GeneMutator } from './gene-mutator';
import { JsRasterizer } from './rasterizer';

Utils.getRandomDna(RenderConfig.baseUrl, function (dna) {
    Utils.loadAndScaleImageData(RenderConfig.imageBaseUrl + '/' + dna.Organism.ImagePath, RenderConfig.globalWidth, RenderConfig.globalHeight, function (image, sourceImageCanvas) {

        var previewCanvas = document.createElement('canvas');
        previewCanvas.width = sourceImageCanvas.width;
        previewCanvas.height = sourceImageCanvas.height;
        var previewCtx = <CanvasRenderingContext2D>previewCanvas.getContext('2d', { alpha: false });

        var settings = {
            minGridSize: 1,
            maxGridSize: 3,

            newMinOpacity: 0.1,
            newMaxOpacity: 1,

            autoAdjustMutatorWeights: true,
            mutatorWeights: Utils.CreateNumberArray(GeneMutator.GeneMutators.length),
            iterations: 50
        };

        var rasterizer = new JsRasterizer(image, dna, settings);

        var form = new Form().AddToBody();

        new Group(settings)
            .AddHeader('Original Image')
            .AddCanvas(sourceImageCanvas)
            .AddToForm(form);

        new Group(settings)
            .AddHeader('Preview')
            .AddCanvas(previewCanvas)
            .AddToForm(form);

        new Group(settings)
            .AddHeader('Iterations')
            .AddSlider('Iterations: {0}', 1, 400, 1, s => s.iterations, (s, v) => { s.iterations = v })
            .AddToForm(form);

        new Group(settings)
            .AddHeader('New Triangle Opacity')
            .AddSlider('Min: {0}', 0.1, 1, 0.01, s => s.newMinOpacity, (s, v) => { s.newMinOpacity = Math.min(Utils.ClampFloat(v), s.newMaxOpacity) })
            .AddSlider('Max: {0}', 0.1, 1, 0.01, s => s.newMaxOpacity, (s, v) => { s.newMaxOpacity = Math.max(Utils.ClampFloat(v), s.newMinOpacity) })
            .AddToForm(form);

        new Group(settings)
            .AddHeader('Thread Grid Size')
            .AddSlider('Min: {0}', 1, 10, 1, s => s.minGridSize, (s, v) => { s.minGridSize = Math.min(Utils.Clamp(v, 1, 10), s.maxGridSize) })
            .AddSlider('Max: {0}', 1, 10, 1, s => s.maxGridSize, (s, v) => { s.maxGridSize = Math.max(Utils.Clamp(v, 1, 10), s.minGridSize) })
            .AddToForm(form);

        var mutatorGroup = new Group(settings)
            .AddHeader('Mutators')
            .AddCheckbox('Auto', s => s.autoAdjustMutatorWeights, (s, v) => s.autoAdjustMutatorWeights = v)
            .AddToForm(form);

        for (var i = 0; i < GeneMutator.GeneMutators.length; i++)
            (function (index) {
                mutatorGroup.AddSlider(GeneMutator.GeneMutators[i].name + ': {0}', 0, 3000, 10, s => GeneMutator.GeneMutators[index].effectiveness, (s, v) => { GeneMutator.GeneMutators[index].effectiveness = v });
            })(i)

        new Group(settings)
            .AddHeader('Actions')
            .AddButton('Reset DNA', () => { rasterizer.clearNextRound = true })
            .AddToForm(form);

        form.AddButton('Noop', () => { });

        rasterizer.onFrameStarted.push(function (dna) {
            rasterizer.drawPreview(previewCtx);

            for (var i = 0; i < form.groups.length; i++)
                for (var ii = 0; ii < form.groups[i].onConfigUpdate.length; ii++)
                    form.groups[i].onConfigUpdate[ii]();
        });

        rasterizer.onFrameCompleted.push(function (dna) {

        });
    });
});

class Form {
    formElm = document.createElement('div');
    groups: Group[] = [];

    constructor() {
        this.formElm.classList.add('form');
    }

    AddToBody(): Form {
        document.body.appendChild(this.formElm);
        return this;
    }

    AddButton(text: string, action): Form {
        var elm = document.createElement('input');

        elm.type = 'button';
        elm.value = text;
        elm.onclick = e => {
            action();
        };

        elm.classList.add('form-button');
        this.formElm.appendChild(elm);

        return this;
    }
}

class Group {
    groupElm = document.createElement('div');
    onConfigUpdate = [];

    constructor(public config) {
        this.groupElm.classList.add('form-group');
    }

    AddHeader(text: string): Group {
        var elm = document.createElement('header');
        elm.innerHTML = text;
        this.groupElm.appendChild(elm);

        return this;
    }

    AddCanvas(canvas: HTMLCanvasElement): Group {
        this.groupElm.appendChild(canvas);
        return this;
    }

    AddButton(text: string, action): Group {
        var elm = document.createElement('input');

        elm.type = 'button';
        elm.value = text;
        elm.onclick = e => {
            action();
        };

        elm.classList.add('group-button');
        this.groupElm.appendChild(elm);

        return this;
    }

    AddCheckbox(text: string, readSettings: (settings: ISettings) => boolean, writeSettings: (settings: ISettings, value: boolean) => void): Group {
        var group = document.createElement('div');
        var elm = document.createElement('input');
        var elmLabel = document.createElement('label');

        elm.type = 'checkbox';
        elm.checked = readSettings(this.config);
        elm.onchange = e => {
            writeSettings(this.config, (<HTMLInputElement> e.target).checked);
            elmLabel.innerHTML = text.replace('{0}', readSettings(this.config).toString());
        };

        var elmLabel = document.createElement('label');

        this.onConfigUpdate.push(() => {
            var val = readSettings(this.config)
            elm.checked = val;
            elmLabel.innerHTML = text.replace('{0}', val.toString());
        });

        group.classList.add('input-group', 'form-checkbox-group');
        group.appendChild(elmLabel);
        group.appendChild(elm);
        this.groupElm.appendChild(group);

        return this;
    }

    AddSlider(text: string, min: number, max: number, step: number, readSettings: (settings: ISettings) => any, writeSettings: (settings: ISettings, value: any) => void): Group {
        var group = document.createElement('div');
        var elm = document.createElement('input');
        var elmLabel = document.createElement('label');

        elm.type = 'range';
        elm.min = min.toString();
        elm.max = max.toString();
        elm.step = step.toString();
        elm.oninput = e => {
            writeSettings(this.config, parseFloat(elm.value));
        };
        this.onConfigUpdate.push(() => {
            var val = readSettings(this.config) || 0
            elm.value = val;
            elmLabel.innerHTML = text.replace('{0}', val.toFixed(2));
        });

        group.classList.add('input-group');
        group.appendChild(elmLabel);
        group.appendChild(elm);
        this.groupElm.appendChild(group);

        return this;
    }

    AddToBody(): Group {
        document.body.appendChild(this.groupElm);
        return this;
    }

    AddToForm(form: Form): Group {
        form.formElm.appendChild(this.groupElm);
        form.groups.push(this);
        return this;
    }
}
