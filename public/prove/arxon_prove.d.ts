declare namespace wasm_bindgen {
	/* tslint:disable */
	/* eslint-disable */
	/**
	 * Build C1/C2/C3 proving keys (slow the first time).
	 */
	export function warm(): void;
	/**
	 * `POST /v1/keys`
	 */
	export function keys(req_json: string): string;
	/**
	 * `POST /v1/shield`
	 */
	export function shield(req_json: string): string;
	/**
	 * `POST /v1/transfer`
	 */
	export function transfer(req_json: string): string;
	/**
	 * `POST /v1/unshield`
	 */
	export function unshield(req_json: string): string;
	
}

declare type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

declare interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly warm: () => void;
  readonly keys: (a: number, b: number) => [number, number, number, number];
  readonly shield: (a: number, b: number) => [number, number, number, number];
  readonly transfer: (a: number, b: number) => [number, number, number, number];
  readonly unshield: (a: number, b: number) => [number, number, number, number];
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_export_2: WebAssembly.Table;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_start: () => void;
}

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
declare function wasm_bindgen (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
