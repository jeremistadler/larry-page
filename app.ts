///<reference path="references.ts" />


class Game {
    sourceImage: Texture;
    vectorizer: Vectorizer;

    constructor(public webgl: WebGLRenderingContext) {
        this.vectorizer = new Vectorizer(webgl);
    }

    init() {
        return Game.LoadTexture(this.webgl, 'nature-photography-8.jpg', false, 256);
    }

    onResize() {

    }

    static createUV(texture: Texture, w: number, h: number) {
        if (!texture.tile)
            return [0, 0, 1, 0, 1, 1, 0, 1];

        var tw = texture.image.naturalWidth || texture.image.width;
        var th = texture.image.naturalHeight || texture.image.height;

        var u = w / (tw / texture.density);
        var v = h / (th / texture.density);

        return [0, 0, u, 0, u, v, 0, v];
    }


    run() {
        return Utils.StartTick(dt => {
            this.vectorizer.draw();
        });
    }

    static LoadTexture(context: WebGLRenderingContext, url: string, tile?: boolean, density?: number) {
        var def = $.Deferred<Texture>();
        var image = new Image();
        image.onload = () => {
            var width = image.naturalWidth || image.width;
            var height = image.naturalHeight || image.height;

            if (typeof tile === "undefined")
                tile = width == height && ((width & (width - 1)) == 0);

            def.resolve(Texture.FromImage(context, image, tile, density));
        };
        image.onerror = def.reject;
        image.src = url;
        return def;
    }

}

// -- Page --

function matchWindowSize(canvas: HTMLCanvasElement, sizeChanged?: () => any) {
    window.addEventListener('resize', resizeCanvas, false);

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        if (typeof sizeChanged !== "undefined")
            sizeChanged();
    }
    resizeCanvas();
}

$(document).ready(function () {
    var canvas = <HTMLCanvasElement>document.getElementById("canvas-element-id");
    var webgl = canvas.getContext("webgl");
    var game = new Game(webgl);

    matchWindowSize(canvas, () => { game.onResize() });

    game.init()
        .then(() => game.run())
        .fail(e => alert("Error: " + e.message));
});

