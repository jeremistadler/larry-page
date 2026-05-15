/* tslint:disable */
/* eslint-disable */

export class Rasterizer {
    free(): void;
    [Symbol.dispose](): void;
    genes_capacity(): number;
    /**
     * Pointer to the internal genes buffer (host writes via a Float32Array
     * view to skip wasm-bindgen marshaling on every call).
     */
    genes_ptr(): number;
    get_fitness(genes: Float32Array): number;
    /**
     * Compute fitness over the first `gene_count` genes already written
     * to the internal buffer via `genes_ptr`.
     */
    get_fitness_internal(gene_count: number): number;
    constructor(width: number, height: number, src: Uint8Array);
}

export function wasm_memory(): any;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_rasterizer_free: (a: number, b: number) => void;
    readonly rasterizer_genes_capacity: (a: number) => number;
    readonly rasterizer_genes_ptr: (a: number) => number;
    readonly rasterizer_get_fitness: (a: number, b: number, c: number) => number;
    readonly rasterizer_get_fitness_internal: (a: number, b: number) => number;
    readonly rasterizer_new: (a: number, b: number, c: number, d: number) => number;
    readonly wasm_memory: () => any;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
