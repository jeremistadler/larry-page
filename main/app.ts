///<reference path="../references.ts" />

var createDna = function(numberOfGenes: number, image: string): Dna {
    var dna = {
        Fitness: Infinity,
        Genes: new Array(numberOfGenes),
        Generation: 0,
        Mutation: 0,
        Organism: {
            Id: 0,
            ImagePath: image,
            GeneCount: numberOfGenes,
            Width: 200,
            Height: 200
        }
    };

    for (var i = 0; i < numberOfGenes; i++) {
        var gene = dna.Genes[i] = {
            Color: [Math.random(), Math.random(), Math.random(), Math.random() * 0.8 + 0.2],
            Pos: new Array(6)
        };
        for (var q = 0; q < gene.Pos.length; q++)
            gene.Pos[q] = Math.random();
    }

    return dna;
}

var loadDna = function (onComplete: (dna: Dna) => void) {
    if (debug) {
        window.setTimeout(function () {
            var dna = localStorage.getItem(tempName);
            if (!dna)
                onComplete(createDna(0, imageBaseUrl + '/' + 'cy0miacv.hrd.jpg'));
            else
                onComplete(JSON.parse(dna));
        });
        return;
    };

    var xhr = new XMLHttpRequest();
    xhr.open('GET', baseUrl + '/api/dna/random', true);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.onload = function (e) {
        if (this.status == 200)
            onComplete(<Dna>JSON.parse(this.response));
        else
            console.error('Server could not return a DNA');
    };
    xhr.onerror = function (e) {
        console.error('Could not reach server to get DNA');
    };
    xhr.send();
}

var loadTexture = function (dna: Dna, onComplete: (image: ImageData) => void) {
    var image = new Image();
    image.crossOrigin = '';
    image.onload = function () {
        var canvas = document.createElement('canvas');
        canvas.width = globalWidth;
        canvas.height = globalHeight;
        var ctx = <CanvasRenderingContext2D>canvas.getContext('2d', { alpha: false });
        ctx.fillStyle = 'white';
        ctx.drawImage(image, 0, 0, globalWidth, globalHeight);
        var data = ctx.getImageData(0, 0, globalWidth, globalHeight);
        document.body.appendChild(canvas);
        canvas.style.width = '200px';
        canvas.style.height = '200px';
        //canvas.style.imageRendering = 'pixelated';
        onComplete(data);
    };
    image.onerror = function (e) {
        console.error('Could not load image', e);
    };
    image.src = imageBaseUrl + '/' + dna.Organism.ImagePath;
}

loadDna(function (dna) {
    loadTexture(dna, function (image) {
        loadedAll(dna, image);
    });
})


var renderCanvas = function (buffer, width: number, height: number) {
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    document.body.appendChild(canvas);
    var ctx = <CanvasRenderingContext2D>canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    var data = ctx.createImageData(width, height);

    for (var i = 0; i < data.data.length; i++)
        data.data[i] = buffer[i];

    ctx.putImageData(data, 0, 0);
}

var loadedAll = function (dna, image) {
    var rasterizer = new JsRasterizer(image, dna);
}