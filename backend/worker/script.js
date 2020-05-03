/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/index.ts");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/generateChronologicalId.ts":
/*!****************************************!*\
  !*** ./src/generateChronologicalId.ts ***!
  \****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

// Taken from here: https://gist.github.com/mikelehen/3596a30bd69384624c11
Object.defineProperty(exports, "__esModule", { value: true });
// Modeled after base64 web-safe chars, but ordered by ASCII.
const PUSH_CHARS = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
// Timestamp of last push, used to prevent local collisions if you push twice in one ms.
let lastPushTime = 0;
// We generate 72-bits of randomness which get turned into 12 characters and appended to the
// timestamp to prevent collisions with other clients.  We store the last characters we
// generated because in the event of a collision, we'll use those same characters except
// "incremented" by one.
const lastRandChars = [];
function generateChronologicalId() {
    let now = Date.now();
    const duplicateTime = now === lastPushTime;
    let i = 0;
    lastPushTime = now;
    const timeStampChars = new Array(8);
    for (i = 7; i >= 0; i--) {
        timeStampChars[i] = PUSH_CHARS.charAt(now % 64);
        // NOTE: Can't use << here because javascript will convert to int and lose the upper bits.
        now = Math.floor(now / 64);
    }
    if (now !== 0)
        throw new Error('We should have converted the entire timestamp.');
    let id = timeStampChars.join('');
    if (!duplicateTime) {
        for (i = 0; i < 12; i++) {
            lastRandChars[i] = Math.floor(Math.random() * 64);
        }
    }
    else {
        // If the timestamp hasn't changed since last push, use the same random number, except incremented by 1.
        for (i = 11; i >= 0 && lastRandChars[i] === 63; i--) {
            lastRandChars[i] = 0;
        }
        lastRandChars[i]++;
    }
    for (i = 0; i < 12; i++) {
        id += PUSH_CHARS.charAt(lastRandChars[i]);
    }
    if (id.length != 20)
        throw new Error('Length should be 20.');
    return id;
}
exports.generateChronologicalId = generateChronologicalId;


/***/ }),

/***/ "./src/index.ts":
/*!**********************!*\
  !*** ./src/index.ts ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const generateChronologicalId_1 = __webpack_require__(/*! ./generateChronologicalId */ "./src/generateChronologicalId.ts");
const utils_1 = __webpack_require__(/*! ../utils */ "./utils.ts");
addEventListener('fetch', (event) => {
    const params = {};
    const url = new URL(event.request.url);
    console.log(url);
    const queryString = url.search.slice(1).split('&');
    queryString.forEach(item => {
        const kv = item.split('=');
        if (kv[0])
            params[kv[0]] = kv[1];
    });
    event.respondWith(handleRequest(event, params));
});
async function handleRequest(event, query) {
    const { request } = event;
    if (query.route === 'upload') {
        let buf = await event.request.arrayBuffer();
        const id = generateChronologicalId_1.generateChronologicalId();
        await KV.put('dna:' + id + ':image', buf);
        const dna = utils_1.Utils.createDna(10, '', id);
        return new Response('Hello worker!', {
            headers: { 'content-type': 'text/plain' },
        });
    }
    return new Response('Hello worker!', {
        headers: { 'content-type': 'text/plain' },
    });
}


/***/ }),

/***/ "./utils.ts":
/*!******************!*\
  !*** ./utils.ts ***!
  \******************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
class Utils {
    static randomIndex(arr) {
        return Math.floor(Math.random() * arr.length);
    }
    /**
     * @min inclusive
     * @max exclusive
     */
    static randomFloat(min, max) {
        return Math.random() * (max - min) + min;
    }
    /**
     * @min inclusive
     * @max inclusive
     */
    static randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    static CreateNumberArray(length) {
        var arr = new Array(length);
        for (var i = 0; i < length; i++)
            arr[i] = 0;
        return arr;
    }
    static ClampFloat(num) {
        return Math.min(1, Math.max(num, 0));
    }
    static ClampByte(num) {
        return Math.min(255, Math.max(num, 0));
    }
    static Clamp(num, min, max) {
        return Math.min(Math.max(num, min), max);
    }
    static createDna(numberOfGenes, image, organismId) {
        var dna = {
            Fitness: Infinity,
            Genes: new Array(numberOfGenes),
            Generation: 0,
            Mutation: 0,
            Organism: {
                Id: organismId,
                ImagePath: image,
                GeneCount: numberOfGenes,
                Width: 200,
                Height: 200,
            },
        };
        for (var i = 0; i < numberOfGenes; i++) {
            var gene = (dna.Genes[i] = {
                Color: [
                    Math.random(),
                    Math.random(),
                    Math.random(),
                    Math.random() * 0.8 + 0.2,
                ],
                Pos: new Array(6),
            });
            for (var q = 0; q < gene.Pos.length; q++)
                gene.Pos[q] = Math.random();
        }
        return dna;
    }
}
exports.Utils = Utils;


/***/ })

/******/ });