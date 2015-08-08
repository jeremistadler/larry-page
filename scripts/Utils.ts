"use strict";

class Utils {
    static StartTick(tickMethod: (dt: number) => void) {
        var oldTime = 0;
        var tickLoop = (time) => {
            var deltaTime = time - oldTime;
            oldTime = time;

            tickMethod(deltaTime / 1000);
            window.requestAnimationFrame(tickLoop);
        };
        tickLoop(0);
    }

    static randomIndex(arr: any[]) {
        return Math.floor(Math.random() * arr.length);
    }

    static randomFromTo(from, to){
        return Math.floor(Math.random() * (to - from + 1) + from);
    }

    static CreateNumberArray(length: number) {
        var arr = new Array(length);
        for (var i = 0; i < length; i++)
            arr[i] = 0;
        return arr;
    }

    static ClampFloat(num: number) {
        return Math.min(1, Math.max(num, 0));
    }

    static ClampByte(num: number) {
        return Math.min(255, Math.max(num, 0));
    }

    static Clamp(num: number, min: number, max: number) {
        return Math.min(Math.max(num, min), max);
    }

    static createDna(numberOfGenes: number, image: string): Dna {
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

    static loadDebugDna(onComplete: (dna: Dna) => void) {
        window.setTimeout(function () {
            var dna = localStorage.getItem(tempName);
            if (!dna)
                onComplete(Utils.createDna(0, imageBaseUrl + '/' + 'cy0miacv.hrd.jpg'));
            else
                onComplete(JSON.parse(dna));
        });
    }

    static getRandomDna(baseUrl: string, onComplete: (dna: Dna) => void) {
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

    static loadAndScaleImageData(url: string, width: number, height: number, onComplete: (image: ImageData, canvas: HTMLCanvasElement) => void) {
        var image = new Image();
        image.crossOrigin = '';
        image.onload = function () {
            var canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            var ctx = <CanvasRenderingContext2D>canvas.getContext('2d', { alpha: false });
            ctx.fillStyle = 'white';
            ctx.drawImage(image, 0, 0, width, height);
            var data = ctx.getImageData(0, 0, width, height);
            onComplete(data, canvas);
        };
        image.onerror = e => console.error('Could not load image', e);
        image.src = url;
    }
}


interface DebugMessage {
    name: string;
    value: number;
    unit: string;
    oldValue: number;
    oldUnit: string;
}

class DebugView {
    static Messages: DebugMessage[] = [];
    static elm: HTMLElement;
    
    static SetMessage(name: string, value: number, unit: string) {
        var old = this.Messages[name];

        this.Messages[name] = {
            name: name,
            value: value,
            unit: unit,
            oldValue: old ? old.value : 0,
            oldUnit: old ? old.unit : '',
        };
    }

    static RenderToDom() {
        if (this.elm == null) {
            this.elm = document.createElement('div');
            this.elm.style.display = 'inline-block';
            document.body.appendChild(this.elm);
        }

        var html = '<table style="font-size: 11px;color: #333;font-family:\'Segoe UI\'"><tr><td>Name</td><td>Value</td><td>Old Value</td><td>Diff</td></tr>';
        
        for (var name in this.Messages) {
            var f = this.Messages[name];
            html +=
                '<tr><td>' + f.name +
                '</td><td>' + Math.round(f.value * 100) / 100 + ' ' + f.unit +
                '</td><td>' + Math.round(f.oldValue * 100) / 100 + ' ' + f.oldUnit +
                '</td><td>' + Math.round((f.value - f.oldValue) * 100) / 100 + ' ' + f.unit + '</td></tr>';
        }

        this.elm.innerHTML = html + '</table>';
    }
}
