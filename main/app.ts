///<reference path="../references.ts" />

var rasterizer = null;


Utils.getRandomDna(baseUrl, function (dna) {
    Utils.loadAndScaleImageData(imageBaseUrl + '/' + dna.Organism.ImagePath, globalWidth, globalHeight, function (image, canvas) {
        document.body.appendChild(canvas);
        canvas.style.width = '200px';
        canvas.style.height = '200px';
        (<any>canvas).style.imageRendering = 'pixelated';

        rasterizer = new JsRasterizer(image, dna);

        var form = new Form().AddToBody();

        new Group({ minOpacity: 0.1, maxOpacity: 1 })
            .AddHeader('New Triangle Opacity')
            .AddSlider('Min: {0}', 'minOpacity', 0.1, 1, 0.01)
            .AddSlider('Max: {0}', 'maxOpacity', 0.1, 1, 0.01)
            .AddToForm(form);

        new Group({ minGridSize: 1, maxGridSize: 7 })
            .AddHeader('Thread Grid Size')
            .AddSlider('Min: {0}', 'minGridSize', 1, 10, 1)
            .AddSlider('Max: {0}', 'maxGridSize', 1, 10, 1)
            .AddToForm(form);


        var mutatorGroup = new Group({ 'temp': 0, auto: true })
            .AddHeader('Mutators')
            .AddCheckbox('Auto: {0}', 'auto')
            .AddToForm(form);

        for (var i = 0; i < GeneMutator.GeneMutators.length; i++)
            mutatorGroup.AddSlider(GeneMutator.GeneMutators[i].name + ': {0}', 'temp', 0, 10000000, 10);

        new Group({ minGridSize: 1, maxGridSize: 7 })
            .AddHeader('Actions')
            .AddButton('Reset DNA', () => { alert('reset') })
            .AddToForm(form);

        form.AddButton('Reset DNA', () => { alert('reset') });
    });
});

class Form {
    formElm = document.createElement('div');

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

        group.classList.add('input-group');
        group.appendChild(elmLabel);
        group.appendChild(elm);
        this.groupElm.appendChild(group);

        return this;
    }

    AddSlider(text: string, configKey: string, min: number, max: number, step: number): CreateGroup {
        var group = document.createElement('div');
        var elm = document.createElement('input');
        var elmLabel = document.createElement('label');

        elm.type = 'range';
        elm.min = min.toString();
        elm.max = max.toString();
        elm.step = step.toString();
        elm.value = this.config[configKey].toString();
        elm.oninput = e => {
            this.config[configKey] = parseFloat(e.target.value);
            elmLabel.innerHTML = text.replace('{0}', this.config[configKey].toFixed(2));
        };

        var elmLabel = document.createElement('label');
        elmLabel.innerHTML = text.replace('{0}', this.config[configKey].toFixed(2));

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
        return this;
    }
}
