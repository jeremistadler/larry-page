///<reference path="../references.ts" />

var rasterizer = null;


Utils.getRandomDna(baseUrl, function (dna) {
    Utils.loadAndScaleImageData(imageBaseUrl + '/' + dna.Organism.ImagePath, globalWidth, globalHeight, function (image, canvas) {
        document.body.appendChild(canvas);
        canvas.style.width = '200px';
        canvas.style.height = '200px';
        (<any>canvas).style.imageRendering = 'pixelated';

        var settings = {
            minGridSize: 1,
            maxGridSize: 5,

            newMinOpacity: 0.1,
            newMaxOpacity: 1,

            autoAdjustMutatorWeights: true,
            mutatorWeights: Utils.CreateNumberArray(GeneMutator.GeneMutators.length),
            iterations: 50
        };

        rasterizer = new JsRasterizer(image, dna, settings);

        var form = new Form().AddToBody();

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
            .AddCheckbox('Auto: {0}', 'autoAdjustMutatorWeights')
            .AddToForm(form);

        for (var i = 0; i < GeneMutator.GeneMutators.length; i++)
            (function (index) {
                mutatorGroup.AddSlider(GeneMutator.GeneMutators[i].name + ': {0}', 0, 1000, 10, s => s.mutatorWeights[index], (s, v) => { s.mutatorWeights[index] = v });
            })(i)

        new Group(settings)
            .AddHeader('Actions')
            .AddButton('Reset DNA', () => { rasterizer.clearNextRound = true })
            .AddToForm(form);

        form.AddButton('Noop', () => { });

        rasterizer.onFrameStarted.push(function (dna) {
            for (var i = 0; i < form.groups.length; i++)
                for (var ii = 0; ii < form.groups[i].onConfigUpdate.length; ii++)
                    form.groups[i].onConfigUpdate[ii]();
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

    AddCheckbox(text: string, configKey: string): Group {
        var group = document.createElement('div');
        var elm = document.createElement('input');
        var elmLabel = document.createElement('label');

        elm.type = 'checkbox';
        elm.value = this.config[configKey].toString();
        elm.oninput = e => {
            this.config[configKey] = (<HTMLInputElement> e.target).hasAttribute('checked');
            elmLabel.innerHTML = text.replace('{0}', this.config[configKey]);
        };

        var elmLabel = document.createElement('label');
        elmLabel.innerHTML = text.replace('{0}', this.config[configKey]);

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
