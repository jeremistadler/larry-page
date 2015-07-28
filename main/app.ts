///<reference path="../references.ts" />

var createDna = function(numberOfGenes: number, image: string) {
    var dna = new Dna();
    dna.Fitness = Infinity;
    dna.Genes = new Array(numberOfGenes);
    dna.Generation = 0;
    dna.Mutation = 0;
    dna.Organism = new Organism();
    dna.Organism.ImagePath = image;
    dna.Organism.GeneCount = numberOfGenes;

    for (var i = 0; i < numberOfGenes; i++) {
        var gene = dna.Genes[i] = new Gene();
        gene.Color = [Math.random(), Math.random(), Math.random(), Math.random() * 0.8 + 0.2];
        gene.Pos = new Array(6);
        for (var q = 0; q < gene.Pos.length; q++)
            gene.Pos[q] = Math.random();
    }

    return dna;
}

var loadDna = function (onComplete: (dna: Dna) => void) {
    if (debug) {
        window.setTimeout(function () {
            var dna = localStorage.getItem('dna181');
            if (!dna)
                onComplete(createDna(10, 'wolf.jpg'));
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
            alert('Server could not return a DNA');
    };
    xhr.onerror = function (e) {
        alert('Could not reach server to get DNA');
    };
    xhr.send();
}

var loadTexture = function (dna: Dna, onComplete: (image: ImageData) => void) {
    var image = new Image();
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
        canvas.style.imageRendering = 'pixelated';
        onComplete(data);
    };
    image.onerror = function () {
        alert('Could not load image');
    };
    image.src = '/images/' + dna.Organism.ImagePath;
}

loadDna(function (dna) {
    loadTexture(dna, function (image) {
        loadedAll(dna, image);
    });
})


var loadedAll = function (dna, image) {
    var rasterizer = new JsRasterizer(image, dna);
}