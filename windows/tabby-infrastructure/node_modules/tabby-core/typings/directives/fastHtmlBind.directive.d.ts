import { ElementRef, OnChanges } from '@angular/core';
import { PlatformService } from '../api/platform';
/** @hidden */
export declare class FastHtmlBindDirective implements OnChanges {
    private el;
    private platform;
    fastHtmlBind?: string;
    constructor(el: ElementRef, platform: PlatformService);
    ngOnChanges(): void;
}
