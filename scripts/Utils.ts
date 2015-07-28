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

    static RenderToDom(elm: HTMLElement) {
        var html = '<table style="font-size: 11px;color: #333;font-family:\'Segoe UI\'"><tr><td>Name</td><td>Value</td><td>Old Value</td><td>Diff</td></tr>';
        
        for (var name in this.Messages) {
            var f = this.Messages[name];
            html +=
                '<tr><td>' + f.name +
                '</td><td>' + Math.round(f.value * 100) / 100 + ' ' + f.unit +
                '</td><td>' + Math.round(f.oldValue * 100) / 100 + ' ' + f.oldUnit +
                '</td><td>' + Math.round((f.value - f.oldValue) * 100) / 100 + ' ' + f.unit + '</td></tr>';
        }

        elm.innerHTML = html + '</table>';
    }
}
