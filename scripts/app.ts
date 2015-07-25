///<reference path="references.ts" />

var globalWidth = 128;
var globalHeight = 128;
var baseUrl = '';
var debug = true;

if (debug) {
    baseUrl = 'http://larry.jeremi.se';
}

var loadDna = function (onComplete: (dna: Dna) => void) {
    if (debug) {
        window.setTimeout(function () {
            onComplete(DnaEvolver.CreateDna(30, 'blocks.jpg'));
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
    var canvas = <HTMLCanvasElement>document.createElement('canvas');
    canvas.width = globalWidth;
    canvas.height = globalHeight;
    document.body.appendChild(canvas);
    var webgl = <WebGLRenderingContext>canvas.getContext('webgl', { alpha: false, preserveDrawingBuffer: true, premultipliedAlpha: false });
    var game = new WebGLRasterizer(webgl, image, dna);

    Utils.StartTick(dt => {
        game.draw();
    });
}
