///<reference path="references.ts" />

var globalWidth = 256;
var globalHeight = 256;
var baseUrl = '';
var debug = true;

if (debug) {
    baseUrl = 'http://larry.jeremi.se';
}

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
            var dna = localStorage.getItem('dna18');
            if (!dna)
                onComplete(createDna(3, 'bubbles.jpg'));
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
        //document.body.appendChild(canvas);
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
    //var rasterizer = new JsRasterizer(image, dna);

    var buffer = new Uint8Array(10 * 10 * 4);
    for (var i = 0; i < buffer.length; i++)
        buffer[i] = 255;

    //Raster.drawPolygon(buffer, 10, [-100, -100,  -10, 20,  20, 20], [255, 0, 0, 0.3]);
    Raster.drawPolygon(buffer, 10, [0, 0, 5, 5, 0, 10], [255, 0, 0, 0.3]);
    //Raster.drawPolygon(buffer, 10, [5, -10, -10, 20, 20, 20], [0, 255, 0, 0.3]);
    //Raster.drawPolygon(buffer, 10, [-1, 1, 1, 9, 9, 9], [0, 128, 0, 0.1]);
    //Raster.drawPolygon(buffer, 10, [10, 0,  10, 10,  0, 10], [0, 100, 0, 1]);

    var canvas = document.createElement('canvas');
    canvas.width = 10;
    canvas.height = 10;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 10, 10);
    var data = ctx.createImageData(10, 10);

    for (var i = 0; i < data.data.length; i++) {
        data.data[i] = buffer[i];
    }

    ctx.putImageData(data, 0, 0);
    document.body.appendChild(canvas);
    canvas.style.width = '200px';
    canvas.style.height = '200px';
    canvas.style.imageRendering = 'pixelated';



    var canvas = document.createElement('canvas');
    canvas.width = 10;
    canvas.height = 10;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 10, 10);
    document.body.appendChild(canvas);
    canvas.style.width = '200px';
    canvas.style.height = '200px';
    canvas.style.imageRendering = 'pixelated';

    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(5, 5);
    ctx.lineTo(0, 10);
    ctx.closePath();
    ctx.fill();

    //ctx.fillStyle = 'rgba(0, 100, 0, 0.3)';
    //ctx.beginPath();
    //ctx.moveTo(1, 1);
    //ctx.lineTo(10, 5);
    //ctx.lineTo(3, 6);
    //ctx.closePath();
    //ctx.fill();
}