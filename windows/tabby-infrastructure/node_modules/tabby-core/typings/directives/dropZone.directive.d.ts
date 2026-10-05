import { ElementRef, EventEmitter, AfterViewInit } from '@angular/core';
import { DirectoryUpload, PlatformService } from '../api/platform';
import './dropZone.directive.scss';
/** @hidden */
export declare class DropZoneDirective implements AfterViewInit {
    private el;
    private platform;
    transfer: EventEmitter<DirectoryUpload>;
    private dropHint?;
    constructor(el: ElementRef, platform: PlatformService);
    ngAfterViewInit(): void;
    private removeHint;
}
