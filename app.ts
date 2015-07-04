///<reference path="references.ts" />


class Game {
    sourceImage: Texture;
    vectorizer: Vectorizer;

    constructor(public webgl: WebGLRenderingContext) {
    }

    init() {
        var game = this;

        return Game.LoadTexture(this.webgl, 'cube.jpg', false).then(function (tex) {
            game.vectorizer = new Vectorizer(game.webgl, tex);
            game.vectorizer.init();
        });
    }

    onResize() {

    }

    run() {
        return Utils.StartTick(dt => {
            this.vectorizer.draw();
        });
    }

    static LoadTexture(context: WebGLRenderingContext, url: string, tile?: boolean, density?: number) : Q.Promise<Texture> {
        var def = Q.defer<Texture>();
        var image = new Image();
        image.onload = () => {
            var width = image.naturalWidth || image.width;
            var height = image.naturalHeight || image.height;

            if (typeof tile === "undefined")
                tile = width == height && ((width & (width - 1)) == 0);

            def.resolve(Texture.FromImage(context, image, tile));
        };
        image.onerror = def.reject;
        image.src = url;
        return def.promise;
    }

}

// -- Page --

var downloadImage = false;

function matchWindowSize(canvas: HTMLCanvasElement, sizeChanged?: () => any) {
    window.addEventListener('resize', resizeCanvas, false);
    window.addEventListener('click', ev => downloadImage = true, false);

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        if (typeof sizeChanged !== "undefined")
            sizeChanged();
    }
    resizeCanvas();
}

var onloaded = function () {
    var canvas = <HTMLCanvasElement>document.getElementById("canvas-element-id");
    var webgl = canvas.getContext("webgl", { alpha: false, preserveDrawingBuffer: true, premultipliedAlpha: false });
    var game = new Game(<WebGLRenderingContext>webgl);
    
    matchWindowSize(canvas, () => { game.onResize() });

    game.init()
        .then(() => game.run())
        .fail(e => console.error(e.message));
};

document.addEventListener('DOMContentLoaded', onloaded, false);
