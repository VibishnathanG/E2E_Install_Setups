import { ViewContainerRef, OnChanges } from '@angular/core';
import { BaseTabComponent } from '../components/baseTab.component';
/** @hidden */
export declare class TabBodyComponent implements OnChanges {
    active: boolean;
    tab: BaseTabComponent;
    placeholder?: ViewContainerRef;
    ngOnChanges(changes: any): void;
    detach(): void;
    ngOnDestroy(): void;
}
