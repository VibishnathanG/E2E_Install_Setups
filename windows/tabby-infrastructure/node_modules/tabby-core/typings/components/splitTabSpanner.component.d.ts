import { ElementRef, EventEmitter } from '@angular/core';
import { SelfPositioningComponent } from './selfPositioning.component';
import { SplitContainer } from './splitTab.component';
/** @hidden */
export declare class SplitTabSpannerComponent extends SelfPositioningComponent {
    container: SplitContainer;
    index: number;
    resizing: EventEmitter<boolean>;
    change: EventEmitter<void>;
    isActive: boolean;
    isHorizontal: boolean;
    isVertical: boolean;
    private marginOffset;
    constructor(element: ElementRef);
    ngAfterViewInit(): void;
    ngOnChanges(): void;
    reset(): void;
}
