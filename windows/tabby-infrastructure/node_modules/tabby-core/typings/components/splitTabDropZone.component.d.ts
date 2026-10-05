import { ElementRef, EventEmitter } from '@angular/core';
import { AppService } from '../services/app.service';
import { BaseTabComponent } from './baseTab.component';
import { SelfPositioningComponent } from './selfPositioning.component';
import { SplitDropZoneInfo, SplitTabComponent } from './splitTab.component';
/** @hidden */
export declare class SplitTabDropZoneComponent extends SelfPositioningComponent {
    dropZone: SplitDropZoneInfo;
    parent: SplitTabComponent;
    tabDropped: EventEmitter<BaseTabComponent>;
    isActive: boolean;
    isHighlighted: boolean;
    constructor(element: ElementRef, app: AppService);
    canActivateFor(tab: BaseTabComponent): boolean;
    ngOnChanges(): void;
    layout(): void;
}
