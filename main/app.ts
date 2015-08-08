///<reference path="../references.ts" />




Utils.getRandomDna(baseUrl, function (dna) {
    Utils.loadAndScaleImageData(imageBaseUrl + '/' + dna.Organism.ImagePath, globalWidth, globalHeight, function (image, canvas) {
        document.body.appendChild(canvas);
        canvas.style.width = '200px';
        canvas.style.height = '200px';
        (<any>canvas).style.imageRendering = 'pixelated';

        var rasterizer = new JsRasterizer(image, dna);
    });
})