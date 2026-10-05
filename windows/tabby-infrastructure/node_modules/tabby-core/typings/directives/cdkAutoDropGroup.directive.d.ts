import { OnInit } from '@angular/core';
import { CdkDropList } from '@angular/cdk/drag-drop';
declare class FakeDropGroup {
    _items: Set<CdkDropList>;
}
/** @hidden */
export declare class CdkAutoDropGroup implements OnInit {
    private cdkDropList;
    static groups: Record<string, FakeDropGroup>;
    groupName: string;
    constructor(cdkDropList: CdkDropList);
    ngOnInit(): void;
}
export {};
