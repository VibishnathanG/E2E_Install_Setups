import { ElementRef } from '@angular/core';
import { BaseComponent } from './base.component';
export declare abstract class SelfPositioningComponent extends BaseComponent {
    protected element: ElementRef;
    cssLeft: string;
    cssTop: string;
    cssWidth: string | null;
    cssHeight: string | null;
    constructor(element: ElementRef);
    protected setDimensions(x: number, y: number, w: number, h: number, unit?: string): void;
}
