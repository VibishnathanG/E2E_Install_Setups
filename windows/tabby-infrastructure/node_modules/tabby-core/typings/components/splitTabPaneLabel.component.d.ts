import { ElementRef } from '@angular/core';
import { HotkeysService } from '../services/hotkeys.service';
import { AppService } from '../services/app.service';
import { BaseTabComponent } from './baseTab.component';
import { SelfPositioningComponent } from './selfPositioning.component';
/** @hidden */
export declare class SplitTabPaneLabelComponent extends SelfPositioningComponent {
    private app;
    tab: BaseTabComponent;
    parent: BaseTabComponent;
    isActive: boolean;
    constructor(element: ElementRef, hotkeys: HotkeysService, app: AppService);
    ngOnChanges(): void;
    onTabDragStart(tab: BaseTabComponent): void;
    onTabDragEnd(): void;
    layout(): void;
}
