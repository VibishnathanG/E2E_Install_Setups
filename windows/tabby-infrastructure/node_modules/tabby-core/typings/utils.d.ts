import { NgZone } from '@angular/core';
export declare const WIN_BUILD_CONPTY_SUPPORTED = 17692;
export declare const WIN_BUILD_CONPTY_STABLE = 18309;
export declare const WIN_BUILD_WSL_EXE_DISTRO_FLAG = 17763;
export declare const WIN_BUILD_FLUENT_BG_SUPPORTED = 17063;
export declare function getWindows10Build(): number | undefined;
export declare function isWindowsBuild(build: number): boolean;
export declare function getCSSFontFamily(config: any): string;
export declare function wrapPromise<T>(zone: NgZone, promise: Promise<T>): Promise<T>;
export declare class ResettableTimeout {
    private fn;
    private timeout;
    private id;
    constructor(fn: () => void, timeout: number);
    set(timeout?: number): void;
    clear(): void;
}
export declare const TAB_COLORS: ({
    name: "No color";
    value: null;
} | {
    name: "Blue";
    value: string;
} | {
    name: "Green";
    value: string;
} | {
    name: "Orange";
    value: string;
} | {
    name: "Purple";
    value: string;
} | {
    name: "Red";
    value: string;
} | {
    name: "Yellow";
    value: string;
})[];
export declare function serializeFunction<T extends () => Promise<any>>(fn: T): T;
